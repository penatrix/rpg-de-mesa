/**
 * Tipos de domínio compartilhados entre servidor e cliente.
 *
 * Nada aqui conhece Tibia, Horror Cósmico ou qualquer outra ambientação
 * específica: o motor opera sobre estas estruturas genéricas e as
 * ambientações preenchem os dados (ver `settings/types.ts`).
 */

export type SettingId = string;
export type TableId = string;
export type PlayerId = string;
export type CharacterId = string;

/** Quem controla um assento na mesa. */
export type SeatKind = 'human' | 'npc';

/** Papel de um participante. */
export type Role = 'gm' | 'player';

/** Quem está mestrando. */
export type GameMasterKind = 'human' | 'ai';

export interface Participant {
  id: PlayerId;
  name: string;
  role: Role;
  seat: SeatKind;
  /** Personagem controlado (só para `role: 'player'`). */
  characterId?: CharacterId;
  connected: boolean;
  /** Epoch ms da última atividade — usado para limpar mesas ociosas. */
  lastSeen: number;
}

// ---------------------------------------------------------------------------
// Ficha de personagem
// ---------------------------------------------------------------------------

/** Um recurso que sobe e desce durante o jogo (vida, mana, sanidade...). */
export interface VitalState {
  current: number;
  max: number;
}

export interface InventoryEntry {
  itemId: string;
  quantity: number;
  /** Equipado no slot indicado pela definição do item. */
  equipped: boolean;
}

export interface Character {
  id: CharacterId;
  settingId: SettingId;
  name: string;

  /** Id da classe/vocação na definição da ambientação. */
  classId: string;
  /** Id da origem/ancestralidade, quando a ambientação define uma. */
  originId?: string;

  level: number;
  experience: number;

  /** Chave = id do atributo definido pela ambientação. */
  attributes: Record<string, number>;
  /** Chave = id do vital definido pela ambientação. */
  vitals: Record<string, VitalState>;

  inventory: InventoryEntry[];
  /** Ids de magias/habilidades conhecidas. */
  abilities: string[];

  /** Condições ativas (envenenado, em chamas, amaldiçoado...). */
  conditions: string[];

  notes: string;
  portraitSeed: string;
}

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------

export interface DieResult {
  sides: number;
  value: number;
  /** Descartado por keep-highest / keep-lowest. */
  dropped: boolean;
  /** Resultado de uma explosão (dado máximo rerrolado). */
  exploded: boolean;
}

export interface DiceRoll {
  id: string;
  notation: string;
  dice: DieResult[];
  modifier: number;
  total: number;
  /** Semente usada — permite reproduzir e auditar a rolagem. */
  seed: string;
  /** Rótulo livre: "Ataque com espada", "Teste de Sanidade". */
  label?: string;
  /** Preenchido quando a rolagem foi um teste contra dificuldade. */
  check?: CheckOutcome;
  rolledBy: PlayerId;
  rolledAt: number;
  /** Rolagem secreta do Mestre — não vai para os jogadores. */
  secret: boolean;
}

export type CheckDegree =
  | 'critical-failure'
  | 'failure'
  | 'success'
  | 'critical-success';

export interface CheckOutcome {
  difficulty: number;
  margin: number;
  degree: CheckDegree;
}

// ---------------------------------------------------------------------------
// Cena e narrativa
// ---------------------------------------------------------------------------

export interface Scene {
  /** Id de local da ambientação, quando a cena acontece em um lugar catalogado. */
  locationId?: string;
  title: string;
  description: string;
  /** Id da faixa musical sugerida para o clima atual. */
  trackId?: string;
  /** Criaturas presentes, para o painel de combate. */
  combatants: Combatant[];
  /** Verdadeiro quando a iniciativa está ativa. */
  inCombat: boolean;
  turnOrder: string[];
  activeTurn?: string;
}

export interface Combatant {
  id: string;
  /** Id no bestiário da ambientação (ausente para PCs). */
  bestiaryId?: string;
  /** Id do personagem (ausente para monstros). */
  characterId?: CharacterId;
  name: string;
  vitals: Record<string, VitalState>;
  conditions: string[];
  hostile: boolean;
}

export type LogEntryKind =
  | 'narration'
  | 'speech'
  | 'ooc'
  | 'roll'
  | 'system'
  | 'combat';

export interface LogEntry {
  id: string;
  kind: LogEntryKind;
  /** Autor: id de participante, ou 'gm' quando é o Mestre IA. */
  authorId: string;
  authorName: string;
  text: string;
  /** Presente quando `kind === 'roll'`. */
  roll?: DiceRoll;
  at: number;
  /** Visível apenas para o Mestre. */
  gmOnly: boolean;
  /** Narração ainda sendo transmitida token a token. */
  streaming?: boolean;
}

// ---------------------------------------------------------------------------
// Mesa
// ---------------------------------------------------------------------------

export const MAX_PLAYERS = 6;

export interface TableConfig {
  settingId: SettingId;
  name: string;
  gmKind: GameMasterKind;
  /** Só para `gmKind: 'human'` — id do participante que mestra. */
  gmPlayerId?: string;
  maxPlayers: number;
  /** Permite que a IA controle assentos vazios como NPCs companheiros. */
  allowNpcCompanions: boolean;
  musicEnabled: boolean;
  /**
   * Teto de gasto do Mestre IA nesta mesa, em centavos de dólar. `0` = sem teto.
   * Fixado na criação para que mudar o padrão do servidor não altere mesas em
   * andamento no meio de uma sessão.
   */
  budgetCents: number;
}

/**
 * Teste que o Mestre pediu e ainda aguarda o jogador rolar.
 *
 * Existe para devolver a agência ao jogador: o Mestre pede, quem rola é você.
 */
export interface PendingCheck {
  id: string;
  characterId: CharacterId;
  attributeId: string;
  difficulty: number;
  reason: string;
  advantage: 'none' | 'advantage' | 'disadvantage';
  requestedAt: number;
}

/**
 * Consumo acumulado do Mestre IA nesta mesa.
 *
 * Fica no estado da mesa e vai para a tela: uma conta que só aparece no fim do
 * mês é uma conta que ninguém controla. `cacheReadTokens` alto em relação a
 * `inputTokens` é sinal de saúde — quer dizer que o prefixo caro está sendo
 * reaproveitado em vez de reenviado.
 */
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  /** Chamadas à API — cada ferramenta usada é uma ida e volta. */
  requests: number;
  /** Custo estimado em centavos de dólar. Estimativa, não fatura. */
  estimatedCents: number;
}

export interface TableState {
  id: TableId;
  /** Código curto para entrar na mesa (ex.: "THAIS-42"). */
  joinCode: string;
  config: TableConfig;
  participants: Participant[];
  characters: Character[];
  scene: Scene;
  log: LogEntry[];
  createdAt: number;
  updatedAt: number;
  /** Resumo da campanha até aqui — memória de longo prazo do Mestre IA. */
  chronicle: string;
  /** Testes pedidos pelo Mestre e ainda não rolados pelos jogadores. */
  pendingChecks: PendingCheck[];
  /** Consumo do Mestre IA nesta mesa. */
  aiUsage: AiUsage;
}

/** Projeção da mesa entregue a um participante, já filtrada por permissão. */
export interface TableView extends Omit<TableState, 'log'> {
  log: LogEntry[];
  /** Papel de quem está recebendo esta projeção. */
  viewerRole: Role;
  viewerId: PlayerId;
}
