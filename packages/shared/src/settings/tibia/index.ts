import type { SettingDefinition } from '../types.js';
import { tibiaTheme, tibiaTracks } from './theme.js';
import {
  tibiaAttributes,
  tibiaOrigins,
  tibiaRules,
  tibiaVitals,
  tibiaVocations,
} from './vocations.js';
import { tibiaItems } from './items.js';
import { tibiaSpells } from './spells.js';
import { tibiaBestiary } from './bestiary.js';
import { tibiaLocations } from './locations.js';
import { tibiaGameMaster, tibiaLore } from './lore.js';

export const tibiaSetting: SettingDefinition = {
  id: 'tibia',
  name: 'Tibia',
  tagline: 'Rookgaard não perdoa, e Thais não espera.',
  description:
    'O continente de Tibia: quatro vocações, palavras de poder faladas em voz alta, masmorras que ' +
    'cobram caro e uma morte que custa experiência, itens e orgulho. Comece em Rookgaard com um ' +
    'porrete, pegue o barco para Thais e descubra até onde consegue descer antes de precisar voltar.',
  status: 'complete',

  theme: tibiaTheme,
  tracks: tibiaTracks,
  rules: tibiaRules,

  characterModel: {
    attributes: tibiaAttributes,
    vitals: tibiaVitals,
    classes: tibiaVocations,
    origins: tibiaOrigins,
    pointBuy: 12,
    carryCapacity: { base: 40, perLevel: 10 },
  },

  items: tibiaItems,
  abilities: tibiaSpells,
  bestiary: tibiaBestiary,
  locations: tibiaLocations,
  lore: tibiaLore,

  gameMaster: tibiaGameMaster,

  labels: {
    character: 'Personagem',
    class: 'Vocação',
    ability: 'Magia',
    bestiary: 'Bestiário',
    currency: 'moedas de ouro',
    party: 'Grupo',
  },
};
