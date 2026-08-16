import type { ThemeDef, TrackDef } from '../types.js';

/**
 * Tema de Tibia: pedra, tocha e pergaminho. Paleta quente e escura, tipografia
 * serifada, sem imagens externas (só gradientes CSS).
 */
export const tibiaTheme: ThemeDef = {
  colors: {
    bg: '#12100c',
    bgElevated: '#1c1813',
    surface: '#262019',
    border: '#463a2a',
    text: '#eadfc8',
    textMuted: '#a2907040',
    accent: '#d9a441',
    accentSoft: '#8a6a2a',
    danger: '#c0392b',
    success: '#6f9b48',
    vitals: {
      hp: '#c0392b',
      mana: '#3d6fb4',
    },
  },
  fonts: {
    display: "'Cinzel', 'Georgia', 'Times New Roman', serif",
    body: "'Georgia', 'Iowan Old Style', serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
  },
  backdrop:
    'radial-gradient(1200px 700px at 50% -10%, #2b2318 0%, #12100c 60%), repeating-linear-gradient(115deg, rgba(255,255,255,0.014) 0 2px, transparent 2px 7px)',
  radius: 4,
  diceStyle: 'runic',
};

/**
 * Trilha sintetizada no navegador via Web Audio — nenhum arquivo de áudio,
 * nenhuma licença, nenhum download. Cada faixa é uma escala, uma progressão
 * de acordes e um timbre.
 */
export const tibiaTracks: TrackDef[] = [
  {
    id: 'rookgaard-dawn',
    name: 'Alvorada em Rookgaard',
    mood: 'exploração',
    synth: {
      // Modo dórico em Ré — o ar de folk medieval sem soar melancólico demais.
      scale: [0, 2, 3, 5, 7, 9, 10],
      root: 146.83,
      tempo: 72,
      waveform: 'triangle',
      progression: [
        [0, 2, 4],
        [5, 0, 2],
        [3, 5, 0],
        [4, 6, 1],
      ],
      padLevel: 0.16,
      arpeggio: true,
    },
  },
  {
    id: 'thais-market',
    name: 'O Mercado de Thais',
    mood: 'cidade',
    synth: {
      scale: [0, 2, 4, 5, 7, 9, 11],
      root: 196.0,
      tempo: 96,
      waveform: 'triangle',
      progression: [
        [0, 2, 4],
        [3, 5, 0],
        [4, 6, 1],
        [0, 2, 4],
      ],
      padLevel: 0.12,
      arpeggio: true,
    },
  },
  {
    id: 'deep-mines',
    name: 'Nas Minas Profundas',
    mood: 'mistério',
    synth: {
      // Frígio: o meio-tom inicial é o que dá o desconforto.
      scale: [0, 1, 3, 5, 7, 8, 10],
      root: 110.0,
      tempo: 54,
      waveform: 'sine',
      progression: [
        [0, 2, 4],
        [1, 3, 5],
        [0, 2, 4],
        [6, 1, 3],
      ],
      padLevel: 0.22,
      arpeggio: false,
    },
  },
  {
    id: 'blade-and-blood',
    name: 'Lâmina e Sangue',
    mood: 'combate',
    synth: {
      scale: [0, 1, 3, 5, 6, 8, 10],
      root: 98.0,
      tempo: 148,
      waveform: 'sawtooth',
      progression: [
        [0, 3, 4],
        [0, 3, 4],
        [5, 1, 3],
        [4, 0, 2],
      ],
      padLevel: 0.1,
      arpeggio: true,
    },
  },
  {
    id: 'dragon-lair',
    name: 'O Covil do Dragão',
    mood: 'tensão',
    synth: {
      scale: [0, 1, 4, 5, 7, 8, 11],
      root: 87.31,
      tempo: 64,
      waveform: 'sawtooth',
      progression: [
        [0, 2, 4],
        [4, 6, 1],
        [0, 3, 5],
        [1, 4, 6],
      ],
      padLevel: 0.26,
      arpeggio: false,
    },
  },
  {
    id: 'temple-rest',
    name: 'Repouso no Templo',
    mood: 'descanso',
    synth: {
      scale: [0, 2, 4, 7, 9],
      root: 261.63,
      tempo: 48,
      waveform: 'sine',
      progression: [
        [0, 2, 4],
        [3, 0, 2],
        [1, 3, 0],
        [0, 2, 4],
      ],
      padLevel: 0.18,
      arpeggio: true,
    },
  },
  {
    id: 'ferumbras-fall',
    name: 'A Queda de Ferumbras',
    mood: 'triunfo',
    synth: {
      scale: [0, 2, 4, 5, 7, 9, 11],
      root: 174.61,
      tempo: 88,
      waveform: 'triangle',
      progression: [
        [0, 2, 4],
        [4, 6, 1],
        [5, 0, 2],
        [0, 2, 4],
      ],
      padLevel: 0.14,
      arpeggio: true,
    },
  },
];
