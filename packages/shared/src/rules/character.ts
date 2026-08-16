/**
 * Criação e progressão de personagem.
 *
 * Todas as regras derivam da `SettingDefinition` — este arquivo não conhece
 * nenhuma ambientação em particular.
 */

import type { Character, CharacterId, VitalState } from '../types/core.js';
import type { SettingDefinition, VitalDef } from '../settings/types.js';

export interface CreateCharacterInput {
  id: CharacterId;
  name: string;
  classId: string;
  originId?: string;
  /** Pontos distribuídos pelo jogador, por id de atributo. */
  allocations?: Record<string, number>;
  portraitSeed?: string;
}

export class RulesError extends Error {}

/** Máximo de um vital para um personagem, segundo a fórmula da ambientação. */
export function maxVital(
  vital: VitalDef,
  level: number,
  attributes: Record<string, number>,
  multiplier = 1,
): number {
  const { base, perLevel, fromAttribute } = vital.formula;
  let value = base + perLevel * (level - 1);
  if (fromAttribute) {
    value += (attributes[fromAttribute.attributeId] ?? 0) * fromAttribute.multiplier;
  }
  return Math.max(1, Math.floor(value * multiplier));
}

/** Recalcula os máximos de todos os vitais, preservando o valor atual. */
export function recomputeVitals(
  character: Character,
  setting: SettingDefinition,
): Record<string, VitalState> {
  const classDef = setting.characterModel.classes.find((c) => c.id === character.classId);
  const result: Record<string, VitalState> = {};

  for (const vital of setting.characterModel.vitals) {
    const multiplier = classDef?.vitalMultipliers?.[vital.id] ?? 1;
    const max = maxVital(vital, character.level, character.attributes, multiplier);
    const previous = character.vitals[vital.id];
    result[vital.id] = {
      max,
      current: previous ? Math.min(previous.current, max) : max,
    };
  }
  return result;
}

export function createCharacter(
  setting: SettingDefinition,
  input: CreateCharacterInput,
): Character {
  const classDef = setting.characterModel.classes.find((c) => c.id === input.classId);
  if (!classDef) {
    throw new RulesError(`Classe desconhecida em "${setting.name}": ${input.classId}`);
  }

  const origin = input.originId
    ? setting.characterModel.origins?.find((o) => o.id === input.originId)
    : undefined;
  if (input.originId && !origin) {
    throw new RulesError(`Origem desconhecida: ${input.originId}`);
  }

  const allocations = input.allocations ?? {};
  const spent = Object.values(allocations).reduce((sum, n) => sum + n, 0);
  if (spent > setting.characterModel.pointBuy) {
    throw new RulesError(
      `Pontos demais distribuídos: ${spent} de ${setting.characterModel.pointBuy}.`,
    );
  }
  for (const [attributeId, amount] of Object.entries(allocations)) {
    if (amount < 0) throw new RulesError(`Alocação negativa em "${attributeId}".`);
    if (!setting.characterModel.attributes.some((a) => a.id === attributeId)) {
      throw new RulesError(`Atributo desconhecido: ${attributeId}`);
    }
  }

  const attributes: Record<string, number> = {};
  for (const attribute of setting.characterModel.attributes) {
    const value =
      attribute.base +
      (classDef.attributeModifiers[attribute.id] ?? 0) +
      (origin?.attributeModifiers?.[attribute.id] ?? 0) +
      (allocations[attribute.id] ?? 0);
    attributes[attribute.id] = Math.min(attribute.max, Math.max(attribute.min, value));
  }

  const character: Character = {
    id: input.id,
    settingId: setting.id,
    name: input.name,
    classId: classDef.id,
    originId: origin?.id,
    level: 1,
    experience: 0,
    attributes,
    vitals: {},
    inventory: classDef.startingItems.map((itemId) => ({
      itemId,
      quantity: 1,
      equipped: setting.items.find((i) => i.id === itemId)?.slot !== 'consumable',
    })),
    abilities: [...classDef.startingAbilities],
    conditions: [],
    notes: '',
    portraitSeed: input.portraitSeed ?? input.id,
  };

  character.vitals = recomputeVitals(character, setting);
  return character;
}

/** XP total acumulada necessária para atingir um nível. */
export function experienceForLevel(setting: SettingDefinition, level: number): number {
  if (level <= 1) return 0;
  const { base, exponent } = setting.rules.experienceCurve;
  return Math.floor(base * Math.pow(level - 1, exponent));
}

export interface LevelUpResult {
  character: Character;
  levelsGained: number;
  unlockedPromotion?: string;
}

/** Concede XP e sobe de nível quantas vezes for necessário. */
export function grantExperience(
  character: Character,
  setting: SettingDefinition,
  amount: number,
): LevelUpResult {
  if (amount < 0) throw new RulesError('XP negativa.');

  const updated: Character = { ...character, experience: character.experience + amount };
  let levelsGained = 0;
  let unlockedPromotion: string | undefined;

  const classDef = setting.characterModel.classes.find((c) => c.id === character.classId);

  // Teto de 200 para não travar caso a curva de XP seja configurada de forma degenerada.
  while (updated.level < 200 && updated.experience >= experienceForLevel(setting, updated.level + 1)) {
    updated.level += 1;
    levelsGained += 1;
    if (classDef?.promotion && updated.level === classDef.promotion.atLevel) {
      unlockedPromotion = classDef.promotion.name;
    }
  }

  if (levelsGained > 0) {
    updated.vitals = recomputeVitals(updated, setting);
    // Subir de nível restaura os vitais — convenção da plataforma.
    for (const vital of Object.values(updated.vitals)) vital.current = vital.max;
  }

  return { character: updated, levelsGained, unlockedPromotion };
}

/** Capacidade de carga atual e peso carregado. */
export function carryStatus(
  character: Character,
  setting: SettingDefinition,
): { capacity: number; carried: number } | null {
  const rule = setting.characterModel.carryCapacity;
  if (!rule) return null;

  const capacity = rule.base + rule.perLevel * (character.level - 1);
  const carried = character.inventory.reduce((sum, entry) => {
    const item = setting.items.find((i) => i.id === entry.itemId);
    return sum + (item?.weight ?? 0) * entry.quantity;
  }, 0);

  return { capacity, carried: Math.round(carried * 10) / 10 };
}

/** Atributo efetivo incluindo bônus de itens equipados. */
export function effectiveAttribute(
  character: Character,
  setting: SettingDefinition,
  attributeId: string,
): number {
  let value = character.attributes[attributeId] ?? 0;
  for (const entry of character.inventory) {
    if (!entry.equipped) continue;
    const item = setting.items.find((i) => i.id === entry.itemId);
    value += item?.attributeBonuses?.[attributeId] ?? 0;
  }
  return value;
}
