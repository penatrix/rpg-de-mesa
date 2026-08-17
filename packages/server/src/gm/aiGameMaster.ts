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
        // Uma narração de mesa cabe folgada aqui. Teto alto não melhora a
        // narração — só remove o freio quando o modelo resolve divagar, e a
        // saída é o token mais caro da conta.
        max_tokens: config.gmMaxTokens,
        // Pensamento estendido fica desligado por padrão: narrar três frases e
        // chamar `damage` não é um problema de raciocínio, e o pensamento é
        // cobrado como saída. `RPG_GM_THINKING=1` liga para mesas que preferem
        // combates mais bem calibrados ao custo menor.
        //
        // Os `as` abaixo não são gambiarra de conveniência: a API aceita
        // `adaptive` e os níveis `xhigh`/`max`, mas os tipos publicados nesta
        // versão do SDK ainda descrevem só `enabled`/`disabled` e até `high`.
        // Remova os casts quando o SDK alcançar a API.
        ...(config.gmThinking
          ? {
              thinking: { type: 'adaptive' } as unknown as {
                type: 'enabled';
                budget_tokens: number;
              },
            }
          : {}),
        output_config: { effort: config.gmEffort as 'low' | 'medium' | 'high' },
        system: [
          {
            type: 'text',
            text: this.systemFor(setting),
            // O prefixo (cânone + catálogos + campanha) é idêntico em todos os
            // turnos desta ambientação. O ponto de corte fica *depois* das
            // ferramentas na ordem do prompt, então marcar aqui cacheia as duas
            // coisas de uma vez.
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: buildGmTools(table, setting),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${buildTurnContext(table, setting)}\n\n# Turno\n${playerPrompt}`,
                // Segundo ponto de corte, e o que mais economiza dentro de um
                // turno: o executor de ferramentas faz uma chamada por
                // ferramenta, sempre com este mesmo texto na frente. Sem esta
                // marca, um turno com seis ferramentas reenviaria o contexto
                // inteiro seis vezes a preço cheio.
                cache_control: { type: 'ephemeral' },
              },
            ],
          },
        ],
        max_iterations: config.gmMaxIterations,
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

        // Contabiliza antes de qualquer outra coisa: a chamada já foi feita e
        // já foi cobrada, mesmo que o resto deste turno falhe.
        tables.recordAiUsage(table, {
          inputTokens: message.usage.input_tokens ?? 0,
          outputTokens: message.usage.output_tokens ?? 0,
          cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
        });

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
