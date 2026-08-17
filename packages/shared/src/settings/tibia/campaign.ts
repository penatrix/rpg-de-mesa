/**
 * A campanha padrão de Tibia e os companheiros que a mesa pode recrutar.
 *
 * Tudo aqui é texto da ambientação: o prólogo é lido na abertura sem gastar uma
 * única chamada de API, e a premissa e os atos entram no prompt do Mestre para
 * dar rumo de longo prazo. Uma campanha com forma custa menos que um Mestre
 * improvisando do zero a cada turno — e rende mais.
 */

import type { CampaignDef, CompanionDef } from '../types.js';

export const tibiaCampaign: CampaignDef = {
  title: 'A Corda que Desce',
  premise:
    'Rookgaard é uma ilha de treino da qual ninguém deveria sair sem estar pronto — e algo lá ' +
    'embaixo parou de esperar que os aventureiros ficassem prontos.',
  prologue: [
    'Tibia tem sete deuses, quatro vocações e uma regra que ninguém escreveu em lugar nenhum: ' +
      'você desce até onde consegue voltar. Quem esquece essa regra vira nome numa lista que o ' +
      'Padre Norf lê em voz baixa nas manhãs de domingo.',
    'Rookgaard fica ao largo do continente, uma ilha de trigo ralo, esgoto de pedra e minas ' +
      'que os anões abandonaram antes de qualquer um de vocês nascer. É onde o Capitão Bluebear ' +
      'despeja os que ainda não valem passagem para Thais. Ele nunca pergunta o nome de ninguém ' +
      'na ida. Só na volta.',
    'Vocês chegaram há uma semana. Aprenderam a matar rato sem apanhar, a vender pele de coelho ' +
      'sem levar calote do Al Dee, e a nunca, jamais, entrar na mina pelo poço do norte. Foi o ' +
      'suficiente para acharem que já sabiam alguma coisa.',
    'Na terça-feira, o guincho no esgoto parou. Na quarta, dois escavadores não voltaram da ' +
      'galeria selada. Na quinta, o sino do templo tocou fora de hora, e o Padre Norf estava ' +
      'segurando uma corda em vez do badalo.',
    'A corda desce. É por ela que a campanha começa, e é por ela que vocês vão ter que subir.',
  ],
  acts: [
    {
      id: 'rookgaard',
      title: 'I — O que parou de guinchar',
      goal:
        'Descobrir por que os ratos do esgoto de Rookgaard se calaram e o que os escavadores ' +
        'acordaram na galeria selada das minas. Termina quando o grupo ganha passagem para Thais.',
      levels: [1, 8],
    },
    {
      id: 'thais',
      title: 'II — O edital generoso demais',
      goal:
        'Em Thais, entender por que a guarda paga acima do preço por cabeça de orc na fronteira ' +
        'leste — e quem lucra com a resposta. Termina quando o grupo descobre o nome do patrono.',
      levels: [8, 20],
    },
    {
      id: 'deep',
      title: 'III — Fundo de mina',
      goal:
        'Seguir a trilha até as galerias profundas sob Kazordoon, onde o que foi selado tem nome ' +
        'e tem culto. Termina com o selo refeito, ou rompido de vez.',
      levels: [20, 40],
    },
    {
      id: 'ferumbras',
      title: 'IV — A sombra que sempre volta',
      goal:
        'Ferumbras não é a causa; é quem colheu. Enfrentá-lo é adiá-lo, e o grupo precisa decidir ' +
        'o que aceita perder para adiar mais um pouco.',
      levels: [40, 60],
    },
  ],
};

/**
 * Companheiros de Rookgaard.
 *
 * São NPCs do Mestre, não uma segunda IA: ocupam assento na mesa, têm ficha e
 * entram em combate, mas quem os interpreta é o mesmo Mestre, no mesmo turno.
 * Custo de API adicional: nenhum.
 */
export const tibiaCompanions: CompanionDef[] = [
  {
    id: 'brida',
    name: 'Brida Cabeça-Dura',
    classId: 'knight',
    originId: 'rookgaard-born',
    personality:
      'Nasceu na ilha e nunca saiu. Vai na frente por hábito, não por coragem, e reclama do ' +
      'peso da mochila alheia. Confia em porta trancada mais do que em gente. Se o grupo hesita ' +
      'demais, ela decide sozinha — e depois aceita a bronca.',
    catchphrases: [
      '"Se dá pra bater, não é enigma."',
      '"Eu entro primeiro. Vocês contam quantos são."',
      '"Isso aí tá muito quieto pra ser esgoto."',
    ],
  },
  {
    id: 'osmund',
    name: 'Osmund, o Aprendiz',
    classId: 'sorcerer',
    originId: 'edron-scholar',
    personality:
      'Foi mandado para Rookgaard como castigo acadêmico e considera isso um mal-entendido. ' +
      'Sabe o nome exato de tudo e a utilidade de quase nada. Anota o que vê. Fala as palavras ' +
      'de poder alto demais, por orgulho.',
    catchphrases: [
      '"Tecnicamente, isso não deveria estar aqui."',
      '"Exori vis! ...eu disse alto o bastante?"',
      '"Deixa eu anotar antes que nos mate."',
    ],
  },
  {
    id: 'lys',
    name: 'Lys da Vereda',
    classId: 'druid',
    originId: 'abdendriel-ward',
    personality:
      'Cresceu entre elfos em Ab\'Dendriel e trata pedra e bicho com o mesmo respeito cansado. ' +
      'Cura sem alarde e cobra a conta depois, em favores. Percebe o que mudou num lugar antes ' +
      'de qualquer um perceber que havia algo para mudar.',
    catchphrases: [
      '"Isto aqui morreu antes de cair."',
      '"Exura. Não agradeça, ande."',
      '"O mato não recuou sozinho."',
    ],
  },
  {
    id: 'quen',
    name: 'Quen Passo-Curto',
    classId: 'paladin',
    originId: 'venore-merchant',
    personality:
      'Mercador de Venore que virou caçador por dívida, e continua contando moedas no meio do ' +
      'combate. Fica atrás, acerta de longe e avalia o loot antes do inimigo cair. Negociaria ' +
      'com um troll se o troll tivesse ouro.',
    catchphrases: [
      '"Aquilo vale trinta. Não deixem estragar."',
      '"Eu cubro daqui. Daqui é mais seguro."',
      '"Todo mundo tem preço. O truque é descobrir a moeda."',
    ],
  },
];
