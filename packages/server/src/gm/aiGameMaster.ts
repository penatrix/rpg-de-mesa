/**
 * Mestre IA.
 *
 * Conduz um turno de mesa: lê o estado, narra em streaming e muda o mundo pelas
 * ferramentas. A narração é o *texto* que o modelo produz; toda mudança de
 * estado passa pelas ferramentas, que são as mesmas ações do Mestre humano.
 *
 * Sem `ANTHROPIC_API_KEY` a plataforma cai no `OfflineGameMaster` mais abaixo,
 * que mantém a mesa jogável usando só os dados da ambientação.
 */

import { randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

import type { SettingDefinition, TableState } from '@rpg/shared';

import { config } from '../config.js';
import * as tables from '../tables.js';
import { buildSystemPrompt, buildTurnContext } from './prompts.js';
import { buildGmTools } from './tools.js';

export interface GmHooks {
  /** O Mestre começou/terminou de pensar — alimenta o indicador na UI. */
  thinking(active: boolean): void;
  /** Uma nova narração começou a ser transmitida. */
  narrationStart(entryId: string): void;
  /** Trecho de narração. */
  narrationDelta(entryId: string, text: string): void;
  /** A narração terminou. */
  narrationEnd(entryId: string): void;
}

export interface GameMaster {
  readonly kind: 'ai' | 'offline';
  runTurn(table: TableState, playerPrompt: string, hooks: GmHooks): Promise<void>;
}

/** Um turno de Mestre não deve consumir a mesa inteira em ferramentas. */
const MAX_TOOL_ITERATIONS = 12;

export class AiGameMaster implements GameMaster {
  readonly kind = 'ai' as const;
  private readonly client: Anthropic;
  /** O prompt de sistema é estável por ambientação — memoriza para reaproveitar. */
  private readonly systemCache = new Map<string, string>();

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private systemFor(setting: SettingDefinition): string {
    let cached = this.systemCache.get(setting.id);
    if (!cached) {
      cached = buildSystemPrompt(setting);
      this.systemCache.set(setting.id, cached);
    }
    return cached;
  }

  async runTurn(table: TableState, playerPrompt: string, hooks: GmHooks): Promise<void> {
    const setting = tables.settingOf(table);
    hooks.thinking(true);

    try {
      const runner = this.client.beta.messages.toolRunner({
        model: config.gmModel,
        max_tokens: 16000,
        // O pensamento adaptativo deixa o modelo decidir quanto raciocinar por
        // turno: uma pergunta simples responde rápido, um combate complexo pensa.
        //
        // Os dois `as` abaixo não são gambiarra de conveniência: a API aceita
        // `adaptive` e os níveis `xhigh`/`max`, mas os tipos publicados nesta
        // versão do SDK ainda descrevem só `enabled`/`disabled` e até `high`.
        // Remova os casts quando o SDK alcançar a API.
        thinking: { type: 'adaptive' } as unknown as { type: 'enabled'; budget_tokens: number },
        output_config: { effort: config.gmEffort as 'low' | 'medium' | 'high' },
        system: [
          {
            type: 'text',
            text: this.systemFor(setting),
            // O prefixo (cânone + catálogos) é idêntico em todos os turnos desta
            // ambientação. Marcá-lo aqui faz o custo cair para leitura de cache
            // a partir do segundo turno.
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: buildGmTools(table, setting),
        messages: [
          {
            role: 'user',
            content: `${buildTurnContext(table, setting)}\n\n# Turno\n${playerPrompt}`,
          },
        ],
        max_iterations: MAX_TOOL_ITERATIONS,
        stream: true,
      });

      for await (const stream of runner) {
        let entryId: string | undefined;
        let buffer = '';

        stream.on('text', (delta) => {
          if (!entryId) {
            // A entrada de log nasce vazia e cresce com os deltas: os jogadores
            // veem a narração aparecendo em vez de esperarem o turno inteiro.
            entryId = randomUUID();
            tables.appendLog(table, {
              id: entryId,
              kind: 'narration',
              authorId: 'gm',
              authorName: 'Mestre',
              text: '',
              gmOnly: false,
              streaming: true,
            });
            hooks.narrationStart(entryId);
          }
          buffer += delta;
          hooks.narrationDelta(entryId, delta);
        });

        const message = await stream.finalMessage();

        if (entryId) {
          tables.finalizeLogEntry(table, entryId, buffer);
          hooks.narrationEnd(entryId);
        }

        // Ferramentas de servidor podem pausar o turno; sem elas aqui isso não
        // deve acontecer, mas registrar evita um silêncio inexplicável na mesa.
        if (message.stop_reason === 'pause_turn') {
          tables.appendLog(table, {
            kind: 'system',
            authorId: 'system',
            authorName: 'Sistema',
            text: 'O turno do Mestre foi pausado pelo provedor. Peça para continuar.',
            gmOnly: true,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      tables.appendLog(table, {
        kind: 'system',
        authorId: 'system',
        authorName: 'Sistema',
        text: `O Mestre IA falhou neste turno: ${message}`,
        gmOnly: false,
      });
      throw error;
    } finally {
      hooks.thinking(false);
    }
  }
}

/**
 * Mestre Offline.
 *
 * Sem chave de API a mesa continua jogável: este Mestre monta a narração a
 * partir dos ganchos, locais e bestiário da própria ambientação. Não é um
 * Mestre criativo — é um Mestre suficiente para testar o sistema e para jogar
 * com um humano conduzindo por cima.
 */
export class OfflineGameMaster implements GameMaster {
  readonly kind = 'offline' as const;

  async runTurn(table: TableState, playerPrompt: string, hooks: GmHooks): Promise<void> {
    const setting = tables.settingOf(table);
    hooks.thinking(true);

    try {
      const location = table.scene.locationId
        ? setting.locations.find((l) => l.id === table.scene.locationId)
        : undefined;

      const lines: string[] = [];
      lines.push(`Vocês declaram: "${playerPrompt.trim().slice(0, 200)}".`);

      if (location && location.hooks.length > 0) {
        const hook = location.hooks[Math.floor(Math.random() * location.hooks.length)]!;
        lines.push(hook);
      } else {
        lines.push('O mundo espera a próxima decisão de vocês.');
      }

      if (table.scene.inCombat) {
        const hostiles = table.scene.combatants.filter((c) => c.hostile);
        if (hostiles.length > 0) {
          lines.push(`${hostiles.map((c) => c.name).join(', ')} ainda ${hostiles.length > 1 ? 'estão' : 'está'} de pé.`);
        }
      }

      lines.push(
        '(Mestre Offline: defina ANTHROPIC_API_KEY para habilitar o Mestre IA, ' +
          'ou passe o comando da mesa a um Mestre humano.)',
      );

      const text = lines.join(' ');
      const entryId = randomUUID();

      tables.appendLog(table, {
        id: entryId,
        kind: 'narration',
        authorId: 'gm',
        authorName: 'Mestre (offline)',
        text: '',
        gmOnly: false,
        streaming: true,
      });
      hooks.narrationStart(entryId);

      // Emite em pedaços para exercitar o mesmo caminho de streaming da UI.
      for (const chunk of text.match(/.{1,24}/g) ?? [text]) {
        hooks.narrationDelta(entryId, chunk);
        await new Promise((resolve) => setTimeout(resolve, 18));
      }

      tables.finalizeLogEntry(table, entryId, text);
      hooks.narrationEnd(entryId);
    } finally {
      hooks.thinking(false);
    }
  }
}

let instance: GameMaster | undefined;

export function getGameMaster(): GameMaster {
  if (!instance) {
    instance = config.anthropicApiKey
      ? new AiGameMaster(config.anthropicApiKey)
      : new OfflineGameMaster();
  }
  return instance;
}
