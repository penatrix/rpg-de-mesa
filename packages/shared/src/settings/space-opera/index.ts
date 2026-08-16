import type { SettingDefinition } from '../types.js';

/**
 * Space Opera — o Aro Exterior.
 *
 * `status: 'preview'`: tema, regras e modelo de personagem completos e jogáveis;
 * conteúdo em construção. A mecânica distintiva é a Integridade da nave como
 * vital compartilhado pelo grupo.
 */
export const spaceOperaSetting: SettingDefinition = {
  id: 'space-opera',
  name: 'O Aro Exterior',
  tagline: 'Um salto de dobra, e a lei fica para trás.',
  description:
    'Mil anos depois da Diáspora, a humanidade se espalhou por três braços da galáxia e perdeu o ' +
    'contato com metade deles. Vocês tripulam uma nave própria no Aro Exterior, onde a Autoridade ' +
    'não patrulha, os alienígenas Vesh negociam em conceitos e cada salto custa combustível que ' +
    'alguém precisa pagar.',
  status: 'preview',

  theme: {
    colors: {
      bg: '#080c14',
      bgElevated: '#0e1522',
      surface: '#132033',
      border: '#1f3a5c',
      text: '#d6e8ff',
      textMuted: '#7492b5',
      accent: '#38d9d0',
      accentSoft: '#1a6f6b',
      danger: '#ff5b6e',
      success: '#4ade80',
      vitals: { hp: '#ff5b6e', shields: '#38d9d0', hull: '#f0b429' },
    },
    fonts: {
      display: "'Orbitron', 'Eurostile', 'Arial Narrow', sans-serif",
      body: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
      mono: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    },
    backdrop:
      'radial-gradient(1000px 600px at 70% -10%, #143050 0%, #080c14 60%), repeating-linear-gradient(0deg, rgba(56,217,208,0.05) 0 1px, transparent 1px 3px)',
    radius: 10,
    diceStyle: 'holographic',
  },

  tracks: [
    {
      id: 'drift',
      name: 'Deriva',
      mood: 'exploração',
      synth: {
        scale: [0, 2, 4, 7, 9, 11],
        root: 110.0,
        tempo: 66,
        waveform: 'sine',
        progression: [
          [0, 2, 4],
          [3, 5, 0],
          [1, 3, 5],
          [0, 2, 4],
        ],
        padLevel: 0.26,
        arpeggio: true,
      },
    },
    {
      id: 'dock-seven',
      name: 'Doca Sete',
      mood: 'cidade',
      synth: {
        scale: [0, 2, 3, 5, 7, 10],
        root: 146.83,
        tempo: 104,
        waveform: 'square',
        progression: [
          [0, 2, 4],
          [5, 0, 2],
          [3, 5, 0],
          [4, 6, 1],
        ],
        padLevel: 0.12,
        arpeggio: true,
      },
    },
    {
      id: 'weapons-hot',
      name: 'Armas Liberadas',
      mood: 'combate',
      synth: {
        scale: [0, 1, 3, 5, 6, 8, 10],
        root: 82.41,
        tempo: 160,
        waveform: 'sawtooth',
        progression: [
          [0, 3, 4],
          [0, 3, 4],
          [6, 2, 4],
          [5, 1, 3],
        ],
        padLevel: 0.14,
        arpeggio: true,
      },
    },
    {
      id: 'the-vesh-speak',
      name: 'Os Vesh Falam',
      mood: 'mistério',
      synth: {
        scale: [0, 1, 5, 6, 10],
        root: 92.5,
        tempo: 46,
        waveform: 'triangle',
        progression: [
          [0, 2, 4],
          [1, 3, 0],
          [4, 0, 2],
          [0, 2, 4],
        ],
        padLevel: 0.32,
        arpeggio: false,
      },
    },
  ],

  rules: {
    checkDice: '2d10',
    attributeScaling: 'half',
    difficulties: [
      { name: 'Rotina', value: 9 },
      { name: 'Padrão', value: 13 },
      { name: 'Exigente', value: 17 },
      { name: 'Crítica', value: 21 },
      { name: 'Impossível', value: 26 },
    ],
    criticalRange: { successAtOrAbove: 19, failureAtOrBelow: 3 },
    experienceCurve: { base: 120, exponent: 2.4 },
    degreeLabels: {
      'critical-failure': 'Falha Catastrófica',
      failure: 'Falha',
      success: 'Sucesso',
      'critical-success': 'Sucesso Crítico',
    },
  },

  characterModel: {
    attributes: [
      { id: 'piloting', name: 'Pilotagem', abbreviation: 'PIL', description: 'Manobra atmosférica, atracagem, evasão.', base: 6, min: 1, max: 20, primary: true },
      { id: 'gunnery', name: 'Artilharia', abbreviation: 'ART', description: 'Torres, mísseis, armas pessoais.', base: 6, min: 1, max: 20, primary: true },
      { id: 'engineering', name: 'Engenharia', abbreviation: 'ENG', description: 'Reator, dobra, remendos no vácuo.', base: 6, min: 1, max: 20, primary: true },
      { id: 'systems', name: 'Sistemas', abbreviation: 'SIS', description: 'Intrusão, sensores, contramedidas.', base: 6, min: 1, max: 20, primary: true },
      { id: 'negotiation', name: 'Negociação', abbreviation: 'NEG', description: 'Contratos, subornos, alfândega.', base: 6, min: 1, max: 20 },
      { id: 'xenology', name: 'Xenologia', abbreviation: 'XEN', description: 'Ler intenção alienígena sem se ofender.', base: 4, min: 1, max: 20 },
    ],
    vitals: [
      { id: 'hp', name: 'Vitalidade', abbreviation: 'VIT', description: 'O corpo. O vácuo não perdoa.', colorToken: 'hp', formula: { base: 30, perLevel: 6 } },
      { id: 'shields', name: 'Escudos Pessoais', abbreviation: 'ESC', description: 'Campo defletor. Recarrega entre combates.', colorToken: 'shields', formula: { base: 12, perLevel: 3, fromAttribute: { attributeId: 'engineering', multiplier: 1 } } },
    ],
    classes: [
      {
        id: 'pilot',
        name: 'Piloto',
        tagline: 'Passa onde o computador diz que não passa.',
        description: 'O manche é uma extensão do braço. Sai de situações em que ninguém deveria ter entrado.',
        attributeModifiers: { piloting: 6, systems: 2, negotiation: -1 },
        vitalMultipliers: { shields: 1.2 },
        startingAbilities: ['evasive-burn', 'hard-dock'],
        startingItems: ['flight-suit', 'sidearm'],
        icon: '🚀',
      },
      {
        id: 'engineer',
        name: 'Engenheira',
        tagline: 'Mantém o reator dentro do reator.',
        description: 'Remenda a nave enquanto ela está sendo atingida. Sabe exatamente quanto o casco aguenta.',
        attributeModifiers: { engineering: 6, systems: 3, gunnery: -1 },
        vitalMultipliers: { shields: 1.4 },
        startingAbilities: ['field-repair', 'overload-core'],
        startingItems: ['toolkit', 'flight-suit'],
        icon: '🔧',
      },
      {
        id: 'gunner',
        name: 'Artilheiro',
        tagline: 'Uma janela de tiro é o bastante.',
        description: 'Torres de nave e rifle de abordagem. Resolve o que a negociação não resolveu.',
        attributeModifiers: { gunnery: 6, piloting: 2, xenology: -2 },
        vitalMultipliers: { hp: 1.3 },
        startingAbilities: ['lock-on', 'suppressive-fire'],
        startingItems: ['pulse-rifle', 'combat-armor'],
        icon: '🎯',
      },
      {
        id: 'envoy',
        name: 'Emissária',
        tagline: 'Fecha o contrato antes de alguém sacar.',
        description: 'Fala sete línguas humanas e negocia com os Vesh sem causar incidente diplomático.',
        attributeModifiers: { negotiation: 6, xenology: 5, gunnery: -2 },
        startingAbilities: ['broker-deal', 'read-intent'],
        startingItems: ['translator', 'sidearm'],
        icon: '🤝',
      },
    ],
    pointBuy: 10,
    carryCapacity: { base: 25, perLevel: 4 },
  },

  items: [
    { id: 'flight-suit', name: 'Traje de Voo', slot: 'armor', description: 'Pressurizado, quatro horas de ar. O mínimo legal.', weight: 4, value: 300, rarity: 'comum', armor: 2 },
    { id: 'combat-armor', name: 'Blindagem de Combate', slot: 'armor', description: 'Placas cerâmicas sobre malha reativa. Pesada e feia.', weight: 9, value: 1800, rarity: 'incomum', armor: 5 },
    { id: 'sidearm', name: 'Pistola de Plasma', slot: 'weapon', description: 'Compacta, vinte cargas. Não perfura casco — de propósito.', weight: 1.2, value: 400, rarity: 'comum', damage: '2d6' },
    { id: 'pulse-rifle', name: 'Rifle de Pulso', slot: 'weapon', description: 'Rajadas de três. Padrão da infantaria da Autoridade.', weight: 4, value: 2200, rarity: 'incomum', damage: '3d8', attributeBonuses: { gunnery: 2 } },
    { id: 'toolkit', name: 'Kit de Engenharia', slot: 'misc', description: 'Multisolda, diagnosticador, fita de vácuo. Sobretudo a fita.', weight: 5, value: 600, rarity: 'comum', attributeBonuses: { engineering: 3 } },
    { id: 'translator', name: 'Tradutor Vesh', slot: 'misc', description: 'Converte conceito em linguagem. Erra o suficiente para ser interessante.', weight: 0.4, value: 5000, rarity: 'raro', attributeBonuses: { xenology: 4 } },
    { id: 'medkit', name: 'Kit Médico de Campo', slot: 'consumable', description: 'Selante, estimulante, analgésico.', weight: 1, value: 250, rarity: 'comum', onUse: { vitalId: 'hp', formula: '3d6+6' } },
    { id: 'shield-cell', name: 'Célula de Escudo', slot: 'consumable', description: 'Recarga de emergência do defletor pessoal.', weight: 0.5, value: 400, rarity: 'incomum', onUse: { vitalId: 'shields', formula: '2d8+8' } },
  ],

  abilities: [
    { id: 'evasive-burn', name: 'Queima Evasiva', description: 'Queima lateral brusca. Custa combustível, salva vidas.', cost: {}, effect: { kind: 'buff', description: 'Ataques contra a nave sofrem penalidade por uma rodada.', duration: 1 } },
    { id: 'hard-dock', name: 'Atracagem Forçada', description: 'Acopla sem autorização e sem cerimônia.', cost: {}, effect: { kind: 'utility', description: 'Teste de Pilotagem para atracar em nave hostil.' } },
    { id: 'field-repair', name: 'Reparo de Campo', description: 'Solda o que está furado enquanto ainda está furando.', cost: {}, effect: { kind: 'heal', vitalId: 'shields', formula: '2d8+5' } },
    { id: 'overload-core', name: 'Sobrecarregar Núcleo', description: 'Empurra o reator além do nominal. Funciona. Geralmente.', cost: { shields: 10 }, effect: { kind: 'buff', description: 'Dobra a saída de energia por três rodadas; risco de dano ao casco.', duration: 3 } },
    { id: 'lock-on', name: 'Travar Alvo', description: 'Solução de tiro calculada. O alvo sabe que foi travado.', cost: {}, effect: { kind: 'damage', formula: '4d8+8', area: 'single' } },
    { id: 'suppressive-fire', name: 'Fogo de Supressão', description: 'Não acerta muito. Mantém cabeças abaixadas.', cost: {}, effect: { kind: 'damage', formula: '2d6', area: 'area' } },
    { id: 'broker-deal', name: 'Fechar Acordo', description: 'Encontra o número em que os dois lados param de discutir.', cost: {}, effect: { kind: 'utility', description: 'Teste de Negociação para converter conflito em contrato.' } },
    { id: 'read-intent', name: 'Ler Intenção', description: 'Percebe o que o interlocutor vai fazer antes de fazer.', cost: {}, effect: { kind: 'utility', description: 'Teste de Xenologia para antecipar a próxima ação de um NPC.' } },
  ],

  bestiary: [
    {
      id: 'scav-raider',
      name: 'Saqueador do Aro',
      description: 'Traje remendado, arma melhor que o traje. Ataca em bando e recua ao primeiro morto.',
      threat: 4,
      vitals: { hp: 35, shields: 8 },
      attributes: { gunnery: 8 },
      attacks: [{ name: 'Carabina Improvisada', damage: '2d8' }],
      loot: [{ itemId: 'shield-cell', chance: 0.25 }],
      experience: 60,
      habitats: ['dock-seven'],
    },
    {
      id: 'sentinel-drone',
      name: 'Drone Sentinela',
      description: 'Autônomo, pré-Diáspora, ainda cumprindo uma ordem que ninguém lembra de ter dado.',
      threat: 8,
      vitals: { hp: 70, shields: 30 },
      attributes: { gunnery: 14, systems: 12 },
      attacks: [
        { name: 'Laser de Precisão', damage: '3d10', element: 'energia' },
        { name: 'Pulso Supressor', damage: '2d6', element: 'eletromagnético', description: 'Desativa escudos por uma rodada.' },
      ],
      loot: [],
      experience: 400,
      habitats: ['derelict-station'],
      immunities: ['veneno'],
    },
    {
      id: 'vesh-arbiter',
      name: 'Árbitro Vesh',
      description:
        'Não é hostil por padrão. Julga. Se o julgamento for desfavorável, aí sim vira problema — ' +
        'e os Vesh não erram cálculos.',
      threat: 20,
      vitals: { hp: 220, shields: 120 },
      attributes: { xenology: 20, systems: 18 },
      attacks: [
        { name: 'Reescrita Local', damage: '6d10', element: 'gravitacional' },
        { name: 'Sentença', damage: '4d10', description: 'Ignora escudos.' },
      ],
      loot: [{ itemId: 'translator', chance: 0.3 }],
      experience: 4000,
      habitats: ['vesh-enclave'],
    },
  ],

  locations: [
    {
      id: 'dock-seven',
      name: 'Doca Sete',
      kind: 'cidade',
      description:
        'Estação de transbordo no limite da jurisdição. Setenta mil pessoas, quatro cassinos, ' +
        'nenhum tribunal. Combustível caro, informação barata.',
      hooks: [
        'Um contrato de frete paga o triplo da tabela e não diz o que é a carga.',
        'A Autoridade postou um cruzador na órbita alta. Ninguém sabe o que ele espera.',
      ],
      trackId: 'dock-seven',
      recommendedLevel: [1, 6],
    },
    {
      id: 'derelict-station',
      name: 'Estação Abandonada KV-9',
      kind: 'masmorra',
      description: 'Sem energia há duzentos anos, mas os drones sentinela ainda patrulham.',
      hooks: ['O sinal de socorro é automático — e mudou de padrão na semana passada.'],
      trackId: 'drift',
      recommendedLevel: [4, 10],
    },
    {
      id: 'vesh-enclave',
      name: 'Enclave Vesh',
      kind: 'região',
      description:
        'Nuvem de habitats que não orbitam nada. Os Vesh negociam em conceitos e consideram ' +
        'a linguagem humana uma aproximação grosseira e educada.',
      hooks: ['Os Vesh convocaram um humano pelo nome. Ninguém sabe como conseguiram o nome.'],
      trackId: 'the-vesh-speak',
      recommendedLevel: [8, 16],
    },
  ],

  lore: [
    {
      id: 'diaspora',
      title: 'A Diáspora',
      category: 'História',
      text:
        'Mil anos atrás a humanidade saiu do berço em naves-geração e depois em dobra. Espalhou-se ' +
        'por três braços e perdeu contato com boa parte deles quando a Rede Antiga caiu. O Aro ' +
        'Exterior é o que ficou do outro lado do silêncio.',
    },
    {
      id: 'the-vesh',
      title: 'Os Vesh',
      category: 'Xenologia',
      text:
        'Não são hostis e não são amigos. Comunicam-se por conceitos comprimidos que o tradutor ' +
        'converte em frases aproximadas e frequentemente ofensivas. Cumprem acordos ao pé da ' +
        'letra — inclusive nas partes que o humano não percebeu ter aceitado.',
    },
    {
      id: 'the-authority',
      title: 'A Autoridade',
      category: 'Política',
      text:
        'Governa o Núcleo e patrulha até o Aro Médio. No Aro Exterior existe como rumor, taxa e ' +
        'ocasional cruzador. A ausência dela é o que torna o Aro habitável para tripulações como a de vocês.',
    },
  ],

  gameMaster: {
    voice:
      'Você mestra space opera no Aro Exterior. Tom: competência profissional sob pressão, com ' +
      'humor seco de tripulação. A nave é personagem: combustível, casco e reputação são recursos ' +
      'reais. Descreva o espaço como lugar de trabalho, não como maravilha. Narre em português do ' +
      'Brasil, 2 a 5 frases por vez.',
    canon: [
      'Dobra exige combustível e cálculo. Não existe salto instantâneo e gratuito.',
      'A Autoridade governa o Núcleo; o Aro Exterior é sem lei por ausência, não por anarquia declarada.',
      'Os Vesh comunicam-se por conceitos e cumprem acordos literalmente.',
      'Não há som no vácuo. Combate espacial é silencioso do lado de fora.',
      'Nunca decida ações dos personagens dos jogadores.',
    ],
    openings: [
      {
        title: 'Contrato na Doca Sete',
        locationId: 'dock-seven',
        text:
          'O terminal pisca o saldo da conta da nave: combustível para dois saltos, ou combustível ' +
          'para um salto e comida para o mês. Na mesa em frente, alguém que não deu nome empurra ' +
          'um dado-contrato pela superfície e não tira a mão de cima dele.',
      },
      {
        title: 'Sinal de KV-9',
        locationId: 'derelict-station',
        text:
          'O sinal está em loop há duzentos anos, e na semana passada o padrão mudou. Vocês são a ' +
          'nave mais próxima. O casco da estação enche a janela de proa, escuro, exceto por três ' +
          'luzes que não deveriam estar acesas.',
      },
    ],
    styleExamples: [
      'O acoplamento trava com um estalo que vocês sentem nos pés antes de ouvir.',
      'O Vesh responde. O tradutor demora quatro segundos e devolve: "A troca é aceitável. A perda é sua."',
    ],
  },

  labels: {
    character: 'Tripulante',
    class: 'Função',
    ability: 'Talento',
    bestiary: 'Registro de Ameaças',
    currency: 'créditos',
    party: 'Tripulação',
  },
};
