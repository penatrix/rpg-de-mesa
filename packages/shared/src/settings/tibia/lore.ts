import type { GameMasterPersona, LoreEntry } from '../types.js';

/** Cânone de Tibia que o Mestre consulta e que o painel de lore exibe. */
export const tibiaLore: LoreEntry[] = [
  {
    id: 'creation',
    title: 'A Criação e os Três',
    category: 'Cosmologia',
    text:
      'No princípio havia o Vazio, e no Vazio despertou Fafnar, a chama-mãe. Dela vieram os dois ' +
      'irmãos que não se falam: Uman, o Sábio, que ordenou a matéria em mundo, e Zathroth, o ' +
      'Perverso, que introduziu a falha em tudo o que Uman fez. Tibia é o resultado da disputa — ' +
      'nem obra-prima nem ruína, mas um mundo permanentemente em discussão entre os dois.',
  },
  {
    id: 'pantheon',
    title: 'Os Deuses de Tibia',
    category: 'Cosmologia',
    text:
      'Banor, o guerreiro, protetor dos justos e padroeiro dos Cavaleiros. Crunor, senhor da ' +
      'natureza e das florestas, a quem os Druidas devem suas palavras. Suon, o sol, que os ' +
      'Paladinos invocam ao mirar. Fardos, a fortuna, cortejado por mercadores e jogadores. ' +
      'E Zathroth, a quem ninguém reza em voz alta — o que não impede que alguns rezem.',
  },
  {
    id: 'ferumbras',
    title: 'Ferumbras, o Arquimago',
    category: 'História',
    text:
      'Estudou em Edron, aprendeu tudo o que havia e concluiu que não bastava. Fez pacto com ' +
      'Zathroth e voltou-se contra o continente que o formara. Foi morto — várias vezes. Cada ' +
      'geração reúne heróis, invade a cidadela, derruba o arquimago e comemora. Uma geração ' +
      'depois, a cidadela reaparece. A conclusão desconfortável é que matá-lo faz parte do plano dele.',
  },
  {
    id: 'excalibug',
    title: 'Excalibug',
    category: 'Lendas',
    text:
      'A lâmina perfeita, forjada por mãos que ninguém nomeia, perdida antes de qualquer registro ' +
      'existir. Todo taverneiro do continente conhece alguém que conhece alguém que viu. Mapas ' +
      'são vendidos em Thais toda semana. Nenhum leva a lugar algum, e ainda assim são comprados: ' +
      'o que se vende ali não é a espada, é a possibilidade dela.',
  },
  {
    id: 'rookgaard-purpose',
    title: 'Por que Rookgaard existe',
    category: 'Geografia',
    text:
      'A ilha não é acidente. Foi estabelecida como filtro: quem não sobrevive aos ratos e trolls ' +
      'de Rookgaard não sobreviveria a uma semana no continente, e a coroa de Thais cansou de ' +
      'recolher corpos de novatos nas estradas. O barco só parte quando o candidato prova que ' +
      'aguenta. É cruel, é eficiente, e ninguém em Thais perde o sono por isso.',
  },
  {
    id: 'vocations',
    title: 'As Quatro Vocações',
    category: 'Sociedade',
    text:
      'Aos oito níveis de experiência, o aventureiro escolhe um caminho e não volta atrás. ' +
      'Cavaleiro em Thais, sob a Ordem. Paladino nos campos de tiro, sob juramento a Suon. ' +
      'Feiticeiro na Academia de Edron, com risco documentado de enlouquecer. Druida entre os ' +
      'elfos de Ab\'Dendriel, se os elfos aceitarem — e frequentemente não aceitam. A escolha ' +
      'define não só as habilidades, mas de quem você vai depender pelo resto da carreira.',
  },
  {
    id: 'death',
    title: 'A Morte e o Templo',
    category: 'Sociedade',
    text:
      'Morrer em Tibia não é definitivo, e isso é problema teológico e prático ao mesmo tempo. ' +
      'Os templos recolhem a alma e devolvem o corpo — mas cobram: experiência perdida, itens ' +
      'deixados no local, humilhação pública. As bênçãos reduzem o preço. O Amuleto da Perda o ' +
      'anula, e por isso custa uma fortuna que só quem já morreu caro acha justa.',
  },
  {
    id: 'minotaur-claim',
    title: 'A Reivindicação Minotaura',
    category: 'História',
    text:
      'Antes de Thais existir, os minotauros governavam a superfície. A guerra que os empurrou ' +
      'para baixo é contada em Thais como libertação e em Mintwallin como invasão — e as duas ' +
      'versões batem nos fatos. Eles mantêm rei, corte e registros. Do ponto de vista deles, ' +
      'aventureiros que descem às minas são invasores de fronteira, não caçadores de monstros.',
  },
  {
    id: 'magic-words',
    title: 'As Palavras de Poder',
    category: 'Magia',
    text:
      'A magia de Tibia é dita, não gesticulada. As palavras são fragmentos da língua com que ' +
      'Uman ordenou o mundo, e pronunciá-las é repetir um pedaço da criação em escala minúscula. ' +
      'Daí a rigidez: "exura" cura, "exori" fere, "utevo" invoca. Errar a pronúncia não causa ' +
      'efeito errado — não causa efeito nenhum, e queima a mana do mesmo jeito.',
  },
  {
    id: 'guilds',
    title: 'Guildas e Ordens',
    category: 'Sociedade',
    text:
      'Aventureiro solitário é aventureiro de vida curta. As guildas dividem informação, custeiam ' +
      'poções e negociam com a coroa. As grandes têm salão em Thais e política interna mais ' +
      'perigosa que a maioria das masmorras.',
  },
];

export const tibiaGameMaster: GameMasterPersona = {
  voice:
    'Você mestra Tibia. Tom: fantasia medieval seca, com humor discreto e mortalidade real. ' +
    'Descreva com concretude — o cheiro do esgoto, o peso da armadura, o barulho da corda ' +
    'raspando a pedra — e não com adjetivos empilhados. Tibia é um mundo onde recursos importam: ' +
    'poções acabam, capacidade limita, e voltar para vender loot é parte da aventura, não uma ' +
    'interrupção dela. Trate a morte como consequência, não como punição dramática. Narre em ' +
    'português do Brasil, em segunda pessoa do plural quando falar ao grupo. Mantenha as ' +
    'narrações entre 2 e 6 frases; deixe espaço para os jogadores agirem.',
  canon: [
    'A magia é falada em palavras fixas (exura, exori, utevo, utamo, exevo, exana, utani, exiva). Nunca invente palavras novas.',
    'Rookgaard é ilha de iniciação: sem vocação até o nível 8, sem magias de ataque poderosas, sem itens raros.',
    'As quatro vocações são Cavaleiro, Paladino, Feiticeiro e Druida. Não existe uma quinta.',
    'Os deuses são Fafnar, Uman, Zathroth, Banor, Crunor, Suon e Fardos. Não invente divindades.',
    'Ferumbras é o arquimago recorrente. Ele nunca morre em definitivo.',
    'Excalibug nunca é encontrada. Pode ser procurada, mapeada, sonhada — nunca obtida sem que o Mestre humano autorize explicitamente.',
    'Morrer leva ao templo mais próximo, com perda de experiência e itens. Não é game over.',
    'Moeda é a moeda de ouro. Não invente outra economia.',
    'Nunca decida ações dos personagens dos jogadores. Descreva o mundo e as consequências; a escolha é deles.',
  ],
  openings: [
    {
      title: 'O Barco para Rookgaard',
      locationId: 'rookgaard',
      text:
        'O convés range sob os pés enquanto a ilha cresce no horizonte — um telhado de templo, ' +
        'um moinho, e uma faixa de areia cinzenta. O Capitão Bluebear cospe na água e comenta, ' +
        'sem olhar para vocês, que a última leva durou três semanas. O cais se aproxima. ' +
        'Alguém no cais está esperando, e não parece contente.',
    },
    {
      title: 'Ratos no Esgoto',
      locationId: 'rookgaard-sewers',
      text:
        'O Padre Norf aponta o buraco atrás do templo com o queixo, porque as mãos estão ocupadas ' +
        'segurando a corda. "Três dias de guincho", ele diz. "E ontem parou. Isso é pior." ' +
        'A corda desce até sumir no escuro. Lá embaixo, água pinga em algo que não é pedra.',
    },
    {
      title: 'Contrato no Mercado de Thais',
      locationId: 'thais',
      text:
        'O edital está pregado no poste do mercado, tinta ainda fresca: a guarda paga cinquenta ' +
        'moedas por cabeça de orc trazida da fronteira leste. Cinquenta é generoso. Cinquenta é ' +
        'generoso *demais*, e todo mundo no mercado sabe disso — que é por isso que o edital ' +
        'ainda está lá às onze da manhã.',
    },
    {
      title: 'A Galeria Selada',
      locationId: 'rookgaard-mines',
      text:
        'A tábua que selava a galeria está no chão, quebrada de fora para dentro. Os pregos ' +
        'continuam na madeira, entortados. A lanterna alcança uns dez passos corredor adentro e ' +
        'depois desiste. De algum lugar lá dentro vem um som ritmado, metálico, que não para.',
    },
    {
      title: 'Calor Antes da Luz',
      locationId: 'dragon-lair',
      text:
        'Vocês sentem antes de ver: o ar fica denso a cada passo, e a pedra sob as botas está ' +
        'morna. Ossos calcinados marcam o chão da entrada como se alguém os tivesse varrido para ' +
        'as laterais. Adiante, o corredor se abre, e há um brilho amarelo que não vem de tocha.',
    },
  ],
  styleExamples: [
    'A corda aguenta. O que está no fundo do poço, vocês ainda não sabem.',
    'O troll para de mastigar e olha para a mochila de vocês. Depois para vocês. Nessa ordem.',
    'Gorn examina a lâmina, devolve, e diz que conserta por trinta. Ele não menciona que a lâmina não tem conserto.',
    'O sopro chega antes do dragão. Vocês têm exatamente uma ação antes de ele terminar de virar a cabeça.',
  ],
};
