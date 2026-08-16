/**
 * Combate: iniciativa, ataques, dano e mortes.
 */

import type {
  Character,
  Combatant,
  DiceRoll,
  PlayerId,
  Scene,
  VitalState,
} from '../types/core.js';
import type { BestiaryEntry, SettingDefinition } from '../settings/types.js';
import { roll } from '../dice/notation.js';
import { effectiveAttribute } from './character.js';

/** Id do vital tratado como "vida" — o primeiro declarado pela ambientação. */
export function healthVitalId(setting: SettingDefinition): string {
  return setting.characterModel.vitals[0]?.id ?? 'hp';
}

export function combatantFromCharacter(character: Character): Combatant {
  return {
    id: `pc_${character.id}`,
    characterId: character.id,
    name: character.name,
    vitals: structuredClone(character.vitals),
    conditions: [...character.conditions],
    hostile: false,
  };
}

export function combatantFromBestiary(
  entry: BestiaryEntry,
  instanceId: string,
  nameSuffix?: string,
): Combatant {
  const vitals: Record<string, VitalState> = {};
  for (const [id, max] of Object.entries(entry.vitals)) {
    vitals[id] = { current: max, max };
  }
  return {
    id: instanceId,
    bestiaryId: entry.id,
    name: nameSuffix ? `${entry.name} ${nameSuffix}` : entry.name,
    vitals,
    conditions: [],
    hostile: true,
  };
}

export interface InitiativeEntry {
  combatantId: string;
  score: number;
  roll: DiceRoll;
}

/**
 * Rola iniciativa para todos os combatentes.
 *
 * O atributo usado é o primeiro atributo `primary` da ambientação — assim
 * cada mundo decide o que governa reflexo sem o motor precisar saber.
 */
export function rollInitiative(
  setting: SettingDefinition,
  scene: Scene,
  characters: Character[],
  seedPrefix: string,
  rolledBy: PlayerId,
): InitiativeEntry[] {
  const initiativeAttribute =
    setting.characterModel.attributes.find((a) => a.primary)?.id ??
    setting.characterModel.attributes[0]?.id ??
    '';

  const entries: InitiativeEntry[] = scene.combatants.map((combatant, index) => {
    const character = combatant.characterId
      ? characters.find((c) => c.id === combatant.characterId)
      : undefined;

    const bonus = character
      ? Math.floor(effectiveAttribute(character, setting, initiativeAttribute) / 10)
      : 0;

    const diceRoll = roll({
      notation: setting.rules.checkDice,
      seed: `${seedPrefix}:init:${index}`,
      rolledBy,
      label: `Iniciativa — ${combatant.name}`,
    });

    return {
      combatantId: combatant.id,
      score: diceRoll.total + bonus,
      roll: diceRoll,
    };
  });

  return entries.sort((a, b) => b.score - a.score);
}

export interface DamageResult {
  combatant: Combatant;
  applied: number;
  /** O alvo chegou a zero neste golpe. */
  downed: boolean;
}

/** Aplica dano a um vital, respeitando a redução de armadura. */
export function applyDamage(
  combatant: Combatant,
  vitalId: string,
  amount: number,
  armor = 0,
): DamageResult {
  const vital = combatant.vitals[vitalId];
  if (!vital) {
    return { combatant, applied: 0, downed: false };
  }

  // Todo golpe que acerta tira ao menos 1: armadura reduz, não anula.
  const applied = Math.max(amount > 0 ? 1 : 0, amount - armor);
  const next = structuredClone(combatant);
  next.vitals[vitalId] = {
    ...vital,
    current: Math.max(0, vital.current - applied),
  };

  const downed = next.vitals[vitalId]!.current === 0 && vital.current > 0;
  if (downed && !next.conditions.includes('abatido')) {
    next.conditions.push('abatido');
  }

  return { combatant: next, applied, downed };
}

/** Aplica cura a um vital, sem ultrapassar o máximo. */
export function applyHealing(
  combatant: Combatant,
  vitalId: string,
  amount: number,
): DamageResult {
  const vital = combatant.vitals[vitalId];
  if (!vital || amount <= 0) return { combatant, applied: 0, downed: false };

  const applied = Math.min(amount, vital.max - vital.current);
  const next = structuredClone(combatant);
  next.vitals[vitalId] = { ...vital, current: vital.current + applied };

  if (next.vitals[vitalId]!.current > 0) {
    next.conditions = next.conditions.filter((c) => c !== 'abatido');
  }

  return { combatant: next, applied, downed: false };
}

/** Armadura total de um personagem a partir dos itens equipados. */
export function totalArmor(character: Character, setting: SettingDefinition): number {
  return character.inventory.reduce((sum, entry) => {
    if (!entry.equipped) return sum;
    const item = setting.items.find((i) => i.id === entry.itemId);
    return sum + (item?.armor ?? 0);
  }, 0);
}

/** Avança o turno na ordem de iniciativa, dando a volta ao fim da rodada. */
export function advanceTurn(scene: Scene): Scene {
  if (scene.turnOrder.length === 0) return scene;
  const currentIndex = scene.activeTurn ? scene.turnOrder.indexOf(scene.activeTurn) : -1;
  const nextIndex = (currentIndex + 1) % scene.turnOrder.length;
  return { ...scene, activeTurn: scene.turnOrder[nextIndex] };
}

/** Verdadeiro quando todos os hostis (ou todos os aliados) caíram. */
export function combatResolution(scene: Scene, healthId: string): 'ongoing' | 'victory' | 'defeat' {
  const alive = (c: Combatant): boolean => (c.vitals[healthId]?.current ?? 0) > 0;
  const hostiles = scene.combatants.filter((c) => c.hostile);
  const allies = scene.combatants.filter((c) => !c.hostile);

  if (allies.length > 0 && !allies.some(alive)) return 'defeat';
  if (hostiles.length > 0 && !hostiles.some(alive)) return 'victory';
  return 'ongoing';
}
