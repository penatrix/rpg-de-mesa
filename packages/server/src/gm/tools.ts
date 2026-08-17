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
        'Rola dados ("2d6+3", "4d6kh3"). Dano, tabelas e decisões do mundo. Para testes de ' +
        'personagem use request_check.',
      inputSchema: z.object({
        notation: z.string().describe('Notação, ex.: "3d10+5".'),
        label: z.string().describe('O que está sendo rolado.'),
        secret: z.boolean().optional().describe('Se verdadeiro, só o Mestre vê.'),
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
        'Pede um teste ao jogador. Você NÃO recebe o resultado agora: quem rola é ele. Peça, ' +
        'encerre o turno com a tensão no ar, e narre a consequência quando o dado voltar.',
      inputSchema: z.object({
        character_id: z.string().describe('Id ou nome do personagem.'),
        attribute_id: z.string().describe(`Um de: ${attributeIds.join(', ')}.`),
        difficulty: z
          .number()
          .int()
          .describe(
            `Alvo. ${setting.rules.difficulties.map((d) => `${d.name}=${d.value}`).join(', ')}.`,
          ),
        reason: z.string().describe('O que ele está tentando fazer, em poucas palavras.'),
        advantage: z
          .enum(['none', 'advantage', 'disadvantage'])
          .optional()
          .describe('Vantagem se a situação favorece; desvantagem se atrapalha.'),
      }),
      run: async ({ character_id, attribute_id, difficulty, reason, advantage }) => {
        try {
          const result = tables.requestCheck(table, {
            characterId: character_id,
            attributeId: attribute_id,
            difficulty,
            reason,
            advantage,
          });
          // Deliberadamente não devolve resultado: se devolvesse, o modelo
          // continuaria o turno narrando um desfecho que o jogador não rolou —
          // que é exatamente o problema que esta ferramenta existe para acabar.
          return (
            `Pedido enviado a ${result.characterName} (${result.attributeName} vs ${difficulty}). ` +
            `O dado é dele. Encerre o turno aqui.`
          );
        } catch (error) {
          return fail(error);
        }
      },
    }),

    betaZodTool({
      name: 'set_scene',
      description:
        'Muda a cena: título, descrição, local e trilha. Chame ao mover o grupo ou quando o clima ' +
        'mudar.',
      inputSchema: z.object({
        title: z.string().describe('Título curto.'),
        description: z.string().describe('O que o grupo vê e sente agora.'),
        location_id: z.string().optional().describe('Id de local do catálogo.'),
        track_id: z.string().optional().describe('Id de trilha; padrão é a do local.'),
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
        'Põe criaturas em cena, antes de start_combat. Calibre a ameaça pelo nível do grupo.',
      inputSchema: z.object({
        bestiary_id: z.string().describe('Id do bestiário.'),
        count: z.number().int().min(1).max(12).describe('Quantas (1 a 12).'),
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
        'Aplica dano. Chame sempre que narrar um golpe que acerta — narrar sem chamar deixa a ' +
        'ficha errada.',
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
      description: 'Restaura um vital (cura, poção, descanso).',
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
      description: 'Inicia o combate e rola iniciativa. Chame depois de spawn_creature.',
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
      description: 'Passa a vez ao próximo na iniciativa.',
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
      description: 'Encerra o combate quando um lado cai, foge ou se rende.',
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
        'Concede experiência; o nível sobe sozinho quando a curva permitir. Use ao superar ' +
        'combates, enigmas e cenas importantes.',
      inputSchema: z.object({
        character_id: z.string().describe('Id ou nome do personagem.'),
        amount: z.number().int().min(0).describe('Experiência.'),
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
      description: 'Entrega um item do catálogo (loot, recompensa, compra).',
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
      description: 'Troca a trilha para acompanhar o clima. null silencia.',
      inputSchema: z.object({
        track_id: z.string().nullable().describe('Id da trilha, ou null.'),
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
        'Ficha completa de uma criatura, item, magia ou local. O seu contexto traz só os ids — ' +
        'use isto quando precisar dos números.',
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
        'Nota visível só para você: planos, segredos, o que a emboscada espera.',
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
        'Reescreve o resumo da campanha — sua memória de longo prazo, já que o histórico é ' +
        'truncado a cada turno. Registre decisões, promessas, mortes e pistas. Mande o resumo ' +
        'inteiro, não só o acréscimo.',
      inputSchema: z.object({
        summary: z.string().describe('Resumo completo e atualizado.'),
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
