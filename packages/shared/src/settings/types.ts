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

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
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
