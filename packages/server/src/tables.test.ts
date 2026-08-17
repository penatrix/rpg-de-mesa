import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';

/**
 * Testes do fluxo que devolve o dado ao jogador.
 *
 * O Mestre IA pedia *e* resolvia o teste, o que transformava a mesa em texto
 * que acontecia com o jogador. A correção só funciona se o pedido ficar mesmo
 * pendente e se a posse da ficha for respeitada — as duas coisas verificadas
 * aqui. Nada disso chama a API nem precisa de chave.
 */

// A configuração lê o ambiente no momento do import, e o gerenciador de mesas
// grava em SQLite a cada mudança. Um banco descartável mantém o teste isolado.
process.env.RPG_DB_PATH = join(mkdtempSync(join(tmpdir(), 'rpg-test-')), 'test.db');

type Tables = typeof import('./tables.js');
let tables: Tables;

before(async () => {
  tables = await import('./tables.js');
});

function newTable() {
  const { table, playerId } = tables.createTable({
    settingId: 'tibia',
    tableName: 'Mesa de teste',
    playerName: 'Jogadora',
    gmKind: 'ai',
    allowNpcCompanions: false,
    musicEnabled: false,
  });
  const character = tables.createCharacterForPlayer(table, playerId, {
    name: 'Vera',
    classId: 'knight',
  });
  return { table, playerId, character };
}

describe('teste pedido pelo Mestre', () => {
  it('fica pendente em vez de resolver sozinho', () => {
    const { table, character } = newTable();

    const requested = tables.requestCheck(table, {
      characterId: character.id,
      attributeId: 'sword',
      difficulty: 14,
      reason: 'arrombar a tábua',
    });

    assert.equal(table.pendingChecks.length, 1);
    assert.equal(table.pendingChecks[0]?.id, requested.check.id);
    // Se alguma rolagem tivesse acontecido, ela estaria no log.
    assert.equal(table.log.filter((entry) => entry.kind === 'roll').length, 0);
  });

  it('resolve com a rolagem do jogador e some da fila', () => {
    const { table, playerId, character } = newTable();
    const { check } = tables.requestCheck(table, {
      characterId: character.id,
      attributeId: 'sword',
      difficulty: 14,
      reason: 'arrombar a tábua',
    });

    const result = tables.resolvePendingCheck(table, playerId, check.id);

    assert.equal(result.characterName, 'Vera');
    assert.ok(result.roll.check, 'a rolagem precisa carregar o resultado do teste');
    assert.equal(result.roll.check?.difficulty, 14);
    assert.equal(result.roll.rolledBy, playerId, 'o dado é do jogador, não do Mestre');
    assert.equal(table.pendingChecks.length, 0);
  });

  it('não deixa um jogador rolar a ficha de outro', () => {
    const { table, character } = newTable();
    const outro = tables.joinTable(table.joinCode, 'Intruso');
    const { check } = tables.requestCheck(table, {
      characterId: character.id,
      attributeId: 'sword',
      difficulty: 14,
      reason: 'arrombar a tábua',
    });

    assert.throws(() => tables.resolvePendingCheck(table, outro.playerId, check.id), /é de Vera/);
    assert.equal(table.pendingChecks.length, 1, 'o pedido continua aberto');
  });

  it('mantém um pedido por personagem', () => {
    const { table, character } = newTable();
    for (const difficulty of [10, 18]) {
      tables.requestCheck(table, {
        characterId: character.id,
        attributeId: 'sword',
        difficulty,
        reason: 'insistir',
      });
    }

    assert.equal(table.pendingChecks.length, 1);
    assert.equal(table.pendingChecks[0]?.difficulty, 18, 'o pedido novo substitui o antigo');
  });

  it('recusa um teste já resolvido', () => {
    const { table, playerId, character } = newTable();
    const { check } = tables.requestCheck(table, {
      characterId: character.id,
      attributeId: 'sword',
      difficulty: 14,
      reason: 'arrombar a tábua',
    });

    tables.resolvePendingCheck(table, playerId, check.id);
    assert.throws(() => tables.resolvePendingCheck(table, playerId, check.id), /já foi resolvido/);
  });
});

describe('companheiros NPC', () => {
  it('entram com ficha própria e assento de NPC', () => {
    const { table } = newTable();
    const companion = tables.addCompanion(table, 'brida');

    const seat = table.participants.find((p) => p.characterId === companion.id);
    assert.equal(seat?.seat, 'npc');
    assert.equal(seat?.role, 'player');
    assert.ok(companion.vitals.hp && companion.vitals.hp.max > 0, 'companheiro sem vida não luta');
  });

  it('qualquer um à mesa pode rolar o teste de um companheiro', () => {
    const { table, playerId } = newTable();
    const companion = tables.addCompanion(table, 'brida');
    const { check } = tables.requestCheck(table, {
      characterId: companion.id,
      attributeId: 'shielding',
      difficulty: 12,
      reason: 'segurar a porta',
    });

    // Não há ninguém para clicar por ele; travar aqui travaria a mesa.
    assert.doesNotThrow(() => tables.resolvePendingCheck(table, playerId, check.id));
  });

  it('não entra duas vezes', () => {
    const { table } = newTable();
    tables.addCompanion(table, 'brida');
    assert.throws(() => tables.addCompanion(table, 'brida'), /já está no grupo/);
  });

  it('sai levando a ficha junto', () => {
    const { table } = newTable();
    const companion = tables.addCompanion(table, 'osmund');
    const seat = table.participants.find((p) => p.characterId === companion.id)!;

    tables.removeCompanion(table, seat.id);

    assert.equal(table.participants.some((p) => p.id === seat.id), false);
    assert.equal(table.characters.some((c) => c.id === companion.id), false);
  });
});

describe('consumo do Mestre IA', () => {
  it('acumula tokens e custo por chamada', () => {
    const { table } = newTable();
    assert.equal(table.aiUsage.requests, 0);

    tables.recordAiUsage(table, {
      inputTokens: 1000,
      outputTokens: 500,
      cacheWriteTokens: 4000,
      cacheReadTokens: 0,
    });
    tables.recordAiUsage(table, {
      inputTokens: 200,
      outputTokens: 300,
      cacheWriteTokens: 0,
      cacheReadTokens: 4000,
    });

    assert.equal(table.aiUsage.requests, 2);
    assert.equal(table.aiUsage.inputTokens, 1200);
    assert.equal(table.aiUsage.cacheReadTokens, 4000);
    assert.ok(table.aiUsage.estimatedCents > 0, 'gasto precisa aparecer para a mesa');
  });

  it('trava o Mestre ao estourar o teto da mesa', () => {
    const { table } = newTable();
    table.config.budgetCents = 1;
    assert.equal(tables.budgetExhausted(table), false);

    // Um milhão de tokens de saída passa de US$ 0,01 em qualquer modelo.
    tables.recordAiUsage(table, {
      inputTokens: 0,
      outputTokens: 1_000_000,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
    });

    assert.equal(tables.budgetExhausted(table), true);
  });

  it('não trava quando o teto é zero', () => {
    const { table } = newTable();
    table.config.budgetCents = 0;
    tables.recordAiUsage(table, {
      inputTokens: 0,
      outputTokens: 10_000_000,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
    });

    assert.equal(tables.budgetExhausted(table), false);
  });
});
