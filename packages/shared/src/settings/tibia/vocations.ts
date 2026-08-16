import type { AttributeDef, ClassDef, OriginDef, RulesDef, VitalDef } from '../types.js';

/**
 * Modelo de personagem de Tibia.
 *
 * Em vez de importar Força/Destreza/Constituição de outros sistemas, os
 * atributos *são* as perícias de Tibia — é o que torna a ficha reconhecível
 * para quem conhece o jogo.
 */
export const tibiaAttributes: AttributeDef[] = [
  {
    id: 'sword',
    name: 'Espada',
    abbreviation: 'ESP',
    description: 'Perícia com lâminas retas: espadas curtas, sabres, espadas longas.',
    base: 10,
    min: 0,
    max: 130,
    primary: true,
  },
  {
    id: 'axe',
    name: 'Machado',
    abbreviation: 'MAC',
    description: 'Perícia com machados, alabardas e machadinhas de arremesso.',
    base: 10,
    min: 0,
    max: 130,
    primary: true,
  },
  {
    id: 'club',
    name: 'Clava',
    abbreviation: 'CLV',
    description: 'Perícia com maças, martelos e bastões pesados.',
    base: 10,
    min: 0,
    max: 130,
    primary: true,
  },
  {
    id: 'distance',
    name: 'Distância',
    abbreviation: 'DIS',
    description: 'Perícia com arcos, bestas e armas de arremesso.',
    base: 10,
    min: 0,
    max: 130,
    primary: true,
  },
  {
    id: 'shielding',
    name: 'Escudo',
    abbreviation: 'ESC',
    description: 'Habilidade de aparar golpes e absorver impacto com escudo.',
    base: 10,
    min: 0,
    max: 130,
  },
  {
    id: 'magic',
    name: 'Magia',
    abbreviation: 'MAG',
    description: 'Domínio das palavras de poder. Governa potência e alcance das magias.',
    base: 0,
    min: 0,
    max: 130,
    primary: true,
  },
  {
    id: 'fist',
    name: 'Punho',
    abbreviation: 'PUN',
    description: 'Combate desarmado — o recurso de quem perdeu a arma.',
    base: 10,
    min: 0,
    max: 130,
  },
  {
    id: 'fishing',
    name: 'Pesca',
    abbreviation: 'PES',
    description: 'Pescar, navegar correntes e ler as marés.',
    base: 10,
    min: 0,
    max: 130,
  },
];

export const tibiaVitals: VitalDef[] = [
  {
    id: 'hp',
    name: 'Vida',
    abbreviation: 'HP',
    description: 'Quanto castigo o corpo aguenta antes de cair.',
    colorToken: 'hp',
    formula: { base: 150, perLevel: 15 },
  },
  {
    id: 'mana',
    name: 'Mana',
    abbreviation: 'MP',
    description: 'Energia arcana que alimenta as palavras de poder.',
    colorToken: 'mana',
    formula: { base: 55, perLevel: 5, fromAttribute: { attributeId: 'magic', multiplier: 3 } },
  },
];

export const tibiaVocations: ClassDef[] = [
  {
    id: 'knight',
    name: 'Cavaleiro',
    tagline: 'A parede entre o grupo e a morte.',
    description:
      'Treinado nos pátios de Thais para aguentar o que ninguém mais aguenta. O Cavaleiro ' +
      'não é o que mata mais rápido — é o que ainda está de pé quando o resto já caiu. Vive ' +
      'de aço, escudo e teimosia; mana, para ele, é quase uma lembrança.',
    attributeModifiers: { sword: 5, axe: 5, club: 5, shielding: 8, fist: 3, magic: 0, distance: -2 },
    vitalMultipliers: { hp: 1.6, mana: 0.35 },
    startingAbilities: ['exura', 'exori-ico', 'utevo-lux'],
    startingItems: ['jagged-sword', 'wooden-shield', 'leather-armor', 'health-potion'],
    promotion: {
      atLevel: 20,
      name: 'Cavaleiro de Elite',
      description:
        'Reconhecido pela Ordem. A resistência aumenta e golpes em área passam a estar ao alcance.',
    },
    icon: '🛡️',
  },
  {
    id: 'paladin',
    name: 'Paladino',
    tagline: 'Morte precisa, a trinta passos de distância.',
    description:
      'Caçador e devoto em partes iguais. O Paladino resolve a briga antes de ela chegar perto: ' +
      'arco, besta, azagaia. Onde o Cavaleiro absorve e o Feiticeiro incinera, o Paladino escolhe ' +
      'o ângulo — e raramente erra duas vezes.',
    attributeModifiers: { distance: 12, shielding: 3, sword: 2, magic: 4, fishing: 3 },
    vitalMultipliers: { hp: 1.15, mana: 0.75 },
    startingAbilities: ['exura', 'utani-hur', 'exevo-con', 'utevo-lux'],
    startingItems: ['bow', 'arrow-bundle', 'studded-armor', 'health-potion'],
    promotion: {
      atLevel: 20,
      name: 'Paladino Real',
      description: 'Juramento à coroa. Munição conjurada e disparos que atravessam fileiras.',
    },
    icon: '🏹',
  },
  {
    id: 'sorcerer',
    name: 'Feiticeiro',
    tagline: 'Fogo primeiro, perguntas nunca.',
    description:
      'Estudou até onde o estudo aguenta e depois seguiu adiante mesmo assim. O Feiticeiro ' +
      'converte mana em destruição com uma eficiência que assusta os próprios colegas de Edron. ' +
      'Frágil de corpo — o que sobra em poder falta em pele.',
    attributeModifiers: { magic: 14, sword: -2, axe: -2, club: -2, shielding: -3 },
    vitalMultipliers: { hp: 0.7, mana: 1.7 },
    startingAbilities: ['exura', 'exori-flam', 'utevo-lux', 'utamo-vita', 'exevo-flam-hur'],
    startingItems: ['wand-of-vortex', 'magician-hat', 'mana-potion', 'mana-potion'],
    promotion: {
      atLevel: 20,
      name: 'Mestre Feiticeiro',
      description: 'Domínio pleno das palavras. Regeneração de mana acelerada e magias de área maiores.',
    },
    icon: '🔥',
  },
  {
    id: 'druid',
    name: 'Druida',
    tagline: 'Cura quem merece, congela quem não.',
    description:
      "Formado nos círculos élficos de Ab'Dendriel. O Druida mantém o grupo vivo — e quando " +
      'a paciência acaba, o gelo desce. É o mais versátil dos quatro e, numa mesa, quase sempre o ' +
      'que decide se a expedição volta inteira.',
    attributeModifiers: { magic: 13, club: 2, shielding: -1, fishing: 5 },
    vitalMultipliers: { hp: 0.8, mana: 1.6 },
    startingAbilities: ['exura', 'exura-gran', 'exori-frigo', 'utevo-lux', 'exana-pox'],
    startingItems: ['snakebite-rod', 'druid-robe', 'mana-potion', 'health-potion'],
    promotion: {
      atLevel: 20,
      name: 'Druida Ancião',
      description: 'Comunhão profunda com a natureza. Curas em área e convocação de raízes.',
    },
    icon: '🌿',
  },
  {
    id: 'novice',
    name: 'Sem Vocação',
    tagline: 'Rookgaard não pergunta o que você quer ser.',
    description:
      'Todo mundo começa aqui. Sem vocação declarada, sem promoção, sem magia decente — só um ' +
      'porrete, um par de botas e a ilha. Escolha uma vocação ao chegar ao nível 8 e pegue o ' +
      'barco para o continente.',
    attributeModifiers: {},
    vitalMultipliers: { hp: 1, mana: 0.5 },
    startingAbilities: ['exura'],
    startingItems: ['club', 'leather-helmet'],
    icon: '🪵',
  },
];

export const tibiaOrigins: OriginDef[] = [
  {
    id: 'rookgaard-born',
    name: 'Nascido em Rookgaard',
    description: 'Cresceu na ilha-escola. Aprendeu a economizar cada poção antes de aprender a lutar.',
    attributeModifiers: { fist: 3, fishing: 3 },
  },
  {
    id: 'thais-citizen',
    name: 'Cidadão de Thais',
    description: 'Criado à sombra do castelo do Rei Tibianus. Conhece as ruas e a guarda.',
    attributeModifiers: { sword: 3, shielding: 2 },
  },
  {
    id: 'carlin-guard',
    name: 'Guarda de Carlin',
    description: 'Serviu à cidade das mulheres livres no norte gelado. Disciplina de aço.',
    attributeModifiers: { axe: 3, shielding: 3 },
  },
  {
    id: 'kazordoon-forged',
    name: 'Forjado em Kazordoon',
    description: 'Aprendiz nas forjas anãs sob a montanha. Martelo antes de espada.',
    attributeModifiers: { club: 4, fist: 2 },
  },
  {
    id: 'abdendriel-ward',
    name: "Tutelado em Ab'Dendriel",
    description: 'Criado entre os elfos. Passos leves, arco antes de palavras.',
    attributeModifiers: { distance: 4, magic: 2 },
  },
  {
    id: 'edron-scholar',
    name: 'Erudito de Edron',
    description: 'Anos na academia. Sabe a diferença entre "Exori" e um erro fatal.',
    attributeModifiers: { magic: 5 },
  },
  {
    id: 'venore-merchant',
    name: 'Mercador de Venore',
    description: 'Cresceu no pântano dos negócios. Sabe o preço de tudo, inclusive da própria vida.',
    attributeModifiers: { fishing: 4, distance: 2 },
  },
];

export const tibiaRules: RulesDef = {
  checkDice: '1d20',
  // Perícias de Tibia chegam a 100+; dividir por 10 mantém o d20 relevante.
  attributeScaling: 'tenth',
  difficulties: [
    { name: 'Trivial', value: 8 },
    { name: 'Fácil', value: 11 },
    { name: 'Moderada', value: 14 },
    { name: 'Difícil', value: 17 },
    { name: 'Heroica', value: 21 },
    { name: 'Lendária', value: 26 },
  ],
  criticalRange: { successAtOrAbove: 20, failureAtOrBelow: 1 },
  // Curva agressiva, no espírito do Tibia original: os primeiros níveis voam,
  // os altos custam caro.
  experienceCurve: { base: 90, exponent: 2.65 },
  degreeLabels: {
    'critical-failure': 'Desastre',
    failure: 'Falha',
    success: 'Sucesso',
    'critical-success': 'Golpe Perfeito',
  },
};
