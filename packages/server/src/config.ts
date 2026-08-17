import 'dotenv/config';

export type GmEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const EFFORTS: GmEffort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

function parseEffort(raw: string | undefined): GmEffort {
  const value = (raw ?? 'low').toLowerCase();
  return (EFFORTS as string[]).includes(value) ? (value as GmEffort) : 'low';
}

function parseNumber(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  return ['1', 'true', 'sim', 'on', 'yes'].includes(raw.trim().toLowerCase());
}

/**
 * Preço por milhão de tokens, em dólares.
 *
 * Serve para *estimar* e mostrar o consumo na mesa, não para faturar: a conta
 * verdadeira é a do painel da Anthropic. Preços mudam — por isso cada um pode
 * ser sobrescrito por variável de ambiente sem alterar código.
 *
 * `cacheWrite` é mais caro que a entrada normal (gravar o prefixo custa a mais)
 * e `cacheRead` é uma fração dela. É essa diferença que torna o cache o maior
 * botão de economia da plataforma.
 */
export interface ModelPricing {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

const PRICE_TABLE: Record<string, ModelPricing> = {
  'claude-opus-5': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-sonnet-5': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

/** Modelo desconhecido: assume o preço do mais caro, para não subestimar a conta. */
const FALLBACK_PRICING: ModelPricing = PRICE_TABLE['claude-opus-5']!;

function pricingFor(model: string): ModelPricing {
  const known = Object.entries(PRICE_TABLE).find(([id]) => model.startsWith(id));
  const base = known?.[1] ?? FALLBACK_PRICING;
  return {
    input: parseNumber(process.env.RPG_PRICE_INPUT, base.input),
    output: parseNumber(process.env.RPG_PRICE_OUTPUT, base.output),
    cacheWrite: parseNumber(process.env.RPG_PRICE_CACHE_WRITE, base.cacheWrite),
    cacheRead: parseNumber(process.env.RPG_PRICE_CACHE_READ, base.cacheRead),
  };
}

const gmModel = process.env.RPG_GM_MODEL?.trim() || 'claude-sonnet-5';

export const config = {
  port: Number(process.env.PORT ?? 8787),
  dbPath: process.env.RPG_DB_PATH ?? './data/rpg.db',

  anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,

  /**
   * Sonnet por padrão, e não Opus.
   *
   * Numa mesa de RPG o Mestre faz muitas chamadas curtas — uma por ferramenta —
   * e a diferença de qualidade narrativa entre os dois não paga a diferença de
   * preço nesse regime. Quem quiser o Opus troca em `RPG_GM_MODEL`.
   */
  gmModel,
  pricing: pricingFor(gmModel),

  /**
   * Esforço baixo por padrão.
   *
   * Narrar 3 frases e chamar `damage` não é um problema de raciocínio. Esforço
   * alto multiplica os tokens de saída — os mais caros da conta — sem melhorar
   * a mesa. Suba para `medium` se quiser combates mais bem calibrados.
   */
  gmEffort: parseEffort(process.env.RPG_GM_EFFORT),

  /** Pensamento estendido: desligado por padrão, pelo mesmo motivo do esforço. */
  gmThinking: parseBoolean(process.env.RPG_GM_THINKING, false),

  /**
   * Teto de saída por chamada.
   *
   * Uma narração de mesa tem 2 a 6 frases. Um teto generoso demais não melhora
   * a narração — só remove o freio quando o modelo resolve divagar.
   */
  gmMaxTokens: Math.round(parseNumber(process.env.RPG_GM_MAX_TOKENS, 1600)),

  /** Ferramentas encadeadas por turno. Cada uma é uma ida e volta à API. */
  gmMaxIterations: Math.round(parseNumber(process.env.RPG_GM_MAX_ITERATIONS, 8)),

  /**
   * Teto de gasto por mesa, em centavos de dólar.
   *
   * Sem isto, uma mesa esquecida aberta é uma conta aberta. Ao atingir o teto o
   * Mestre IA para de responder e a mesa continua jogável com Mestre humano.
   * `0` desliga o teto.
   */
  tableBudgetCents: Math.round(parseNumber(process.env.RPG_TABLE_BUDGET_CENTS, 100)),

  /** Mesas sem atividade por este tempo são descarregadas da memória. */
  tableIdleMs: 1000 * 60 * 60 * 6,
  /** Entradas de log mantidas em memória por mesa. */
  logWindow: 400,
  /** Entradas de log enviadas ao Mestre a cada turno. */
  gmLogWindow: Math.round(parseNumber(process.env.RPG_GM_LOG_WINDOW, 10)),

  isDev: process.env.NODE_ENV !== 'production',
} as const;

/** O Mestre IA só existe se houver chave. Sem ela, cai no Mestre Offline. */
export const aiAvailable = (): boolean => Boolean(config.anthropicApiKey);

/** Custo em centavos de dólar de uma chamada, a partir do uso relatado pela API. */
export function estimateCents(usage: {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}): number {
  const { pricing } = config;
  const dollars =
    (usage.inputTokens * pricing.input +
      usage.outputTokens * pricing.output +
      usage.cacheWriteTokens * pricing.cacheWrite +
      usage.cacheReadTokens * pricing.cacheRead) /
    1_000_000;
  return dollars * 100;
}
