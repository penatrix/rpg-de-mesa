import 'dotenv/config';

export type GmEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const EFFORTS: GmEffort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

function parseEffort(raw: string | undefined): GmEffort {
  const value = (raw ?? 'medium').toLowerCase();
  return (EFFORTS as string[]).includes(value) ? (value as GmEffort) : 'medium';
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  dbPath: process.env.RPG_DB_PATH ?? './data/rpg.db',

  anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
  gmModel: process.env.RPG_GM_MODEL?.trim() || 'claude-opus-5',
  /**
   * "medium" equilibra qualidade narrativa e latência: numa mesa, um Mestre que
   * demora 40 segundos para responder quebra o ritmo mais do que uma narração
   * um pouco menos elaborada.
   */
  gmEffort: parseEffort(process.env.RPG_GM_EFFORT),

  /** Mesas sem atividade por este tempo são descarregadas da memória. */
  tableIdleMs: 1000 * 60 * 60 * 6,
  /** Entradas de log mantidas em memória por mesa. */
  logWindow: 400,

  isDev: process.env.NODE_ENV !== 'production',
} as const;

/** O Mestre IA só existe se houver chave. Sem ela, cai no Mestre Offline. */
export const aiAvailable = (): boolean => Boolean(config.anthropicApiKey);
