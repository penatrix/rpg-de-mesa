import type { LocationDef } from '../types.js';

/**
 * Geografia de Tibia. Hierárquica: regiões contêm cidades, cidades contêm
 * interiores. `hooks` são ganchos que o Mestre (humano ou IA) pode puxar
 * quando o grupo chega sem plano.
 */
export const tibiaLocations: LocationDef[] = [
  // --- Rookgaard -----------------------------------------------------------
  {
    id: 'rookgaard',
    name: 'Rookgaard',
    kind: 'região',
    description:
      'A ilha-escola. Sem vocação, sem magia decente, sem saída — até o nível 8. Um vilarejo ' +
      'com templo, academia e um cais de onde parte o único barco. Todos os heróis de Tibia ' +
      'começaram pisando esta areia, e uma parte considerável nunca saiu dela.',
    hooks: [
      'O Padre Norf avisa que ratos vêm subindo do esgoto em número anormal.',
      'Um novato sumiu nas minas há dois dias. A mãe oferece tudo o que tem — que é pouco.',
      'Seymour, o professor, quer alguém que teste uma teoria dele sobre os trolls.',
      'O barco para Thais parte ao amanhecer. Alguém a bordo não deveria estar.',
    ],
    trackId: 'rookgaard-dawn',
    recommendedLevel: [1, 8],
    npcs: [
      { name: 'Padre Norf', role: 'Sacerdote do templo', description: 'Cura, abençoa e sermoneia — nessa ordem.' },
      { name: 'Seymour', role: 'Professor', description: 'Ensina o básico e reclama de quem não escuta.' },
      { name: 'Dixi', role: 'Mercadora', description: 'Compra qualquer coisa. Paga mal e sorri muito.' },
      { name: 'Capitão Bluebear', role: 'Marinheiro', description: 'Leva você a Thais quando estiver pronto.' },
    ],
  },
  {
    id: 'rookgaard-sewers',
    name: 'Esgotos de Rookgaard',
    parentId: 'rookgaard',
    kind: 'masmorra',
    description:
      'Um buraco atrás do templo e uma corda. Lá embaixo, água até o tornozelo, ratos e o cheiro ' +
      'que nunca sai da roupa. A primeira masmorra de todo mundo.',
    hooks: [
      'Uma passagem alagada leva mais fundo do que o mapa indica.',
      'Alguém acampou aqui embaixo. As brasas ainda estão mornas.',
    ],
    trackId: 'deep-mines',
    recommendedLevel: [1, 4],
  },
  {
    id: 'rookgaard-mines',
    name: 'Minas de Rookgaard',
    parentId: 'rookgaard',
    kind: 'masmorra',
    description:
      'Galerias abandonadas a nordeste. Trolls nos níveis altos, goblins mais fundo, e — se você ' +
      'descer o suficiente e tiver azar — um minotauro que não deveria estar tão perto da superfície.',
    hooks: [
      'Marcas de escavação recentes numa galeria que consta como selada há dez anos.',
      'Os goblins organizaram alguma coisa. Goblins não se organizam.',
      'Um veio de minério estranho que os anões de Kazordoon pagariam para ver.',
    ],
    trackId: 'deep-mines',
    recommendedLevel: [3, 10],
  },

  // --- Thais ---------------------------------------------------------------
  {
    id: 'thais',
    name: 'Thais',
    kind: 'cidade',
    description:
      'A capital do reino e o coração humano do continente. O castelo do Rei Tibianus domina a ' +
      'cidade; abaixo dele, o mercado, a academia de armas, os templos e um porto que nunca dorme. ' +
      'É onde as carreiras começam de verdade e onde a maioria das más ideias é financiada.',
    hooks: [
      'Um edital no mercado: a guarda paga por cabeças de orc, e paga bem demais.',
      'O comerciante que sumiu na estrada de Venore levava algo que a coroa quer de volta.',
      'Nas catacumbas sob o cemitério, os mortos-vivos aumentaram. Ninguém quer investigar.',
      'Um bêbado na taverna jura ter visto Excalibug. Ele jura isso toda noite. Hoje ele tem um mapa.',
    ],
    trackId: 'thais-market',
    recommendedLevel: [8, 40],
    npcs: [
      { name: 'Rei Tibianus', role: 'Soberano', description: 'Governa o reino. Raramente recebe.' },
      { name: 'Gorn', role: 'Ferreiro', description: 'A melhor forja da cidade e o pior humor.' },
      { name: 'Frodo', role: 'Taverneiro', description: 'Serve cerveja e boatos, em partes iguais.' },
      { name: 'Muriel', role: 'Maga', description: 'Ensina as primeiras palavras a quem tem talento.' },
    ],
  },
  {
    id: 'thais-catacombs',
    name: 'Catacumbas de Thais',
    parentId: 'thais',
    kind: 'masmorra',
    description:
      'Sob o cemitério, corredores de pedra que descem mais do que qualquer registro admite. ' +
      'Esqueletos nos níveis altos, carniçais abaixo. E, no fundo, uma câmara que a guarda selou ' +
      'e prefere não discutir.',
    hooks: [
      'A parede selada tem marcas de garra — do lado de dentro.',
      'Os esqueletos estão organizados em formação. Alguém os comanda.',
    ],
    trackId: 'dragon-lair',
    recommendedLevel: [15, 45],
  },
  {
    id: 'thais-outskirts',
    name: 'Arredores de Thais',
    parentId: 'thais',
    kind: 'ermo',
    description:
      'Campos, estradas de terra e bosques entre a capital e o resto do mundo. Lobos ao anoitecer, ' +
      'orcs perto da fronteira leste, e caravanas que pagam bem por escolta.',
    hooks: [
      'Uma caravana precisa de escolta até Venore. O pagamento é generoso demais.',
      'Fogueiras orc visíveis a leste — mais do que a fortaleza costuma abrigar.',
    ],
    trackId: 'rookgaard-dawn',
    recommendedLevel: [5, 20],
  },

  // --- Outras cidades ------------------------------------------------------
  {
    id: 'carlin',
    name: 'Carlin',
    kind: 'cidade',
    description:
      'Ao norte, cercada de neve e independente por escolha. Governada pela Rainha Eloise e ' +
      'defendida por uma guarda inteiramente feminina. Relação com Thais: fria, e não só pelo clima.',
    hooks: [
      'A Rainha Eloise busca discretamente alguém sem ligações com Thais.',
      'Algo nas minas de gelo ao norte matou três batedoras em uma semana.',
    ],
    trackId: 'thais-market',
    recommendedLevel: [8, 35],
    npcs: [
      { name: 'Rainha Eloise', role: 'Soberana de Carlin', description: 'Pragmática e sem paciência para protocolo.' },
    ],
  },
  {
    id: 'abdendriel',
    name: "Ab'Dendriel",
    kind: 'cidade',
    description:
      'Cidade élfica construída dentro das árvores, a leste de Carlin. Os elfos toleram humanos ' +
      'com uma cortesia que não chega a ser simpatia. É onde os Druidas aprendem o que importa.',
    hooks: [
      'Os elfos falam de uma corrupção espalhando-se pela floresta ao norte.',
      'Um humano foi aceito na Casa das Folhas. Ninguém explica por quê.',
    ],
    trackId: 'temple-rest',
    recommendedLevel: [8, 30],
  },
  {
    id: 'kazordoon',
    name: 'Kazordoon',
    kind: 'cidade',
    description:
      'A cidade anã, escavada dentro da montanha. Forjas que nunca esfriam, corredores que ' +
      'descem por quilômetros e um rei anão que mede visitantes pelo que carregam.',
    hooks: [
      'Os anões perderam contato com uma galeria de mineração profunda.',
      'Um mestre-ferreiro aceita forjar algo único — pelo material certo.',
    ],
    trackId: 'deep-mines',
    recommendedLevel: [10, 40],
  },
  {
    id: 'venore',
    name: 'Venore',
    kind: 'cidade',
    description:
      'Cidade mercante construída sobre o pântano, a leste. Aqui tudo tem preço e o pântano cobra ' +
      'o seu: aranhas do tamanho de cães e um cheiro que os moradores juram não sentir mais.',
    hooks: [
      'Uma guilda mercante quer alguém para "recuperar" uma carga de um rival.',
      'As teias no pântano ao sul dobraram de tamanho em um mês.',
    ],
    trackId: 'thais-market',
    recommendedLevel: [12, 45],
  },
  {
    id: 'edron',
    name: 'Edron',
    kind: 'cidade',
    description:
      'A cidade acadêmica no penhasco. A Academia Real de Magia forma os Feiticeiros do continente ' +
      'e, ocasionalmente, produz alguém que estuda demais e vira um problema para todos.',
    hooks: [
      'Um pesquisador da Academia desapareceu com um grimório restrito.',
      'Bruxos foram avistados nas colinas a oeste. Bruxos vêm da Academia.',
    ],
    trackId: 'temple-rest',
    recommendedLevel: [20, 60],
  },

  // --- Masmorras e ermos ---------------------------------------------------
  {
    id: 'orc-fortress',
    name: 'Fortaleza Orc',
    parentId: 'thais-outskirts',
    kind: 'masmorra',
    description:
      'Paliçadas e torres de madeira a leste de Thais. Os orcs mantêm formação, postam sentinelas ' +
      'e reagem a incursões. Não é uma caverna de monstros — é um exército.',
    hooks: [
      'O chefe de guerra reuniu tribos que não se falavam há gerações.',
      'Prisioneiros humanos foram vistos sendo levados para dentro.',
    ],
    trackId: 'blade-and-blood',
    recommendedLevel: [10, 25],
  },
  {
    id: 'venore-swamp',
    name: 'Pântano de Venore',
    parentId: 'venore',
    kind: 'ermo',
    description:
      'Água parada até a cintura, mosquitos e teias entre as árvores mortas. Aranhas venenosas por ' +
      'toda parte e, mais fundo, algo que teceu as teias grandes.',
    hooks: ['Trilha de teia levando a uma clareira que não aparece em mapa nenhum.'],
    trackId: 'deep-mines',
    recommendedLevel: [12, 30],
  },
  {
    id: 'spider-cave',
    name: 'Caverna da Aranha',
    parentId: 'venore-swamp',
    kind: 'masmorra',
    description: 'O centro da teia. Ossadas no chão, casulos no teto, e uma coisa que se move devagar.',
    hooks: ['Um casulo se move. Alguém ainda está vivo lá dentro.'],
    trackId: 'dragon-lair',
    recommendedLevel: [25, 45],
  },
  {
    id: 'mintwallin',
    name: 'Mintwallin',
    kind: 'masmorra',
    description:
      'O reino subterrâneo dos minotauros, sob o continente. Uma civilização inteira que a ' +
      'superfície prefere fingir que não existe. Tem rei, tem exército, tem memória longa.',
    hooks: ['O Rei Minotauro enviou um emissário a Thais. O emissário não voltou.'],
    trackId: 'blade-and-blood',
    recommendedLevel: [20, 45],
  },
  {
    id: 'cyclopolis',
    name: 'Cyclopolis',
    parentId: 'edron',
    kind: 'masmorra',
    description: 'Ruínas ciclópicas a leste de Edron. Blocos de pedra grandes demais para mãos humanas.',
    hooks: ['Os ciclopes estão empilhando pedras num padrão. Alguém está mandando.'],
    trackId: 'blade-and-blood',
    recommendedLevel: [25, 50],
  },
  {
    id: 'drefia',
    name: 'Drefia',
    kind: 'masmorra',
    description:
      'Cidade em ruínas tomada por mortos-vivos e Senhores dos Ossos. Foi habitada; ninguém ' +
      'concorda sobre por quem, nem sobre o que aconteceu.',
    hooks: ['Inscrições nas paredes numa língua que os eruditos de Edron reconhecem — e temem.'],
    trackId: 'dragon-lair',
    recommendedLevel: [30, 60],
  },
  {
    id: 'dragon-lair',
    name: 'Covil do Dragão',
    kind: 'masmorra',
    description:
      'Calor antes da luz. Ossos calcinados no chão de entrada e, no fundo, o brilho do ouro ' +
      'sobre o qual algo enorme está dormindo. Ou fingindo dormir.',
    hooks: [
      'O ouro está arrumado demais para ser um monte acumulado.',
      'Há um ovo. Só um.',
    ],
    trackId: 'dragon-lair',
    recommendedLevel: [35, 70],
  },
  {
    id: 'behemoth-cave',
    name: 'Caverna dos Beemotes',
    parentId: 'kazordoon',
    kind: 'masmorra',
    description: 'Galerias profundas sob Kazordoon, com tetos altos demais para uma mina.',
    hooks: ['Os anões seguiram um veio de minério e encontraram um corredor escavado por algo maior.'],
    trackId: 'dragon-lair',
    recommendedLevel: [50, 90],
  },
  {
    id: 'demon-lair',
    name: 'Antro dos Demônios',
    kind: 'masmorra',
    description:
      'Onde o plano material fica fino. O ar queima ao respirar e as sombras se movem contra a ' +
      'luz. Grupos de menos de quatro não voltam.',
    hooks: ['Um portal semiaberto. Alguém o abriu do outro lado.'],
    trackId: 'dragon-lair',
    recommendedLevel: [70, 120],
  },
  {
    id: 'ferumbras-citadel',
    name: 'Cidadela de Ferumbras',
    kind: 'masmorra',
    description:
      'A torre do arquimago, além do mapa conhecido. Aparece quando ele quer ser encontrado — ' +
      'o que, historicamente, nunca foi boa notícia para quem a encontrou.',
    hooks: ['A cidadela reapareceu. A última vez foi há uma geração e custou metade de Thais.'],
    trackId: 'ferumbras-fall',
    recommendedLevel: [100, 200],
  },
  {
    id: 'ancient-temple',
    name: 'Templo Ancião',
    kind: 'masmorra',
    description:
      'Anterior aos humanos, anterior aos minotauros. As colunas não têm base — descem para dentro ' +
      'da rocha e ninguém sabe até onde.',
    hooks: ['Uma inscrição menciona Zathroth. Isso, por si só, é motivo para sair.'],
    trackId: 'dragon-lair',
    recommendedLevel: [40, 80],
  },
  {
    id: 'edron-outskirts',
    name: 'Colinas de Edron',
    parentId: 'edron',
    kind: 'ermo',
    description: 'Colinas ventosas em torno da academia. Ciclopes ao norte, bruxos onde não deveria haver.',
    hooks: ['Um círculo queimado na grama, ainda quente, com pegadas saindo dele.'],
    trackId: 'rookgaard-dawn',
    recommendedLevel: [25, 50],
  },
  {
    id: 'port-hope-jungle',
    name: 'Selva de Port Hope',
    kind: 'ermo',
    description:
      'O continente do sul: umidade, insetos e verde em todas as direções. Port Hope é o último ' +
      'posto civilizado, e "civilizado" é generoso.',
    hooks: ['Uma expedição não voltou de Tiquanda. Levavam um mapa que ninguém mais tem.'],
    trackId: 'deep-mines',
    recommendedLevel: [30, 60],
  },
  {
    id: 'tiquanda',
    name: 'Tiquanda',
    parentId: 'port-hope-jungle',
    kind: 'ermo',
    description: 'A selva profunda. Ruínas cobertas de raiz, hidras nos rios, e nada de trilhas.',
    hooks: ['Uma pirâmide emergindo da vegetação. Não estava lá no mapa do ano passado.'],
    trackId: 'dragon-lair',
    recommendedLevel: [40, 80],
  },
  {
    id: 'goroma',
    name: 'Goroma',
    kind: 'região',
    description:
      'Ilha vulcânica. Fumaça, rocha negra e dragões que fizeram das encostas seu território. ' +
      'A montanha ronca à noite.',
    hooks: ['O vulcão está mais ativo. Os dragões estão descendo.'],
    trackId: 'dragon-lair',
    recommendedLevel: [50, 90],
  },
  {
    id: 'yalahar',
    name: 'Yalahar',
    kind: 'cidade',
    description:
      'Cidade-labirinto dividida em distritos selados, cada um com sua própria decadência. Foi ' +
      'grandiosa. Agora é um experimento que ninguém está supervisionando.',
    hooks: ['Um distrito selado foi reaberto. Não por dentro.'],
    trackId: 'thais-market',
    recommendedLevel: [40, 90],
  },
  {
    id: 'kazordoon-depths',
    name: 'Profundezas de Kazordoon',
    parentId: 'kazordoon',
    kind: 'masmorra',
    description: 'Abaixo das forjas, abaixo das minas, abaixo do que os anões admitem ter escavado.',
    hooks: ['Um mapa anão antigo marca um nível que os atuais negam existir.'],
    trackId: 'deep-mines',
    recommendedLevel: [55, 95],
  },
];
