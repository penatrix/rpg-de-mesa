import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DiceNotationError, averageOf, parseNotation, roll } from './notation.js';
import { createRng } from './rng.js';

describe('parseNotation', () => {
  it('lê um termo simples', () => {
    assert.deepEqual(parseNotation('2d6'), [
      { kind: 'dice', sign: 1, count: 2, sides: 6, explode: false, keep: undefined },
    ]);
  });

  it('assume 1 dado quando a quantidade é omitida', () => {
    const [term] = parseNotation('d20');
    assert.equal(term?.kind === 'dice' && term.count, 1);
  });

  it('lê modificadores e vários termos com sinal', () => {
    const terms = parseNotation('1d8+1d4-2');
    assert.equal(terms.length, 3);
    assert.equal(terms[2]?.kind, 'const');
    assert.equal(terms[2]?.sign, -1);
  });

  it('lê keep-highest e keep-lowest', () => {
    const [kh] = parseNotation('4d6kh3');
    assert.deepEqual(kh?.kind === 'dice' && kh.keep, { mode: 'highest', count: 3 });
    const [kl] = parseNotation('2d20kl1');
    assert.deepEqual(kl?.kind === 'dice' && kl.keep, { mode: 'lowest', count: 1 });
  });

  it('rejeita notação inválida', () => {
    assert.throws(() => parseNotation('abc'), DiceNotationError);
    assert.throws(() => parseNotation('1d1'), DiceNotationError);
    assert.throws(() => parseNotation(''), DiceNotationError);
  });

  it('rejeita quantidades absurdas — proteção contra DoS', () => {
    assert.throws(() => parseNotation('9999d6'), DiceNotationError);
    assert.throws(() => parseNotation('1d99999'), DiceNotationError);
  });

  it('rejeita keep maior que a quantidade de dados', () => {
    assert.throws(() => parseNotation('2d6kh5'), DiceNotationError);
  });
});

describe('roll', () => {
  it('é determinístico para a mesma semente', () => {
    const a = roll({ notation: '3d6+2', seed: 'mesa:1:abc', rolledBy: 'p1' });
    const b = roll({ notation: '3d6+2', seed: 'mesa:1:abc', rolledBy: 'p1' });
    assert.equal(a.total, b.total);
    assert.deepEqual(
      a.dice.map((d) => d.value),
      b.dice.map((d) => d.value),
    );
  });

  it('produz resultados diferentes para sementes diferentes', () => {
    const totals = new Set(
      Array.from({ length: 40 }, (_, i) =>
        roll({ notation: '3d6', seed: `s${i}`, rolledBy: 'p1' }).total,
      ),
    );
    assert.ok(totals.size > 5, 'sementes distintas devem divergir');
  });

  it('mantém todo valor dentro do intervalo do dado', () => {
    for (let i = 0; i < 200; i++) {
      const result = roll({ notation: '5d8', seed: `range${i}`, rolledBy: 'p1' });
      for (const die of result.dice) {
        assert.ok(die.value >= 1 && die.value <= 8, `valor fora do intervalo: ${die.value}`);
      }
    }
  });

  it('descarta os dados corretos em keep-highest', () => {
    const result = roll({ notation: '4d6kh3', seed: 'kh', rolledBy: 'p1' });
    const dropped = result.dice.filter((d) => d.dropped);
    const kept = result.dice.filter((d) => !d.dropped);
    assert.equal(dropped.length, 1);
    assert.equal(kept.length, 3);
    // Nenhum dado mantido pode ser menor que o descartado.
    const droppedValue = dropped[0]!.value;
    for (const die of kept) assert.ok(die.value >= droppedValue);
    assert.equal(result.total, kept.reduce((sum, d) => sum + d.value, 0));
  });

  it('soma o modificador ao total', () => {
    const result = roll({ notation: '1d6+100', seed: 'mod', rolledBy: 'p1' });
    assert.equal(result.modifier, 100);
    assert.ok(result.total >= 101 && result.total <= 106);
  });

  it('subtrai termos negativos', () => {
    const result = roll({ notation: '1d6-10', seed: 'neg', rolledBy: 'p1' });
    assert.ok(result.total <= -4);
  });

  it('explode dados no valor máximo', () => {
    // Procura uma semente que produza ao menos uma explosão em 1d4!.
    let found = false;
    for (let i = 0; i < 100 && !found; i++) {
      const result = roll({ notation: '1d4!', seed: `explode${i}`, rolledBy: 'p1' });
      if (result.dice.length > 1) {
        found = true;
        assert.equal(result.dice[0]!.value, 4, 'só explode no valor máximo');
        assert.ok(result.dice[1]!.exploded);
      }
    }
    assert.ok(found, 'nenhuma explosão em 100 tentativas — RNG suspeito');
  });
});

describe('averageOf', () => {
  it('calcula a média de um termo simples', () => {
    assert.equal(averageOf('1d6'), 3.5);
    assert.equal(averageOf('2d6+3'), 10);
  });

  it('desconta os dados descartados', () => {
    assert.equal(averageOf('4d6kh3'), 10.5);
  });
});

describe('createRng', () => {
  it('nunca sai do intervalo [1, faces]', () => {
    const rng = createRng('intervalo');
    for (let i = 0; i < 5000; i++) {
      const value = rng.die(20);
      assert.ok(value >= 1 && value <= 20);
    }
  });

  it('cobre todas as faces de um d6 com folga', () => {
    const rng = createRng('cobertura');
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.die(6));
    assert.equal(seen.size, 6);
  });

  it('rejeita número de faces inválido', () => {
    assert.throws(() => createRng('x').die(0));
  });
});
