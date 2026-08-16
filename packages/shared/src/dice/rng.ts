/**
 * RNG determinístico e semeado.
 *
 * Rolagens de mesa precisam ser auditáveis: um jogador que contesta um
 * resultado deve poder reproduzi-lo a partir da semente registrada. Math.random
 * não permite isso, então usamos xoshiro128** com semeadura por hash da string.
 */

export interface Rng {
  /** Float em [0, 1). */
  next(): number;
  /** Inteiro em [1, sides]. */
  die(sides: number): number;
  /** Elemento aleatório de um array não-vazio. */
  pick<T>(items: readonly T[]): T;
}

/** Hash de string para 4 palavras de 32 bits (splitmix-ish sobre FNV-1a). */
function seedToState(seed: string): [number, number, number, number] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const state: number[] = [];
  for (let i = 0; i < 4; i++) {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    // Um estado todo-zero trava xoshiro; 0x9e3779b9 garante entropia mínima.
    state.push(h === 0 ? 0x9e3779b9 : h);
  }
  return [state[0]!, state[1]!, state[2]!, state[3]!];
}

const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0;

export function createRng(seed: string): Rng {
  let [s0, s1, s2, s3] = seedToState(seed);

  const nextUint32 = (): number => {
    const result = (Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);
    return result;
  };

  const next = (): number => nextUint32() / 0x1_0000_0000;

  return {
    next,
    die: (sides: number) => {
      if (!Number.isInteger(sides) || sides < 1) {
        throw new Error(`Número de faces inválido: ${sides}`);
      }
      return 1 + Math.floor(next() * sides);
    },
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('pick() em array vazio');
      return items[Math.floor(next() * items.length)]!;
    },
  };
}

/** Semente legível para uma rolagem: liga a rolagem à mesa e ao instante. */
export function makeSeed(tableId: string, nonce: number): string {
  return `${tableId}:${nonce}:${Date.now().toString(36)}`;
}
