/**
 * Ferramentas do Mestre IA.
 *
 * Cada ferramenta é um invólucro fino sobre uma função do gerenciador de mesas —
 * exatamente as mesmas que o Mestre humano aciona pelo painel. A IA não tem
 * nenhum poder extra: se uma ação não existe aqui, ela não pode ser feita, e a
 * validação de ids acontece no gerenciador, não na confiança do modelo.
 */

import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

import type { SettingDefinition, TableState } from '@rpg/shared';
import { averageOf } from '@rpg/shared';

import * as tables from '../tables.js';

/** Toda ferramenta devolve texto: é o que o modelo lê como resultado. */
type ToolResult = string;

function fail(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  // Devolver o erro como resultado (em vez de lançar) deixa o modelo corrigir
  // o id errado no próximo passo em vez de abortar o turno inteiro.
  return `ERRO: ${message}`;
}

export function buildGmTools(table: TableState, setting: SettingDefinition) {
  const vitalIds = setting.characterModel.vitals.map((v) => v.id);
  const attributeIds = setting.characterModel.attributes.map((a) => a.id);

  return [
    betaZodTool({
      name: 'roll_dice',
      description:
        'Rola dados em notação padrão (ex.: "2d6+3", "1d20", "4d6kh3"). Use para dano, tabelas ' +
        'aleatórias e decisões do mundo. Para testes de personagem prefira request_check.',
      inputSchema: z.object({
        notation: z.string().describe('Notação de dados, ex.: "3d10+5".'),
        label: z.string().describe('O que está sendo rolado, ex.: "Dano do sopro do dragão".'),
        secret: z
          .boolean()
          .optional()
          .describe('Se verdadeiro, só o Mestre vê o resultado. Use para rolagens de emboscada.'),
      }),
      run: async ({ notation, label, secret }) => {
        try {
          const result = tables.gmRoll(table, notation, label, secret ?? false);
          return `${label}: ${notation} → ${result.total} (dados: ${result.dice
            .filter((d) => !d.dropped)
            .map((d) => d.value)
            .join(', ')})`;
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'request_check',
      description:
        'Pede um teste de atributo a um personagem do grupo e resolve a rolagem. Use sempre que ' +
        'uma ação declarada tiver resultado incerto. Não decida o resultado por conta própria.',
      inputSchema: z.object({
        character_id: z.string().describe('Id ou nome do personagem.'),
        attribute_id: z.string().describe(`Um de: ${attributeIds.join(', ')}.`),
        difficulty: z
          .number()
          .int()
          .describe(
            `Dificuldade alvo. Referência: ${setting.rules.difficulties
              .map((d) => `${d.name}=${d.value}`)
              .join(', ')}.`,
          ),
        label: z.string().optional().describe('O que está sendo testado.'),
        advantage: z
          .enum(['none', 'advantage', 'disadvantage'])
          .optional()
          .describe('Vantagem quando a situação favorece; desvantagem quando atrapalha.'),
      }),
      run: async ({ character_id, attribute_id, difficulty, label, advantage }) => {
        try {
          const result = tables.gmCheck(table, {
            characterId: character_id,
            attributeId: attribute_id,
            difficulty,
            label,
            advantage,
          });
          return (
            `${result.characterName}: ${result.roll.total} contra ${difficulty} → ${result.degree} ` +
            `(margem ${result.roll.check?.margin ?? 0}). Narre a consequência.`
          );
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'set_scene',
      description:
        'Muda a cena atual: título, descrição, local e trilha sonora. Chame ao mover o grupo para ' +
        'um novo lugar ou quando o clima da cena mudar.',
      inputSchema: z.object({
        title: z.string().describe('Título curto da cena.'),
        description: z.string().describe('Descrição do que o grupo vê e sente agora.'),
        location_id: z.string().optional().describe('Id de local do catálogo.'),
        track_id: z.string().optional().describe('Id de trilha. Se omitido, usa a do local.'),
      }),
      run: async ({ title, description, location_id, track_id }) => {
        try {
          const scene = tables.setScene(table, {
            title,
            description,
            locationId: location_id,
            trackId: track_id,
          });
          return `Cena definida: "${scene.title}"${scene.trackId ? ` (trilha: ${scene.trackId})` : ''}.`;
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'spawn_creature',
      description:
        'Coloca criaturas do bestiário em cena. Use antes de start_combat. Calibre pela ameaça ' +
        'da criatura contra o nível do grupo.',
      inputSchema: z.object({
        bestiary_id: z.string().describe('Id do bestiário.'),
        count: z.number().int().min(1).max(12).describe('Quantas criaturas (1 a 12).'),
      }),
      run: async ({ bestiary_id, count }) => {
        try {
          const spawned = tables.spawnCreatures(table, bestiary_id, count);
          const entry = setting.bestiary.find((b) => b.id === bestiary_id);
          const ids = table.scene.combatants
            .filter((c) => c.bestiaryId === bestiary_id)
            .map((c) => `${c.name} (id: ${c.id})`)
            .join(', ');
          return `${spawned}× ${entry?.name} em cena. Combatentes: ${ids}`;
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'damage',
      description:
        'Aplica dano a um combatente. Chame sempre que narrar um golpe que acerta — narrar sem ' +
        'chamar deixa a ficha desatualizada.',
      inputSchema: z.object({
        combatant_id: z.string().describe('Id ou nome do combatente em cena.'),
        vital_id: z.string().describe(`Um de: ${vitalIds.join(', ')}.`),
        amount: z.number().int().min(0).describe('Quantidade de dano.'),
      }),
      run: async ({ combatant_id, vital_id, amount }) => {
        try {
          const result = tables.damageCombatant(table, combatant_id, vital_id, amount);
          return `${result.name} sofreu ${result.applied}${result.downed ? ' e caiu' : ''}.`;
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'heal',
      description: 'Restaura um vital de um combatente (cura, poção, descanso).',
      inputSchema: z.object({
        combatant_id: z.string().describe('Id ou nome do combatente.'),
        vital_id: z.string().describe(`Um de: ${vitalIds.join(', ')}.`),
        amount: z.number().int().min(0).describe('Quantidade restaurada.'),
      }),
      run: async ({ combatant_id, vital_id, amount }) => {
        try {
          const result = tables.healCombatant(table, combatant_id, vital_id, amount);
          return `${result.name} recuperou ${result.applied}.`;
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'start_combat',
      description:
        'Inicia o combate e rola iniciativa para todos em cena. Chame depois de spawn_creature.',
      inputSchema: z.object({}),
      run: async () => {
        try {
          const scene = tables.startCombat(table);
          const order = scene.turnOrder
            .map((id) => scene.combatants.find((c) => c.id === id)?.name ?? id)
            .join(' → ');
          return `Combate iniciado. Ordem: ${order}.`;
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'next_turn',
      description: 'Passa para o próximo combatente na ordem de iniciativa.',
      inputSchema: z.object({}),
      run: async () => {
        try {
          const scene = tables.nextTurn(table);
          const active = scene.combatants.find((c) => c.id === scene.activeTurn);
          return `Agora é a vez de ${active?.name ?? 'alguém'}.`;
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'end_combat',
      description: 'Encerra o combate. Chame quando um dos lados cair, fugir ou se render.',
      inputSchema: z.object({}),
      run: async () => {
        try {
          tables.endCombat(table);
          return 'Combate encerrado. Lembre de conceder experiência com grant_xp.';
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'grant_xp',
      description:
        'Concede experiência a um personagem. Sobe de nível automaticamente quando a curva ' +
        'permitir. Use ao superar combates, enigmas e cenas importantes.',
      inputSchema: z.object({
        character_id: z.string().describe('Id ou nome do personagem.'),
        amount: z.number().int().min(0).describe('Experiência concedida.'),
      }),
      run: async ({ character_id, amount }) => {
        try {
          return tables.grantXp(table, character_id, amount);
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'give_item',
      description: 'Entrega um item do catálogo a um personagem (loot, recompensa, compra).',
      inputSchema: z.object({
        character_id: z.string().describe('Id ou nome do personagem.'),
        item_id: z.string().describe('Id do item no catálogo.'),
        quantity: z.number().int().min(1).max(999).describe('Quantidade.'),
      }),
      run: async ({ character_id, item_id, quantity }) => {
        try {
          return tables.giveItem(table, character_id, item_id, quantity);
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'set_music',
      description:
        'Troca a trilha sonora da mesa para acompanhar o clima. Passe null para silenciar.',
      inputSchema: z.object({
        track_id: z.string().nullable().describe('Id da trilha, ou null para silêncio.'),
      }),
      run: async ({ track_id }) => {
        try {
          tables.setMusic(table, track_id);
          return track_id ? `Trilha: ${track_id}.` : 'Trilha silenciada.';
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'lookup',
      description:
        'Consulta a ficha completa de uma criatura, item, magia ou local do catálogo. Os catálogos ' +
        'no seu contexto trazem só id e nome — use isto quando precisar dos números.',
      inputSchema: z.object({
        kind: z.enum(['creature', 'item', 'ability', 'location']),
        id: z.string().describe('Id do catálogo.'),
      }),
      run: async ({ kind, id }) => {
        try {
          switch (kind) {
            case 'creature': {
              const entry = setting.bestiary.find((b) => b.id === id);
              if (!entry) return `ERRO: criatura desconhecida: ${id}`;
              return JSON.stringify(
                {
                  ...entry,
                  attacks: entry.attacks.map((a) => ({ ...a, mediaDano: averageOf(a.damage || '0') })),
                },
                null,
                1,
              );
            }
            case 'item': {
              const entry = setting.items.find((i) => i.id === id);
              return entry ? JSON.stringify(entry, null, 1) : `ERRO: item desconhecido: ${id}`;
            }
            case 'ability': {
              const entry = setting.abilities.find((a) => a.id === id);
              return entry ? JSON.stringify(entry, null, 1) : `ERRO: habilidade desconhecida: ${id}`;
            }
            case 'location': {
              const entry = setting.locations.find((l) => l.id === id);
              return entry ? JSON.stringify(entry, null, 1) : `ERRO: local desconhecido: ${id}`;
            }
          }
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'private_note',
      description:
        'Registra uma nota visível apenas para o Mestre — planos, segredos, o que a emboscada ' +
        'está esperando. Os jogadores nunca veem isto.',
      inputSchema: z.object({
        text: z.string().describe('A nota.'),
      }),
      run: async ({ text }) => {
        try {
          tables.narrate(table, text, true);
          return 'Nota registrada (apenas Mestre).';
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'update_chronicle',
      description:
        'Atualiza o resumo da campanha — sua memória de longo prazo. O histórico de mensagens é ' +
        'truncado a cada turno; a crônica não. Registre decisões, promessas, mortes e pistas ' +
        'importantes. Reescreva o resumo inteiro, não apenas o acréscimo.',
      inputSchema: z.object({
        summary: z.string().describe('Resumo completo e atualizado da campanha até aqui.'),
      }),
      run: async ({ summary }) => {
        try {
          tables.updateChronicle(table, summary);
          return 'Crônica atualizada.';
        } catch (error) {
          return fail(error);
        }
      },
    }),
  ];
}
