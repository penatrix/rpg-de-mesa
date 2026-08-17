/**
 * Contrato de uma ambientação.
 *
 * Uma ambientação é *dados*, não código: descreve o modelo de personagem, o
 * conteúdo (bestiário, locais, itens, magias), o tema visual, a trilha sonora
 * e a persona do Mestre. O motor de regras e a UI leem daqui, então adicionar
 * uma ambientação nova não exige tocar em nenhum dos dois.
 */

import type { CheckDegree } from '../types/core.js';

// ---------------------------------------------------------------------------
// Modelo de personagem
// ---------------------------------------------------------------------------

export interface AttributeDef {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  /** Valor inicial antes dos modificadores de classe. */
  base: number;
  min: number;
  max: number;
  /** Atributos marcados aparecem em destaque na ficha. */
  primary?: boolean;
}

export interface VitalDef {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  /** Cor do medidor na ficha (token CSS do tema). */
  colorToken: string;
  /**
   * Fórmula do máximo: `base + porLevel * (nível - 1) + porAtributo * atributo`.
   * Deliberadamente simples — ambientações mais exóticas podem sobrescrever
   * via `derive` no `progression`.
   */
  formula: {
    base: number;
    perLevel: number;
    fromAttribute?: { attributeId: string; multiplier: number };
  };
}

export interface ClassDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Modificadores somados aos atributos base na criação. */
  attributeModifiers: Record<string, number>;
  /** Multiplicadores aplicados às fórmulas de vitais. */
  vitalMultipliers?: Record<string, number>;
  /** Ids de habilidades concedidas na criação. */
  startingAbilities: string[];
  /** Ids de itens concedidos na criação. */
  startingItems: string[];
  /** Promoção/evolução da classe, quando a ambientação tem uma. */
  promotion?: { atLevel: number; name: string; description: string };
  icon: string;
}

export interface OriginDef {
  id: string;
  name: string;
  description: string;
  attributeModifiers?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Conteúdo
// ---------------------------------------------------------------------------

export type ItemSlot =
  | 'weapon'
  | 'shield'
  | 'armor'
  | 'helmet'
  | 'legs'
  | 'boots'
  | 'ring'
  | 'amulet'
  | 'consumable'
  | 'misc';

/**
 * Silhuetas que o cliente sabe desenhar em SVG.
 *
 * A arte não vem de arquivo: o ícone é vetor desenhado no navegador a partir
 * desta descrição. Além de não custar download, evita usar sprites de jogos
 * comerciais — a arte de Tibia é da CipSoft e não nos pertence.
 */
export type ItemShape =
  | 'sword'
  | 'axe'
  | 'club'
  | 'hammer'
  | 'spear'
  | 'bow'
  | 'crossbow'
  | 'arrow'
  | 'wand'
  | 'rod'
  | 'shield'
  | 'helmet'
  | 'armor'
  | 'legs'
  | 'boots'
  | 'ring'
  | 'amulet'
  | 'potion'
  | 'food'
  | 'coin'
  | 'rope'
  | 'shovel'
  | 'scale'
  | 'bag';

export interface ItemIcon {
  shape: ItemShape;
  /** Cor principal da peça. */
  tint: string;
  /** Cor do detalhe (cabo, fivela, líquido). */
  accent?: string;
  /** Brilho ao redor, para itens mágicos. */
  glow?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
  /** Ícone desenhado na ficha. Quando ausente, é deduzido do id e do slot. */
  icon?: ItemIcon;
  description: string;
  /** Peso em unidades de capacidade da ambientação. */
  weight: number;
  value: number;
  rarity: 'comum' | 'incomum' | 'raro' | 'épico' | 'lendário';
  /** Bônus somados aos atributos enquanto equipado. */
  attributeBonuses?: Record<string, number>;
  /** Dano em notação de dados, para armas. */
  damage?: string;
  /** Redução de dano, para armaduras/escudos. */
  armor?: number;
  /** Efeito ao consumir, para poções. */
  onUse?: { vitalId: string; formula: string };
  /** Requisitos de uso. */
  requires?: { level?: number; classIds?: string[] };
}

export interface AbilityDef {
  id: string;
  name: string;
  /** Palavra de poder / invocação, quando a ambientação usa uma. */
  incantation?: string;
  description: string;
  /** Custo em vitais (ex.: `{ mana: 20 }`). */
  cost: Record<string, number>;
  /** Requisitos para aprender. */
  requires?: { level?: number; classIds?: string[]; attributes?: Record<string, number> };
  /** Efeito mecânico: cura, dano, buff. */
  effect:
    | { kind: 'damage'; formula: string; element?: string; area?: 'single' | 'area' }
    | { kind: 'heal'; vitalId: string; formula: string }
    | { kind: 'buff'; description: string; duration: number }
    | { kind: 'utility'; description: string };
  cooldown?: number;
}

export interface BestiaryEntry {
  id: string;
  name: string;
  description: string;
  /** Nível de ameaça, para o Mestre calibrar encontros. */
  threat: number;
  vitals: Record<string, number>;
  attributes: Record<string, number>;
  /** Ataques disponíveis. */
  attacks: { name: string; damage: string; element?: string; description?: string }[];
  /** Ids de itens que podem cair. Chance de 0 a 1. */
  loot: { itemId: string; chance: number; quantity?: [number, number] }[];
  experience: number;
  /** Ids de locais onde aparece. */
  habitats: string[];
  immunities?: string[];
  weaknesses?: string[];
}

export interface LocationDef {
  id: string;
  name: string;
  /** Local pai (uma cidade contém distritos, uma região contém cidades). */
  parentId?: string;
  kind: 'região' | 'cidade' | 'vila' | 'masmorra' | 'ermo' | 'interior';
  description: string;
  /** Ganchos narrativos que o Mestre pode puxar. */
  hooks: string[];
  /** Id da faixa musical típica do local. */
  trackId?: string;
  /** Nível recomendado para aventurar-se aqui. */
  recommendedLevel?: [number, number];
  npcs?: { name: string; role: string; description: string }[];
}

export interface LoreEntry {
  id: string;
  title: string;
  category: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Tema e áudio
// ---------------------------------------------------------------------------

export interface ThemeDef {
  /** Tokens CSS aplicados na raiz quando a ambientação está ativa. */
  colors: {
    bg: string;
    bgElevated: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accentSoft: string;
    danger: string;
    success: string;
    /** Cores nomeadas para os medidores de vitais. */
    vitals: Record<string, string>;
  };
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  /** Textura de fundo em CSS (gradiente, padrão). Sem imagens externas. */
  backdrop: string;
  /** Raio de borda base, em px. */
  radius: number;
  /** Estilo dos dados 3D/2D no painel de rolagem. */
  diceStyle: 'runic' | 'brass' | 'holographic' | 'bone';
}

/** Formas de onda do Web Audio, redeclaradas aqui para não depender do lib DOM. */
export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface TrackDef {
  id: string;
  name: string;
  /** Clima que a faixa evoca — o Mestre escolhe pelo clima, não pelo nome. */
  mood: 'exploração' | 'cidade' | 'tensão' | 'combate' | 'mistério' | 'descanso' | 'triunfo';
  /**
   * A trilha é sintetizada no navegador (Web Audio), não baixada: uma
   * progressão de acordes e um timbre. Zero dependência de rede ou licença.
   */
  synth: {
    scale: number[];
    root: number;
    tempo: number;
    waveform: Waveform;
    /** Progressão em graus da escala. */
    progression: number[][];
    padLevel: number;
    arpeggio: boolean;
  };
}

// ---------------------------------------------------------------------------
// Regras
// ---------------------------------------------------------------------------

export interface RulesDef {
  /** Notação do dado padrão de testes (ex.: `1d20`, `2d10`). */
  checkDice: string;
  /** Como o atributo entra no teste. */
  attributeScaling: 'flat' | 'half' | 'tenth';
  /** Faixas de dificuldade nomeadas, para o Mestre. */
  difficulties: { name: string; value: number }[];
  /** Resultado do dado que promove a crítico (topo) e a falha crítica (base). */
  criticalRange: { successAtOrAbove: number; failureAtOrBelow: number };
  /** XP necessária para cada nível: `curve(nível)`. */
  experienceCurve: { base: number; exponent: number };
  /** Rótulos exibidos para cada grau de sucesso. */
  degreeLabels: Record<CheckDegree, string>;
}

// ---------------------------------------------------------------------------
// Persona do Mestre
// ---------------------------------------------------------------------------

export interface GameMasterPersona {
  /** Instruções de tom e estilo injetadas no prompt do Mestre IA. */
  voice: string;
  /** Regras rígidas de canon que o Mestre não deve violar. */
  canon: string[];
  /** Cenas de abertura possíveis, uma é escolhida ao criar a mesa. */
  openings: { title: string; locationId?: string; text: string }[];
  /** Frases de exemplo, para calibrar o registro. */
  styleExamples: string[];
}

// ---------------------------------------------------------------------------
// Campanha e companheiros
// ---------------------------------------------------------------------------

/**
 * A campanha padrão da ambientação.
 *
 * Existe para que a mesa comece com *contexto* em vez de um parágrafo solto: o
 * prólogo é lido na abertura, a premissa entra no prompt do Mestre e os atos
 * dão à IA um rumo de longo prazo em vez de improviso a cada turno. Nada disso
 * custa chamada de API — é texto da ambientação.
 */
export interface CampaignDef {
  title: string;
  /** Uma frase: o que está em jogo. */
  premise: string;
  /** Lido na abertura da mesa, parágrafo a parágrafo. */
  prologue: string[];
  /** Rumo de longo prazo. O Mestre avança conforme o grupo sobe de nível. */
  acts: {
    id: string;
    title: string;
    goal: string;
    /** Faixa de níveis em que este ato faz sentido. */
    levels: [number, number];
  }[];
}

/**
 * Companheiro controlado pelo Mestre.
 *
 * Ocupa um assento `npc` na mesa e tem ficha igual à de um jogador. Quem o
 * interpreta é o próprio Mestre, dentro do mesmo turno — não há chamada de API
 * extra por companheiro.
 */
export interface CompanionDef {
  id: string;
  name: string;
  classId: string;
  originId?: string;
  /** Quem é e o que quer. Vai no contexto do turno. */
  personality: string;
  /** Frases típicas, para calibrar a voz. */
  catchphrases: string[];
}

// ---------------------------------------------------------------------------
// A ambientação
// ---------------------------------------------------------------------------

export interface SettingDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** `complete` aparece jogável; `preview` aparece marcada como em construção. */
  status: 'complete' | 'preview';

  theme: ThemeDef;
  tracks: TrackDef[];
  rules: RulesDef;

  characterModel: {
    attributes: AttributeDef[];
    vitals: VitalDef[];
    classes: ClassDef[];
    origins?: OriginDef[];
    /** Pontos livres para distribuir na criação. */
    pointBuy: number;
    /** Capacidade de carga, se a ambientação usa. */
    carryCapacity?: { vitalId?: string; base: number; perLevel: number };
  };

  items: ItemDef[];
  abilities: AbilityDef[];
  bestiary: BestiaryEntry[];
  locations: LocationDef[];
  lore: LoreEntry[];

  gameMaster: GameMasterPersona;
  /** Campanha padrão: prólogo, premissa e atos. */
  campaign?: CampaignDef;
  /** Companheiros que a mesa pode recrutar para assentos vazios. */
  companions?: CompanionDef[];

  /** Vocabulário da ambientação exibido na UI. */
  labels: {
    character: string;
    class: string;
    ability: string;
    bestiary: string;
    currency: string;
    party: string;
  };
}
