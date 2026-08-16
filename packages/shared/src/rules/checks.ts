/**
 * Resolução de testes: rolar contra uma dificuldade e classificar o grau.
 */

import type { Character, CheckDegree, CheckOutcome, DiceRoll, PlayerId } from '../types/core.js';
import type { SettingDefinition } from '../settings/types.js';
import { roll } from '../dice/notation.js';
import { effectiveAttribute } from './character.js';

/** Quanto um atributo contribui para um teste, segundo a escala da ambientação. */
export function attributeBonus(setting: SettingDefinition, value: number): number {
  switch (setting.rules.attributeScaling) {
    case 'flat':
      return value;
    case 'half':
      return Math.floor(value / 2);
    case 'tenth':
      return Math.floor(value / 10);
  }
}

export interface CheckInput {
  setting: SettingDefinition;
  character: Character;
  attributeId: string;
  difficulty: number;
  seed: string;
  rolledBy: PlayerId;
  label?: string;
  secret?: boolean;
  /** Modificador circunstancial aplicado pelo Mestre. */
  bonus?: number;
  /** Vantagem rola dois dados e mantém o melhor; desvantagem, o pior. */
  advantage?: 'none' | 'advantage' | 'disadvantage';
}

function classify(
  setting: SettingDefinition,
  naturalDie: number,
  dieSides: number,
  margin: number,
): CheckDegree {
  const { successAtOrAbove, failureAtOrBelow } = setting.rules.criticalRange;
  // O dado natural manda: um 20 natural é crítico mesmo com margem apertada.
  if (naturalDie >= successAtOrAbove && naturalDie <= dieSides) return 'critical-success';
  if (naturalDie <= failureAtOrBelow) return 'critical-failure';
  return margin >= 0 ? 'success' : 'failure';
}

export interface CheckResult {
  roll: DiceRoll;
  outcome: CheckOutcome;
  /** Composição do total, para exibir na UI. */
  breakdown: { die: number; attribute: number; bonus: number };
}

export function performCheck(input: CheckInput): CheckResult {
  const { setting, character, attributeId, difficulty } = input;

  const attribute = effectiveAttribute(character, setting, attributeId);
  const bonus = attributeBonus(setting, attribute) + (input.bonus ?? 0);

  // Vantagem/desvantagem duplicam o dado de teste e mantêm um.
  let notation = setting.rules.checkDice;
  if (input.advantage === 'advantage' || input.advantage === 'disadvantage') {
    const match = /^(\d*)d(\d+)$/i.exec(notation.trim());
    if (match) {
      const count = match[1] === '' ? 1 : Number(match[1]);
      const keep = input.advantage === 'advantage' ? 'kh' : 'kl';
      notation = `${count * 2}d${match[2]}${keep}${count}`;
    }
  }

  const diceRoll = roll({
    notation,
    seed: input.seed,
    rolledBy: input.rolledBy,
    label: input.label,
    secret: input.secret,
  });

  const dieTotal = diceRoll.total;
  const total = dieTotal + bonus;
  const margin = total - difficulty;

  const kept = diceRoll.dice.filter((d) => !d.dropped);
  const naturalDie = kept.reduce((sum, d) => sum + d.value, 0);
  const dieSides = kept[0]?.sides ?? 20;

  const outcome: CheckOutcome = {
    difficulty,
    margin,
    degree: classify(setting, naturalDie, dieSides * kept.length, margin),
  };

  return {
    roll: { ...diceRoll, total, check: outcome },
    outcome,
    breakdown: { die: dieTotal, attribute: attributeBonus(setting, attribute), bonus: input.bonus ?? 0 },
  };
}

/** Nome legível de uma dificuldade numérica. */
export function difficultyLabel(setting: SettingDefinition, value: number): string {
  const sorted = [...setting.rules.difficulties].sort((a, b) => a.value - b.value);
  let label = sorted[0]?.name ?? 'Desconhecida';
  for (const entry of sorted) {
    if (value >= entry.value) label = entry.name;
  }
  return label;
}
