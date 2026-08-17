import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listSettings, requireSetting, type TableState } from '@rpg/shared';

import { buildGmTools } from './tools.js';
import { buildSystemPrompt, buildTurnContext } from './prompts.js';

/**
 * Estes testes existem por causa de um bug que chegou em produção: o SDK gera
 * o schema das ferramentas chamando `z.toJSONSchema()`, que só existe no Zod 4.
 * Com o Zod 3 instalado, o typecheck passava e o build passava — a falha só
 * aparecia no primeiro turno de mesa, como "z.toJSONSchema is not a function".
 *
 * A lição: construir as ferramentas é código executável, não declaração. Tem
 * que ser exercitado. Nada aqui chama a API nem precisa de chave.
 */

function fakeTable(settingId: string): TableState {
  const setting = requireSetting(settingId);
  return {
    id: 'mesa-teste',
    joinCode: 'TESTE1',
    config: {
      settingId,
      name: 'Mesa de teste',
      gmKind: 'ai',
      maxPlayers: 6,
      allowNpcCompanions: true,
      musicEnabled: true,
    },
    participants: [
      { id: 'p1', name: 'Jogador', role: 'player', seat: 'human', connected: true, lastSeen: Date.now() },
    ],
    characters: [],
    scene: {
      title: 'Cena de teste',
      description: 'Descrição.',
      trackId: setting.tracks[0]?.id,
      combatants: [],
      inCombat: false,
      turnOrder: [],
    },
    log: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chronicle: '',
  };
}

describe('ferramentas do Mestre IA', () => {
  for (const setting of listSettings()) {
    describe(setting.name, () => {
      it('constrói sem lançar', () => {
        // A regressão do Zod 3 estourava exatamente aqui.
        assert.doesNotThrow(() => buildGmTools(fakeTable(setting.id), setting));
      });

      it('produz um JSON Schema válido para cada ferramenta', () => {
        const tools = buildGmTools(fakeTable(setting.id), setting);
        assert.ok(tools.length >= 10, 'o Mestre precisa de todo o conjunto de ações');

        for (const tool of tools) {
          const definition = tool as unknown as {
            name: string;
            description?: string;
            input_schema?: { type?: string; properties?: Record<string, unknown> };
          };

          assert.ok(definition.name, 'ferramenta sem nome');
          assert.ok(
            definition.description && definition.description.length > 20,
            `descrição fraca demais em "${definition.name}" — o modelo decide por ela`,
          );

          // É este objeto que vai no corpo da requisição. Se o schema não for
          // gerado, a chamada à API falha por completo.
          assert.ok(definition.input_schema, `sem input_schema: ${definition.name}`);
          assert.equal(
            definition.input_schema.type,
            'object',
            `input_schema inválido em ${definition.name}`,
          );
        }
      });

      it('expõe as ações que a mesa depende', () => {
        const names = buildGmTools(fakeTable(setting.id), setting).map(
          (tool) => (tool as unknown as { name: string }).name,
        );
        for (const required of [
          'roll_dice',
          'request_check',
          'set_scene',
          'spawn_creature',
          'damage',
          'heal',
          'start_combat',
          'end_combat',
          'grant_xp',
          'update_chronicle',
        ]) {
          assert.ok(names.includes(required), `ferramenta ausente: ${required}`);
        }
      });

      it('serializa para JSON — é assim que chega na API', () => {
        const tools = buildGmTools(fakeTable(setting.id), setting);
        assert.doesNotThrow(() => JSON.stringify(tools));
      });
    });
  }
});

describe('prompt do Mestre IA', () => {
  for (const setting of listSettings()) {
    it(`monta o prompt de sistema de ${setting.name} com os catálogos`, () => {
      const prompt = buildSystemPrompt(setting);
      assert.ok(prompt.length > 500, 'prompt curto demais para conduzir uma mesa');
      // Os ids precisam estar no prompt: sem eles o modelo não consegue
      // chamar ferramenta nenhuma sem inventar identificador.
      for (const entry of setting.bestiary.slice(0, 3)) {
        assert.ok(prompt.includes(entry.id), `id ausente do prompt: ${entry.id}`);
      }
      for (const location of setting.locations.slice(0, 3)) {
        assert.ok(prompt.includes(location.id), `local ausente do prompt: ${location.id}`);
      }
    });

    it(`monta o contexto de turno de ${setting.name}`, () => {
      const context = buildTurnContext(fakeTable(setting.id), setting);
      assert.ok(context.includes('Cena atual'));
      assert.ok(context.length > 50);
    });
  }
});
