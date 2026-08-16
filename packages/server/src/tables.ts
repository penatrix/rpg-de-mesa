/**
 * Gerenciador de mesas.
 *
 * Toda mutação de estado passa por aqui — inclusive as do Mestre IA, que opera
 * exatamente o mesmo conjunto de ações que um Mestre humano. Isso garante que a
 * IA não possa fazer nada que um humano não possa, e vice-versa.
 */

import { randomUUID } from 'node:crypto';

import {
  MAX_PLAYERS,
  applyDamage,
  applyHealing,
  advanceTurn,
  combatResolution,
  combatantFromBestiary,
  combatantFromCharacter,
  createCharacter,
  grantExperience,
  healthVitalId,
  makeSeed,
  performCheck,
  requireSetting,
  roll,
  rollInitiative,
  type Character,
  type DiceRoll,
  type GameMasterKind,
  type LogEntry,
  type LogEntryKind,
  type Participant,
  type Scene,
  type SettingDefinition,
  type TableState,
  type TableView,
} from '@rpg/shared';

import { config } from './config.js';
import { joinCodeExists, loadTable, loadTableByJoinCode, saveTable } from './db.js';

export class TableError extends Error {}

/** Consumidor dos eventos de mesa — implementado pela camada de socket. */
export interface TableEmitter {
  state(tableId: string): void;
  log(tableId: string, entry: LogEntry): void;
  scene(tableId: string, scene: Scene): void;
  roll(tableId: string, diceRoll: DiceRoll): void;
}

const tables = new Map<string, TableState>();
let emitter: TableEmitter | undefined;
let rollNonce = 0;

export function setEmitter(next: TableEmitter): void {
  emitter = next;
}

// ---------------------------------------------------------------------------
// Acesso
// ---------------------------------------------------------------------------

export function getTable(tableId: string): TableState {
  const cached = tables.get(tableId);
  if (cached) return cached;

  const persisted = loadTable(tableId);
  if (!persisted) throw new TableError('Mesa não encontrada.');

  tables.set(persisted.id, persisted);
  return persisted;
}

export function findTableByJoinCode(joinCode: string): TableState | undefined {
  const code = joinCode.trim().toUpperCase();
  for (const table of tables.values()) {
    if (table.joinCode === code) return table;
  }
  const persisted = loadTableByJoinCode(code);
  if (persisted) tables.set(persisted.id, persisted);
  return persisted;
}

export function settingOf(table: TableState): SettingDefinition {
  return requireSetting(table.config.settingId);
}

function touch(table: TableState): void {
  table.updatedAt = Date.now();
  if (table.log.length > config.logWindow) {
    table.log = table.log.slice(-config.logWindow);
  }
  saveTable(table);
  emitter?.state(table.id);
}

/**
 * Projeção filtrada por permissão: jogadores não recebem entradas `gmOnly`
 * nem rolagens secretas. A filtragem acontece no servidor — nunca confie no
 * cliente para esconder informação do Mestre.
 */
export function viewFor(table: TableState, playerId: string): TableView {
  const participant = table.participants.find((p) => p.id === playerId);
  const isGm = participant?.role === 'gm';

  return {
    ...table,
    log: isGm ? table.log : table.log.filter((entry) => !entry.gmOnly),
    viewerRole: participant?.role ?? 'player',
    viewerId: playerId,
  };
}

export function isGameMaster(table: TableState, playerId: string): boolean {
  const participant = table.participants.find((p) => p.id === playerId);
  return participant?.role === 'gm';
}

// ---------------------------------------------------------------------------
// Criação e entrada
// ---------------------------------------------------------------------------

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I/O/0/1

function generateJoinCode(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!joinCodeExists(code) && ![...tables.values()].some((t) => t.joinCode === code)) {
      return code;
    }
  }
  // Extremamente improvável; melhor um código feio do que uma colisão.
  return randomUUID().slice(0, 8).toUpperCase();
}

export interface CreateTableInput {
  settingId: string;
  tableName: string;
  playerName: string;
  gmKind: GameMasterKind;
  allowNpcCompanions: boolean;
  musicEnabled: boolean;
}

export function createTable(input: CreateTableInput): { table: TableState; playerId: string } {
  const setting = requireSetting(input.settingId);
  const tableId = randomUUID();
  const playerId = randomUUID();
  const now = Date.now();

  // Quem cria a mesa é o Mestre quando o Mestre é humano; caso contrário, joga.
  const creatorRole = input.gmKind === 'human' ? 'gm' : 'player';

  const opening =
    setting.gameMaster.openings[Math.floor(Math.random() * setting.gameMaster.openings.length)];
  const location = opening?.locationId
    ? setting.locations.find((l) => l.id === opening.locationId)
    : undefined;

  const table: TableState = {
    id: tableId,
    joinCode: generateJoinCode(),
    config: {
      settingId: setting.id,
      name: input.tableName.trim().slice(0, 80) || `Mesa de ${setting.name}`,
      gmKind: input.gmKind,
      gmPlayerId: creatorRole === 'gm' ? playerId : undefined,
      maxPlayers: MAX_PLAYERS,
      allowNpcCompanions: input.allowNpcCompanions,
      musicEnabled: input.musicEnabled,
    },
    participants: [
      {
        id: playerId,
        name: input.playerName.trim().slice(0, 40) || 'Anônimo',
        role: creatorRole,
        seat: 'human',
        connected: true,
        lastSeen: now,
      },
    ],
    characters: [],
    scene: {
      locationId: opening?.locationId,
      title: opening?.title ?? 'O começo',
      description: opening?.text ?? 'A aventura ainda não começou.',
      trackId: location?.trackId ?? setting.tracks[0]?.id,
      combatants: [],
      inCombat: false,
      turnOrder: [],
    },
    log: [],
    createdAt: now,
    updatedAt: now,
    chronicle: '',
  };

  tables.set(tableId, table);

  appendLog(table, {
    kind: 'system',
    authorId: 'system',
    authorName: 'Sistema',
    text:
      `Mesa "${table.config.name}" criada em ${setting.name}. ` +
      `Código de entrada: ${table.joinCode}. ` +
      `Mestre: ${input.gmKind === 'ai' ? 'IA' : 'jogador humano'}.`,
    gmOnly: false,
  });

  if (opening) {
    appendLog(table, {
      kind: 'narration',
      authorId: 'gm',
      authorName: 'Mestre',
      text: opening.text,
      gmOnly: false,
    });
  }

  touch(table);
  return { table, playerId };
}

export function joinTable(
  joinCode: string,
  playerName: string,
  existingPlayerId?: string,
): { table: TableState; playerId: string } {
  const table = findTableByJoinCode(joinCode);
  if (!table) throw new TableError('Código de mesa inválido.');

  // Reconexão: mantém assento, papel e personagem.
  if (existingPlayerId) {
    const existing = table.participants.find((p) => p.id === existingPlayerId);
    if (existing) {
      existing.connected = true;
      existing.lastSeen = Date.now();
      existing.name = playerName.trim().slice(0, 40) || existing.name;
      touch(table);
      return { table, playerId: existing.id };
    }
  }

  const humanPlayers = table.participants.filter((p) => p.role === 'player' && p.seat === 'human');
  if (humanPlayers.length >= table.config.maxPlayers) {
    throw new TableError(`Mesa cheia (limite de ${table.config.maxPlayers} jogadores).`);
  }

  const playerId = randomUUID();
  const participant: Participant = {
    id: playerId,
    name: playerName.trim().slice(0, 40) || 'Anônimo',
    role: 'player',
    seat: 'human',
    connected: true,
    lastSeen: Date.now(),
  };
  table.participants.push(participant);

  appendLog(table, {
    kind: 'system',
    authorId: 'system',
    authorName: 'Sistema',
    text: `${participant.name} entrou na mesa.`,
    gmOnly: false,
  });

  touch(table);
  return { table, playerId };
}

export function markDisconnected(tableId: string, playerId: string): void {
  const table = tables.get(tableId);
  if (!table) return;
  const participant = table.participants.find((p) => p.id === playerId);
  if (!participant) return;

  participant.connected = false;
  participant.lastSeen = Date.now();
  saveTable(table);
  emitter?.state(table.id);
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

export interface AppendLogInput {
  kind: LogEntryKind;
  authorId: string;
  authorName: string;
  text: string;
  gmOnly: boolean;
  roll?: DiceRoll;
  streaming?: boolean;
  id?: string;
}

export function appendLog(table: TableState, input: AppendLogInput): LogEntry {
  const entry: LogEntry = {
    id: input.id ?? randomUUID(),
    kind: input.kind,
    authorId: input.authorId,
    authorName: input.authorName,
    text: input.text,
    roll: input.roll,
    at: Date.now(),
    gmOnly: input.gmOnly,
    streaming: input.streaming,
  };
  table.log.push(entry);
  emitter?.log(table.id, entry);
  return entry;
}

/** Atualiza o texto de uma entrada em streaming, sem reemitir a entrada inteira. */
export function finalizeLogEntry(table: TableState, entryId: string, text: string): void {
  const entry = table.log.find((e) => e.id === entryId);
  if (!entry) return;
  entry.text = text;
  entry.streaming = false;
  touch(table);
}

// ---------------------------------------------------------------------------
// Personagens
// ---------------------------------------------------------------------------

export function createCharacterForPlayer(
  table: TableState,
  playerId: string,
  input: { name: string; classId: string; originId?: string; allocations?: Record<string, number> },
): Character {
  const setting = settingOf(table);
  const participant = table.participants.find((p) => p.id === playerId);
  if (!participant) throw new TableError('Participante não encontrado nesta mesa.');
  if (participant.role === 'gm') throw new TableError('O Mestre não controla um personagem.');

  const character = createCharacter(setting, {
    id: randomUUID(),
    name: input.name.trim().slice(0, 40) || 'Sem nome',
    classId: input.classId,
    originId: input.originId,
    allocations: input.allocations,
  });

  // Um personagem por jogador: recriar substitui o anterior.
  table.characters = table.characters.filter((c) => c.id !== participant.characterId);
  table.characters.push(character);
  participant.characterId = character.id;

  const vocation = setting.characterModel.classes.find((c) => c.id === character.classId);
  appendLog(table, {
    kind: 'system',
    authorId: 'system',
    authorName: 'Sistema',
    text: `${participant.name} traz ${character.name}, ${vocation?.name ?? character.classId} de nível 1.`,
    gmOnly: false,
  });

  // Personagem novo entra em cena se já houver combate ou grupo montado.
  syncPartyIntoScene(table);
  touch(table);
  return character;
}

export function updateCharacter(
  table: TableState,
  playerId: string,
  updated: Character,
): Character {
  const participant = table.participants.find((p) => p.id === playerId);
  const isGm = participant?.role === 'gm';
  if (!isGm && participant?.characterId !== updated.id) {
    throw new TableError('Você só pode alterar o seu próprio personagem.');
  }

  const index = table.characters.findIndex((c) => c.id === updated.id);
  if (index === -1) throw new TableError('Personagem não encontrado.');

  const current = table.characters[index]!;
  // Campos que o cliente pode editar livremente. Nível, XP e vitais só mudam
  // por ação do Mestre — senão bastaria um cliente adulterado para trapacear.
  table.characters[index] = {
    ...current,
    name: updated.name.trim().slice(0, 40) || current.name,
    notes: updated.notes.slice(0, 4000),
    inventory: updated.inventory,
    conditions: isGm ? updated.conditions : current.conditions,
    level: isGm ? updated.level : current.level,
    experience: isGm ? updated.experience : current.experience,
    vitals: isGm ? updated.vitals : current.vitals,
    attributes: isGm ? updated.attributes : current.attributes,
    abilities: isGm ? updated.abilities : current.abilities,
  };

  syncPartyIntoScene(table);
  touch(table);
  return table.characters[index]!;
}

/** Mantém os PCs presentes na cena em sincronia com a lista de personagens. */
function syncPartyIntoScene(table: TableState): void {
  if (!table.scene.inCombat) return;
  for (const character of table.characters) {
    const existing = table.scene.combatants.find((c) => c.characterId === character.id);
    if (!existing) table.scene.combatants.push(combatantFromCharacter(character));
  }
}

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------

export function rollForTable(
  table: TableState,
  playerId: string,
  notation: string,
  label?: string,
  secret = false,
): DiceRoll {
  const participant = table.participants.find((p) => p.id === playerId);
  const isGm = participant?.role === 'gm';
  // Só o Mestre rola em segredo.
  const isSecret = secret && isGm;

  const diceRoll = roll({
    notation,
    seed: makeSeed(table.id, rollNonce++),
    rolledBy: playerId,
    label,
    secret: isSecret,
  });

  appendLog(table, {
    kind: 'roll',
    authorId: playerId,
    authorName: participant?.name ?? 'Desconhecido',
    text: `${label ? `${label}: ` : ''}${notation} → ${diceRoll.total}`,
    roll: diceRoll,
    gmOnly: isSecret,
  });

  if (!isSecret) emitter?.roll(table.id, diceRoll);
  touch(table);
  return diceRoll;
}

export function checkForTable(
  table: TableState,
  playerId: string,
  input: {
    characterId: string;
    attributeId: string;
    difficulty: number;
    label?: string;
    bonus?: number;
    advantage?: 'none' | 'advantage' | 'disadvantage';
    secret?: boolean;
  },
): DiceRoll {
  const setting = settingOf(table);
  const character = table.characters.find((c) => c.id === input.characterId);
  if (!character) throw new TableError('Personagem não encontrado.');

  const participant = table.participants.find((p) => p.id === playerId);
  const isGm = participant?.role === 'gm';
  if (!isGm && participant?.characterId !== character.id) {
    throw new TableError('Você só pode testar o seu próprio personagem.');
  }

  const attribute = setting.characterModel.attributes.find((a) => a.id === input.attributeId);
  if (!attribute) throw new TableError(`Atributo desconhecido: ${input.attributeId}`);

  const result = performCheck({
    setting,
    character,
    attributeId: input.attributeId,
    difficulty: input.difficulty,
    seed: makeSeed(table.id, rollNonce++),
    rolledBy: playerId,
    label: input.label ?? `${attribute.name} (${character.name})`,
    bonus: input.bonus,
    advantage: input.advantage,
    secret: input.secret && isGm,
  });

  const degreeLabel = setting.rules.degreeLabels[result.outcome.degree];
  appendLog(table, {
    kind: 'roll',
    authorId: playerId,
    authorName: participant?.name ?? 'Desconhecido',
    text:
      `${character.name} — ${attribute.name} vs ${input.difficulty}: ` +
      `${result.roll.total} (${degreeLabel})`,
    roll: result.roll,
    gmOnly: result.roll.secret,
  });

  if (!result.roll.secret) emitter?.roll(table.id, result.roll);
  touch(table);
  return result.roll;
}

/**
 * Rolagem feita pelo próprio Mestre (humano via painel, ou IA via ferramenta).
 *
 * Separada de `rollForTable` porque não há participante a validar: quem chega
 * aqui já passou pela checagem de permissão na camada de socket.
 */
export function gmRoll(
  table: TableState,
  notation: string,
  label?: string,
  secret = false,
): DiceRoll {
  const diceRoll = roll({
    notation,
    seed: makeSeed(table.id, rollNonce++),
    rolledBy: 'gm',
    label,
    secret,
  });

  appendLog(table, {
    kind: 'roll',
    authorId: 'gm',
    authorName: 'Mestre',
    text: `${label ? `${label}: ` : ''}${notation} → ${diceRoll.total}`,
    roll: diceRoll,
    gmOnly: secret,
  });

  if (!secret) emitter?.roll(table.id, diceRoll);
  touch(table);
  return diceRoll;
}

/** Teste pedido pelo Mestre a um personagem do grupo. */
export function gmCheck(
  table: TableState,
  input: {
    characterId: string;
    attributeId: string;
    difficulty: number;
    label?: string;
    advantage?: 'none' | 'advantage' | 'disadvantage';
    secret?: boolean;
  },
): { roll: DiceRoll; degree: string; characterName: string } {
  const setting = settingOf(table);
  const character = table.characters.find(
    (c) => c.id === input.characterId || c.name === input.characterId,
  );
  if (!character) throw new TableError(`Personagem não encontrado: ${input.characterId}`);

  const attribute = setting.characterModel.attributes.find((a) => a.id === input.attributeId);
  if (!attribute) throw new TableError(`Atributo desconhecido: ${input.attributeId}`);

  const result = performCheck({
    setting,
    character,
    attributeId: attribute.id,
    difficulty: input.difficulty,
    seed: makeSeed(table.id, rollNonce++),
    rolledBy: 'gm',
    label: input.label ?? `${attribute.name} (${character.name})`,
    advantage: input.advantage,
    secret: input.secret,
  });

  const degree = setting.rules.degreeLabels[result.outcome.degree];
  appendLog(table, {
    kind: 'roll',
    authorId: 'gm',
    authorName: 'Mestre',
    text:
      `${character.name} — ${attribute.name} vs ${input.difficulty}: ` +
      `${result.roll.total} (${degree})`,
    roll: result.roll,
    gmOnly: Boolean(input.secret),
  });

  if (!input.secret) emitter?.roll(table.id, result.roll);
  touch(table);
  return { roll: result.roll, degree, characterName: character.name };
}

// ---------------------------------------------------------------------------
// Ações do Mestre — o mesmo conjunto para humano e IA
// ---------------------------------------------------------------------------

export function narrate(table: TableState, text: string, gmOnly = false): LogEntry {
  const entry = appendLog(table, {
    kind: 'narration',
    authorId: 'gm',
    authorName: 'Mestre',
    text,
    gmOnly,
  });
  touch(table);
  return entry;
}

export function setScene(
  table: TableState,
  input: { title: string; description: string; locationId?: string; trackId?: string },
): Scene {
  const setting = settingOf(table);

  const location = input.locationId
    ? setting.locations.find((l) => l.id === input.locationId)
    : undefined;
  const trackId =
    (input.trackId && setting.tracks.some((t) => t.id === input.trackId) ? input.trackId : undefined) ??
    location?.trackId ??
    table.scene.trackId;

  table.scene = {
    ...table.scene,
    locationId: location?.id ?? input.locationId,
    title: input.title.slice(0, 120),
    description: input.description.slice(0, 4000),
    trackId,
  };

  appendLog(table, {
    kind: 'system',
    authorId: 'gm',
    authorName: 'Mestre',
    text: `Cena: ${table.scene.title}${location ? ` — ${location.name}` : ''}`,
    gmOnly: false,
  });

  emitter?.scene(table.id, table.scene);
  touch(table);
  return table.scene;
}

export function spawnCreatures(table: TableState, bestiaryId: string, count: number): number {
  const setting = settingOf(table);
  const entry = setting.bestiary.find((b) => b.id === bestiaryId);
  if (!entry) throw new TableError(`Criatura desconhecida: ${bestiaryId}`);

  const amount = Math.max(1, Math.min(12, Math.floor(count)));
  const existing = table.scene.combatants.filter((c) => c.bestiaryId === bestiaryId).length;

  for (let i = 0; i < amount; i++) {
    const ordinal = existing + i + 1;
    table.scene.combatants.push(
      combatantFromBestiary(entry, `npc_${bestiaryId}_${randomUUID().slice(0, 8)}`,
        amount > 1 || existing > 0 ? `#${ordinal}` : undefined),
    );
  }

  appendLog(table, {
    kind: 'combat',
    authorId: 'gm',
    authorName: 'Mestre',
    text: `${amount}× ${entry.name} ${amount > 1 ? 'entram' : 'entra'} em cena.`,
    gmOnly: false,
  });

  emitter?.scene(table.id, table.scene);
  touch(table);
  return amount;
}

function findCombatant(table: TableState, combatantId: string): number {
  const index = table.scene.combatants.findIndex(
    (c) => c.id === combatantId || c.characterId === combatantId || c.name === combatantId,
  );
  if (index === -1) throw new TableError(`Combatente não encontrado: ${combatantId}`);
  return index;
}

export function damageCombatant(
  table: TableState,
  combatantId: string,
  vitalId: string,
  amount: number,
): { name: string; applied: number; downed: boolean } {
  const index = findCombatant(table, combatantId);
  const target = table.scene.combatants[index]!;

  const result = applyDamage(target, vitalId, Math.max(0, Math.floor(amount)));
  table.scene.combatants[index] = result.combatant;
  mirrorCombatantToCharacter(table, result.combatant);

  appendLog(table, {
    kind: 'combat',
    authorId: 'gm',
    authorName: 'Mestre',
    text:
      `${target.name} sofre ${result.applied} de dano` +
      (result.downed ? ' e cai.' : `. (${result.combatant.vitals[vitalId]?.current ?? 0} restantes)`),
    gmOnly: false,
  });

  checkCombatEnd(table);
  emitter?.scene(table.id, table.scene);
  touch(table);
  return { name: target.name, applied: result.applied, downed: result.downed };
}

export function healCombatant(
  table: TableState,
  combatantId: string,
  vitalId: string,
  amount: number,
): { name: string; applied: number } {
  const index = findCombatant(table, combatantId);
  const target = table.scene.combatants[index]!;

  const result = applyHealing(target, vitalId, Math.max(0, Math.floor(amount)));
  table.scene.combatants[index] = result.combatant;
  mirrorCombatantToCharacter(table, result.combatant);

  appendLog(table, {
    kind: 'combat',
    authorId: 'gm',
    authorName: 'Mestre',
    text: `${target.name} recupera ${result.applied}.`,
    gmOnly: false,
  });

  emitter?.scene(table.id, table.scene);
  touch(table);
  return { name: target.name, applied: result.applied };
}

/** Espelha os vitais do combatente de volta na ficha do personagem. */
function mirrorCombatantToCharacter(table: TableState, combatant: { characterId?: string; vitals: Character['vitals']; conditions: string[] }): void {
  if (!combatant.characterId) return;
  const character = table.characters.find((c) => c.id === combatant.characterId);
  if (!character) return;
  character.vitals = structuredClone(combatant.vitals);
  character.conditions = [...combatant.conditions];
}

export function startCombat(table: TableState): Scene {
  const setting = settingOf(table);

  // Garante que todo o grupo está em cena antes de rolar iniciativa.
  for (const character of table.characters) {
    if (!table.scene.combatants.some((c) => c.characterId === character.id)) {
      table.scene.combatants.push(combatantFromCharacter(character));
    }
  }

  const order = rollInitiative(
    setting,
    table.scene,
    table.characters,
    `${table.id}:${rollNonce++}`,
    'gm',
  );

  table.scene.inCombat = true;
  table.scene.turnOrder = order.map((entry) => entry.combatantId);
  table.scene.activeTurn = table.scene.turnOrder[0];

  const readable = order
    .map((entry) => {
      const combatant = table.scene.combatants.find((c) => c.id === entry.combatantId);
      return `${combatant?.name ?? entry.combatantId} (${entry.score})`;
    })
    .join(', ');

  appendLog(table, {
    kind: 'combat',
    authorId: 'gm',
    authorName: 'Mestre',
    text: `Iniciativa: ${readable}.`,
    gmOnly: false,
  });

  emitter?.scene(table.id, table.scene);
  touch(table);
  return table.scene;
}

export function endCombat(table: TableState): Scene {
  table.scene.inCombat = false;
  table.scene.turnOrder = [];
  table.scene.activeTurn = undefined;
  // Hostis abatidos saem de cena; sobreviventes ficam (fugiram, renderam-se).
  const healthId = healthVitalId(settingOf(table));
  table.scene.combatants = table.scene.combatants.filter(
    (c) => !c.hostile || (c.vitals[healthId]?.current ?? 0) > 0,
  );

  appendLog(table, {
    kind: 'combat',
    authorId: 'gm',
    authorName: 'Mestre',
    text: 'O combate termina.',
    gmOnly: false,
  });

  emitter?.scene(table.id, table.scene);
  touch(table);
  return table.scene;
}

function checkCombatEnd(table: TableState): void {
  if (!table.scene.inCombat) return;
  const healthId = healthVitalId(settingOf(table));
  const resolution = combatResolution(table.scene, healthId);

  if (resolution === 'victory') {
    appendLog(table, {
      kind: 'combat',
      authorId: 'gm',
      authorName: 'Mestre',
      text: 'Todos os inimigos caíram.',
      gmOnly: false,
    });
  } else if (resolution === 'defeat') {
    appendLog(table, {
      kind: 'combat',
      authorId: 'gm',
      authorName: 'Mestre',
      text: 'O grupo inteiro caiu. O templo mais próximo recolhe o que sobrou.',
      gmOnly: false,
    });
  }
}

export function nextTurn(table: TableState): Scene {
  if (!table.scene.inCombat) throw new TableError('Não há combate em andamento.');
  table.scene = advanceTurn(table.scene);

  const active = table.scene.combatants.find((c) => c.id === table.scene.activeTurn);
  appendLog(table, {
    kind: 'combat',
    authorId: 'gm',
    authorName: 'Mestre',
    text: `Vez de ${active?.name ?? 'alguém'}.`,
    gmOnly: false,
  });

  emitter?.scene(table.id, table.scene);
  touch(table);
  return table.scene;
}

export function grantXp(table: TableState, characterId: string, amount: number): string {
  const setting = settingOf(table);
  const index = table.characters.findIndex((c) => c.id === characterId || c.name === characterId);
  if (index === -1) throw new TableError(`Personagem não encontrado: ${characterId}`);

  const before = table.characters[index]!;
  const result = grantExperience(before, setting, Math.max(0, Math.floor(amount)));
  table.characters[index] = result.character;

  let message = `${result.character.name} recebe ${amount} de experiência.`;
  if (result.levelsGained > 0) {
    message += ` Sobe para o nível ${result.character.level}!`;
  }
  if (result.unlockedPromotion) {
    message += ` Promoção disponível: ${result.unlockedPromotion}.`;
  }

  appendLog(table, {
    kind: 'system',
    authorId: 'gm',
    authorName: 'Mestre',
    text: message,
    gmOnly: false,
  });

  touch(table);
  return message;
}

export function giveItem(
  table: TableState,
  characterId: string,
  itemId: string,
  quantity: number,
): string {
  const setting = settingOf(table);
  const item = setting.items.find((i) => i.id === itemId);
  if (!item) throw new TableError(`Item desconhecido: ${itemId}`);

  const character = table.characters.find((c) => c.id === characterId || c.name === characterId);
  if (!character) throw new TableError(`Personagem não encontrado: ${characterId}`);

  const amount = Math.max(1, Math.min(999, Math.floor(quantity)));
  const existing = character.inventory.find((e) => e.itemId === itemId);
  if (existing) {
    existing.quantity += amount;
  } else {
    character.inventory.push({ itemId, quantity: amount, equipped: false });
  }

  const message = `${character.name} recebe ${amount}× ${item.name}.`;
  appendLog(table, {
    kind: 'system',
    authorId: 'gm',
    authorName: 'Mestre',
    text: message,
    gmOnly: false,
  });

  touch(table);
  return message;
}

export function setMusic(table: TableState, trackId: string | null): void {
  const setting = settingOf(table);
  if (trackId && !setting.tracks.some((t) => t.id === trackId)) {
    throw new TableError(`Faixa desconhecida: ${trackId}`);
  }
  table.scene.trackId = trackId ?? undefined;
  emitter?.scene(table.id, table.scene);
  touch(table);
}

export function updateChronicle(table: TableState, summary: string): void {
  table.chronicle = summary.slice(0, 6000);
  touch(table);
}

export function say(
  table: TableState,
  playerId: string,
  text: string,
  kind: 'speech' | 'ooc',
): LogEntry {
  const participant = table.participants.find((p) => p.id === playerId);
  if (!participant) throw new TableError('Participante não encontrado.');

  const character = participant.characterId
    ? table.characters.find((c) => c.id === participant.characterId)
    : undefined;

  const entry = appendLog(table, {
    kind,
    authorId: playerId,
    authorName: kind === 'speech' && character ? character.name : participant.name,
    text: text.slice(0, 2000),
    gmOnly: false,
  });

  touch(table);
  return entry;
}

// ---------------------------------------------------------------------------
// Manutenção
// ---------------------------------------------------------------------------

/** Descarrega da memória mesas ociosas — o estado continua no SQLite. */
export function evictIdleTables(): number {
  const cutoff = Date.now() - config.tableIdleMs;
  let evicted = 0;
  for (const [id, table] of tables) {
    const anyoneConnected = table.participants.some((p) => p.connected);
    if (!anyoneConnected && table.updatedAt < cutoff) {
      saveTable(table);
      tables.delete(id);
      evicted++;
    }
  }
  return evicted;
}

export function activeTableCount(): number {
  return tables.size;
}
