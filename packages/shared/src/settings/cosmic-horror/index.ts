import type { SettingDefinition } from '../types.js';

/**
 * Horror Cósmico — anos 1920.
 *
 * `status: 'preview'`: tema, regras e modelo de personagem completos e jogáveis;
 * bestiário, locais e itens ainda em construção. A mecânica distintiva é a
 * Sanidade como vital que só desce, e testes que punem o sucesso (você entende
 * o que viu).
 */
export const cosmicHorrorSetting: SettingDefinition = {
  id: 'cosmic-horror',
  name: 'Horror Cósmico',
  tagline: 'Entender é o começo do fim.',
  description:
    'Nova Inglaterra, 1926. Investigadores comuns — um bibliotecário, uma jornalista, um médico ' +
    'cansado — puxam um fio que deveriam ter deixado em paz. Aqui não se vence: sobrevive-se, e ' +
    'a Sanidade é o único recurso que nunca se recupera por completo.',
  status: 'preview',

  theme: {
    colors: {
      bg: '#14120f',
      bgElevated: '#1d1a16',
      surface: '#26221c',
      border: '#3f382e',
      text: '#ddd3c0',
      textMuted: '#8f8471',
      accent: '#9a7b4f',
      accentSoft: '#5f4c31',
      danger: '#8f3a2f',
      success: '#5f7350',
      vitals: { hp: '#8f3a2f', sanity: '#6b5b8f' },
    },
    fonts: {
      display: "'Playfair Display', 'Baskerville', Georgia, serif",
      body: "'Baskerville', 'Georgia', serif",
      mono: "'Courier New', monospace",
    },
    backdrop:
      'radial-gradient(900px 600px at 50% 0%, #221e19 0%, #14120f 65%), repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 1px, transparent 1px 4px)',
    radius: 2,
    diceStyle: 'bone',
  },

  tracks: [
    {
      id: 'arkham-evening',
      name: 'Anoitecer em Arkham',
      mood: 'exploração',
      synth: {
        scale: [0, 2, 3, 5, 7, 8, 10],
        root: 130.81,
        tempo: 58,
        waveform: 'sine',
        progression: [
          [0, 2, 4],
          [5, 0, 2],
          [3, 5, 0],
          [0, 2, 4],
        ],
        padLevel: 0.2,
        arpeggio: false,
      },
    },
    {
      id: 'the-thing-below',
      name: 'A Coisa Abaixo',
      mood: 'tensão',
      synth: {
        scale: [0, 1, 4, 6, 7, 10],
        root: 73.42,
        tempo: 44,
        waveform: 'sawtooth',
        progression: [
          [0, 2, 4],
          [1, 3, 5],
          [0, 2, 5],
          [4, 1, 3],
        ],
        padLevel: 0.3,
        arpeggio: false,
      },
    },
    {
      id: 'the-unraveling',
      name: 'O Desfiar',
      mood: 'mistério',
      synth: {
        scale: [0, 1, 3, 6, 8, 9],
        root: 98.0,
        tempo: 50,
        waveform: 'triangle',
        progression: [
          [0, 3, 5],
          [2, 4, 0],
          [1, 3, 5],
          [0, 3, 5],
        ],
        padLevel: 0.24,
        arpeggio: true,
      },
    },
  ],

  rules: {
    checkDice: '1d100',
    // Perícias percentuais: o valor do atributo É a chance de sucesso.
    attributeScaling: 'flat',
    difficulties: [
      { name: 'Rotineira', value: 20 },
      { name: 'Comum', value: 45 },
      { name: 'Difícil', value: 70 },
      { name: 'Extrema', value: 90 },
    ],
    criticalRange: { successAtOrAbove: 96, failureAtOrBelow: 5 },
    experienceCurve: { base: 60, exponent: 2.2 },
    degreeLabels: {
      'critical-failure': 'Fracasso Terrível',
      failure: 'Fracasso',
      success: 'Êxito',
      'critical-success': 'Êxito Absoluto',
    },
  },

  characterModel: {
    attributes: [
      { id: 'reason', name: 'Razão', abbreviation: 'RAZ', description: 'Deduzir, calcular, encaixar peças.', base: 40, min: 5, max: 95, primary: true },
      { id: 'lore', name: 'Erudição', abbreviation: 'ERU', description: 'Línguas mortas, ocultismo, arquivos.', base: 30, min: 5, max: 95, primary: true },
      { id: 'observation', name: 'Observação', abbreviation: 'OBS', description: 'Notar o detalhe fora do lugar.', base: 40, min: 5, max: 95, primary: true },
      { id: 'nerve', name: 'Têmpera', abbreviation: 'TEM', description: 'Não correr quando tudo manda correr.', base: 35, min: 5, max: 95, primary: true },
      { id: 'presence', name: 'Presença', abbreviation: 'PRE', description: 'Convencer, intimidar, ser lembrado.', base: 35, min: 5, max: 95 },
      { id: 'body', name: 'Físico', abbreviation: 'FIS', description: 'Correr, arrombar, aguentar.', base: 35, min: 5, max: 95 },
    ],
    vitals: [
      {
        id: 'hp',
        name: 'Vigor',
        abbreviation: 'VIG',
        description: 'O corpo aguenta pouco. Um tiro costuma bastar.',
        colorToken: 'hp',
        formula: { base: 8, perLevel: 1, fromAttribute: { attributeId: 'body', multiplier: 0.1 } },
      },
      {
        id: 'sanity',
        name: 'Sanidade',
        abbreviation: 'SAN',
        description:
          'Desce ao compreender o que não deveria ser compreendido. Recupera-se devagar, e nunca por inteiro.',
        colorToken: 'sanity',
        formula: { base: 20, perLevel: 0, fromAttribute: { attributeId: 'nerve', multiplier: 0.6 } },
      },
    ],
    classes: [
      {
        id: 'antiquarian',
        name: 'Antiquário',
        tagline: 'Sabe o que o livro é antes de abri-lo.',
        description: 'Colecionador e catalogador. A erudição é sua arma — e o problema é que ela funciona.',
        attributeModifiers: { lore: 25, reason: 10, body: -5 },
        startingAbilities: ['read-latin', 'appraise'],
        startingItems: ['magnifier', 'notebook'],
        icon: '📜',
      },
      {
        id: 'journalist',
        name: 'Jornalista',
        tagline: 'Pergunta até alguém errar a resposta.',
        description: 'Faro para inconsistências e acesso a lugares onde não deveria entrar.',
        attributeModifiers: { observation: 20, presence: 15, nerve: -5 },
        startingAbilities: ['interview', 'archive-search'],
        startingItems: ['camera', 'notebook'],
        icon: '📰',
      },
      {
        id: 'physician',
        name: 'Médico',
        tagline: 'Já viu corpo o bastante para reconhecer quando um está errado.',
        description: 'Estabiliza feridos e identifica o que a autópsia não explica.',
        attributeModifiers: { reason: 20, nerve: 10, presence: 5 },
        startingAbilities: ['first-aid', 'diagnose'],
        startingItems: ['medical-bag', 'notebook'],
        icon: '🩺',
      },
      {
        id: 'detective',
        name: 'Investigador',
        tagline: 'Vinte anos de casos comuns não prepararam para este.',
        description: 'Interroga, segue rastros e carrega um revólver que provavelmente não vai adiantar.',
        attributeModifiers: { observation: 15, nerve: 15, body: 10, lore: -10 },
        startingAbilities: ['interrogate', 'tail-suspect'],
        startingItems: ['revolver', 'notebook'],
        icon: '🔎',
      },
    ],
    pointBuy: 40,
  },

  items: [
    { id: 'notebook', name: 'Caderno de Anotações', slot: 'misc', description: 'Onde as peças viram um quadro. Ou não viram, e isso também é informação.', weight: 0.3, value: 1, rarity: 'comum' },
    { id: 'magnifier', name: 'Lupa', slot: 'misc', description: 'Latão e vidro. Concede vantagem ao examinar objetos.', weight: 0.2, value: 8, rarity: 'comum', attributeBonuses: { observation: 10 } },
    { id: 'camera', name: 'Câmera Kodak', slot: 'misc', description: 'Prova documental. Nem sempre revela o que os olhos viram.', weight: 1.5, value: 25, rarity: 'comum' },
    { id: 'medical-bag', name: 'Maleta Médica', slot: 'misc', description: 'Ataduras, morfina, agulha e linha.', weight: 3.0, value: 40, rarity: 'comum', onUse: { vitalId: 'hp', formula: '1d4+1' } },
    { id: 'revolver', name: 'Revólver .38', slot: 'weapon', description: 'Seis tiros. Contra algumas coisas, seis é o mesmo que nenhum.', weight: 1.0, value: 30, rarity: 'comum', damage: '1d10' },
    { id: 'lantern', name: 'Lanterna a Querosene', slot: 'misc', description: 'Luz quente e um raio pequeno demais.', weight: 1.2, value: 10, rarity: 'comum' },
    { id: 'necronomicon-fragment', name: 'Fragmento do Necronomicon', slot: 'misc', description: 'Três páginas. Lê-las custa Sanidade e concede algo pior que ignorância.', weight: 0.1, value: 0, rarity: 'lendário', attributeBonuses: { lore: 20 } },
  ],

  abilities: [
    { id: 'read-latin', name: 'Ler Línguas Mortas', description: 'Latim, grego, e o que estiver entre eles.', cost: {}, effect: { kind: 'utility', description: 'Traduz textos antigos com um teste de Erudição.' } },
    { id: 'appraise', name: 'Avaliar', description: 'Reconhecer procedência, idade e valor de um objeto.', cost: {}, effect: { kind: 'utility', description: 'Teste de Erudição para identificar um artefato.' } },
    { id: 'interview', name: 'Entrevistar', description: 'Fazer a pergunta que o interlocutor não ensaiou.', cost: {}, effect: { kind: 'utility', description: 'Teste de Presença para extrair informação.' } },
    { id: 'archive-search', name: 'Vasculhar Arquivos', description: 'Jornais velhos, registros paroquiais, atas municipais.', cost: {}, effect: { kind: 'utility', description: 'Teste de Razão para localizar um registro.' } },
    { id: 'first-aid', name: 'Primeiros Socorros', description: 'Estancar, imobilizar, ganhar tempo.', cost: {}, effect: { kind: 'heal', vitalId: 'hp', formula: '1d4+1' } },
    { id: 'diagnose', name: 'Diagnosticar', description: 'Dizer o que matou — e quando não há explicação médica.', cost: {}, effect: { kind: 'utility', description: 'Teste de Razão sobre um corpo ou ferimento.' } },
    { id: 'interrogate', name: 'Interrogar', description: 'Pressionar até a versão mudar.', cost: {}, effect: { kind: 'utility', description: 'Teste de Têmpera oposto à Presença do alvo.' } },
    { id: 'tail-suspect', name: 'Seguir Suspeito', description: 'Manter distância sem perder o alvo.', cost: {}, effect: { kind: 'utility', description: 'Teste de Observação para seguir sem ser notado.' } },
  ],

  bestiary: [
    {
      id: 'cultist',
      name: 'Cultista',
      description: 'Um vizinho, um comerciante, um professor. Reconhecível — e essa é a parte ruim.',
      threat: 3,
      vitals: { hp: 9, sanity: 5 },
      attributes: { body: 40, nerve: 60 },
      attacks: [{ name: 'Faca Ritual', damage: '1d6' }],
      loot: [{ itemId: 'notebook', chance: 0.4 }],
      experience: 30,
      habitats: ['arkham'],
    },
    {
      id: 'deep-one',
      name: 'Profundo',
      description: 'Anfíbio, ereto, com traços humanos suficientes para ser insuportável de olhar.',
      threat: 9,
      vitals: { hp: 16 },
      attributes: { body: 70 },
      attacks: [{ name: 'Garras Palmadas', damage: '1d8+2' }],
      loot: [],
      experience: 180,
      habitats: ['innsmouth-coast'],
      weaknesses: ['fogo'],
    },
    {
      id: 'the-lurker',
      name: 'O Que Espreita no Limiar',
      description:
        'Não tem forma estável. Vê-lo diretamente custa Sanidade; entendê-lo custa mais. ' +
        'Não pode ser morto — apenas mandado de volta.',
      threat: 30,
      vitals: { hp: 60 },
      attributes: { lore: 95 },
      attacks: [
        { name: 'Toque Dissolvente', damage: '3d10' },
        { name: 'Presença', damage: '1d10', element: 'sanidade', description: 'Dano direto à Sanidade de todos que o veem.' },
      ],
      loot: [],
      experience: 5000,
      habitats: ['the-threshold'],
      immunities: ['físico'],
    },
  ],

  locations: [
    {
      id: 'arkham',
      name: 'Arkham, Massachusetts',
      kind: 'cidade',
      description:
        'Cidade universitária às margens do Miskatonic. Casas de telhado íngreme, a biblioteca ' +
        'da universidade com sua coleção restrita, e uma taxa de desaparecimentos que o jornal local nunca soma.',
      hooks: [
        'A coleção restrita da Miskatonic recebeu uma doação anônima.',
        'Três estudantes deixaram a cidade na mesma noite. Nenhum avisou a família.',
      ],
      trackId: 'arkham-evening',
      recommendedLevel: [1, 4],
    },
    {
      id: 'innsmouth-coast',
      name: 'Costa de Innsmouth',
      kind: 'ermo',
      description: 'Vila portuária em decadência. Ninguém olha nos olhos e o cheiro de peixe não vem do porto.',
      hooks: ['O ônibus para Innsmouth faz uma viagem por dia e volta vazio.'],
      trackId: 'the-thing-below',
      recommendedLevel: [3, 8],
    },
    {
      id: 'the-threshold',
      name: 'O Limiar',
      kind: 'interior',
      description: 'Não é um lugar. É onde a geometria para de funcionar.',
      hooks: ['O ritual está começando. Vocês chegaram tarde, mas não tarde demais.'],
      trackId: 'the-unraveling',
      recommendedLevel: [8, 12],
    },
  ],

  lore: [
    {
      id: 'sanity',
      title: 'A Mecânica da Sanidade',
      category: 'Regras',
      text:
        'Sanidade não é medo — é compreensão. Um investigador que foge sem entender nada sai ' +
        'ileso; um que fica e deduz corretamente paga o preço. Sucessos em testes de Erudição ' +
        'diante do sobrenatural custam Sanidade justamente porque funcionam.',
    },
    {
      id: 'no-victory',
      title: 'Não Existe Vitória',
      category: 'Tom',
      text:
        'O objetivo não é derrotar a entidade. É adiar, selar, resgatar quem der. Uma campanha ' +
        'bem-sucedida termina com os investigadores vivos, parcialmente lúcidos, e cientes de ' +
        'que resolveram um sintoma.',
    },
  ],

  gameMaster: {
    voice:
      'Você mestra horror cósmico nos anos 1920. Tom: contido, sensorial, com o horror sempre ' +
      'periférico — descreva o que os sentidos captam e deixe a conclusão para o jogador. Nunca ' +
      'nomeie a entidade antes que os investigadores a nomeiem. Recompense investigação paciente ' +
      'e puna pressa. Narre em português do Brasil, 2 a 5 frases por vez.',
    canon: [
      'A ambientação é 1920-1929, Nova Inglaterra. Nada de tecnologia posterior.',
      'Entidades cósmicas não são derrotadas por violência. Podem ser adiadas, seladas ou evitadas.',
      'Sanidade perdida por compreensão sobrenatural não se recupera com descanso.',
      'Nunca decida ações dos investigadores. Descreva; eles escolhem.',
    ],
    openings: [
      {
        title: 'A Carta do Tio',
        locationId: 'arkham',
        text:
          'O envelope chegou três dias depois do enterro, com a letra dele e o carimbo de Arkham. ' +
          'Dentro, uma chave, um endereço, e uma única frase: "Não venha sozinho, e não venha à noite." ' +
          'O trem parte às quatro. Já são três e quarenta.',
      },
      {
        title: 'O Ônibus para Innsmouth',
        locationId: 'innsmouth-coast',
        text:
          'O motorista não fala desde Newburyport. O ônibus cheira a maresia velha e as janelas ' +
          'estão embaçadas por dentro, apesar do frio. Adiante, entre as dunas, aparecem telhados ' +
          'que afundaram para um lado. Ele reduz a marcha sem que ninguém tenha pedido parada.',
      },
    ],
    styleExamples: [
      'O bibliotecário aceita o pedido, anota, e leva quarenta minutos para voltar com um livro que estava a dez passos.',
      'A maré desceu. O que está exposto na areia tinha uma forma antes.',
    ],
  },

  labels: {
    character: 'Investigador',
    class: 'Ocupação',
    ability: 'Perícia',
    bestiary: 'Arquivo de Anomalias',
    currency: 'dólares',
    party: 'Equipe',
  },
};
