/**
 * Parser e avaliador de notação de dados.
 *
 * Suporta: `2d6`, `1d20+5`, `4d6kh3` (mantém os 3 maiores), `2d20kl1`
 * (mantém o menor — desvantagem), `3d6!` (explosivos), constantes (`+2`),
 * e somas/subtrações de vários termos: `1d8+1d4+3`.
 */

import type { DiceRoll, DieResult, PlayerId } from '../types/core.js';
import { createRng, type Rng } from './rng.js';

interface DiceTerm {
  kind: 'dice';
  sign: 1 | -1;
  count: number;
  sides: number;
  keep?: { mode: 'highest' | 'lowest'; count: number };
  explode: boolean;
}

interface ConstTerm {
  kind: 'const';
  sign: 1 | -1;
  value: number;
}

type Term = DiceTerm | ConstTerm;

const TERM_RE = /^(\d*)d(\d+)(?:k([hl])(\d+))?(!?)$/i;

/** Limites de sanidade — impedem que `9999d9999` derrube o servidor. */
const MAX_DICE_PER_TERM = 100;
const MAX_SIDES = 1000;
const MAX_EXPLOSIONS = 20;

export class DiceNotationError extends Error {}

export function parseNotation(notation: string): Term[] {
  const cleaned = notation.replace(/\s+/g, '').toLowerCase();
  if (cleaned.length === 0) throw new DiceNotationError('Notação vazia.');
  if (cleaned.length > 120) throw new DiceNotationError('Notação longa demais.');

  // Divide mantendo os sinais: "1d8+2-1d4" -> ["+1d8", "+2", "-1d4"]
  const chunks = cleaned.replace(/^([^+-])/, '+$1').match(/[+-][^+-]*/g);
  if (!chunks) throw new DiceNotationError(`Notação inválida: "${notation}"`);

  return chunks.map((chunk) => {
    const sign: 1 | -1 = chunk[0] === '-' ? -1 : 1;
    const body = chunk.slice(1);
    if (body.length === 0) throw new DiceNotationError(`Termo vazio em "${notation}".`);

    if (/^\d+$/.test(body)) {
      return { kind: 'const', sign, value: Number(body) } satisfies ConstTerm;
    }

    const match = TERM_RE.exec(body);
    if (!match) throw new DiceNotationError(`Termo inválido: "${body}".`);

    const count = match[1] === '' ? 1 : Number(match[1]);
    const sides = Number(match[2]);
    const keepMode = match[3];
    const keepCount = match[4] ? Number(match[4]) : undefined;
    const explode = match[5] === '!';

    if (count < 1 || count > MAX_DICE_PER_TERM) {
      throw new DiceNotationError(`Quantidade de dados fora do limite (1-${MAX_DICE_PER_TERM}).`);
    }
    if (sides < 2 || sides > MAX_SIDES) {
      throw new DiceNotationError(`Número de faces fora do limite (2-${MAX_SIDES}).`);
    }
    if (keepMode && (keepCount === undefined || keepCount < 1 || keepCount > count)) {
      throw new DiceNotationError(`"k${keepMode}${keepCount}" incompatível com ${count} dados.`);
    }

    return {
      kind: 'dice',
      sign,
      count,
      sides,
      explode,
      keep: keepMode
        ? { mode: keepMode === 'h' ? 'highest' : 'lowest', count: keepCount! }
        : undefined,
    } satisfies DiceTerm;
  });
}

export interface EvaluatedRoll {
  dice: DieResult[];
  modifier: number;
  total: number;
}

/** Avalia uma notação já parseada com um RNG dado. */
export function evaluateTerms(terms: Term[], rng: Rng): EvaluatedRoll {
  const dice: DieResult[] = [];
  let modifier = 0;
  let total = 0;

  for (const term of terms) {
    if (term.kind === 'const') {
      modifier += term.sign * term.value;
      total += term.sign * term.value;
      continue;
    }

    const rolled: DieResult[] = [];
    for (let i = 0; i < term.count; i++) {
      let value = rng.die(term.sides);
      rolled.push({ sides: term.sides, value, dropped: false, exploded: false });

      if (term.explode) {
        let explosions = 0;
        while (value === term.sides && explosions < MAX_EXPLOSIONS) {
          value = rng.die(term.sides);
          rolled.push({ sides: term.sides, value, dropped: false, exploded: true });
          explosions++;
        }
      }
    }

    if (term.keep) {
      // Ordena índices por valor e descarta os que não entram no "keep".
      const order = rolled
        .map((die, index) => ({ index, value: die.value }))
        .sort((a, b) => (term.keep!.mode === 'highest' ? b.value - a.value : a.value - b.value));
      for (const { index } of order.slice(term.keep.count)) {
        rolled[index]!.dropped = true;
      }
    }

    for (const die of rolled) {
      if (!die.dropped) total += term.sign * die.value;
    }
    dice.push(...rolled);
  }

  return { dice, modifier, total };
}

export interface RollOptions {
  notation: string;
  seed: string;
  rolledBy: PlayerId;
  label?: string;
  secret?: boolean;
  id?: string;
}

/** Rola uma notação e devolve o registro completo e auditável. */
export function roll(options: RollOptions): DiceRoll {
  const terms = parseNotation(options.notation);
  const rng = createRng(options.seed);
  const { dice, modifier, total } = evaluateTerms(terms, rng);

  return {
    id: options.id ?? `roll_${options.seed}`,
    notation: options.notation,
    dice,
    modifier,
    total,
    seed: options.seed,
    label: options.label,
    rolledBy: options.rolledBy,
    rolledAt: Date.now(),
    secret: options.secret ?? false,
  };
}

/** Média esperada de uma notação — usada para calibrar encontros. */
export function averageOf(notation: string): number {
  const terms = parseNotation(notation);
  let sum = 0;
  for (const term of terms) {
    if (term.kind === 'const') {
      sum += term.sign * term.value;
    } else {
      const kept = term.keep?.count ?? term.count;
      sum += term.sign * kept * ((term.sides + 1) / 2);
    }
  }
  return sum;
}
