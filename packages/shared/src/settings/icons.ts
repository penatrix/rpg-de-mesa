/**
 * Ícone de item.
 *
 * A ambientação pode declarar `icon` em qualquer item, mas anotar cem itens à
 * mão é trabalho que o id já faz: "wand-of-inferno" é uma varinha, "plate-armor"
 * é uma armadura. Este módulo deduz a silhueta do id e do slot e escolhe a cor
 * pela raridade, deixando a anotação explícita apenas para os casos que fogem
 * da regra.
 *
 * Nada aqui é imagem: a silhueta é desenhada em SVG pelo cliente. Além de não
 * custar download, mantém a plataforma longe da arte de jogos comerciais.
 */

import type { ItemDef, ItemIcon, ItemShape, ItemSlot } from './types.js';

/** Palavras no id que denunciam a forma, da mais específica para a mais genérica. */
const SHAPE_BY_KEYWORD: [string, ItemShape][] = [
  ['crossbow', 'crossbow'],
  ['bow', 'bow'],
  ['arrow', 'arrow'],
  ['spear', 'spear'],
  ['hammer', 'hammer'],
  ['axe', 'axe'],
  ['sword', 'sword'],
  ['blade', 'sword'],
  ['club', 'club'],
  ['wand', 'wand'],
  ['rod', 'rod'],
  ['staff', 'rod'],
  ['shield', 'shield'],
  ['helmet', 'helmet'],
  ['hat', 'helmet'],
  ['armor', 'armor'],
  ['robe', 'armor'],
  ['boots', 'boots'],
  ['ring', 'ring'],
  ['amulet', 'amulet'],
  ['necklace', 'amulet'],
  ['potion', 'potion'],
  ['mushroom', 'food'],
  ['bread', 'food'],
  ['meat', 'food'],
  ['coin', 'coin'],
  ['gold', 'coin'],
  ['rope', 'rope'],
  ['shovel', 'shovel'],
  ['scale', 'scale'],
  ['bag', 'bag'],
  ['backpack', 'bag'],
];

const SHAPE_BY_SLOT: Record<ItemSlot, ItemShape> = {
  weapon: 'sword',
  shield: 'shield',
  armor: 'armor',
  helmet: 'helmet',
  legs: 'legs',
  boots: 'boots',
  ring: 'ring',
  amulet: 'amulet',
  consumable: 'potion',
  misc: 'bag',
};

/** Cor base por raridade: comum é ferro batido, lendário é ouro. */
const TINT_BY_RARITY: Record<ItemDef['rarity'], string> = {
  comum: '#8d8577',
  incomum: '#7f9b6a',
  raro: '#6b8fc4',
  épico: '#a274c9',
  lendário: '#d9a441',
};

/** Líquido da poção pelo vital que ela restaura. */
const POTION_TINT: Record<string, string> = {
  hp: '#c0392b',
  mana: '#3d6fb4',
};

export function itemShape(item: ItemDef): ItemShape {
  const id = item.id.toLowerCase();
  for (const [keyword, shape] of SHAPE_BY_KEYWORD) {
    if (id.includes(keyword)) return shape;
  }
  return SHAPE_BY_SLOT[item.slot] ?? 'bag';
}

/**
 * Ícone final de um item: o declarado pela ambientação, ou o deduzido.
 *
 * Puro e determinístico — o mesmo item sempre desenha o mesmo ícone, o que
 * importa quando a peça aparece ao mesmo tempo na mochila e no boneco.
 */
export function itemIcon(item: ItemDef): ItemIcon {
  if (item.icon) return item.icon;

  const shape = itemShape(item);
  const tint =
    shape === 'potion' && item.onUse
      ? (POTION_TINT[item.onUse.vitalId] ?? TINT_BY_RARITY[item.rarity])
      : TINT_BY_RARITY[item.rarity];

  // O detalhe é o cabo/fivela: madeira nas peças comuns, ouro nas melhores.
  const accent = item.rarity === 'comum' || item.rarity === 'incomum' ? '#6b4f2a' : '#d9a441';

  // Só o que é raro brilha — se tudo brilha, nada chama atenção.
  const glow =
    item.rarity === 'épico' || item.rarity === 'lendário'
      ? TINT_BY_RARITY[item.rarity]
      : undefined;

  return { shape, tint, accent, glow };
}

/**
 * Slots do boneco de equipamento, na ordem em que a UI os desenha.
 *
 * `legs` fica na lista mesmo quando uma ambientação ainda não tem calças: o
 * slot vazio é informação — mostra ao jogador o que falta.
 */
export const EQUIPMENT_SLOTS: readonly ItemSlot[] = [
  'amulet',
  'helmet',
  'weapon',
  'armor',
  'shield',
  'ring',
  'legs',
  'boots',
];

/** Rótulo do slot vazio no boneco. */
export const SLOT_LABELS: Record<ItemSlot, string> = {
  weapon: 'Arma',
  shield: 'Escudo',
  armor: 'Corpo',
  helmet: 'Cabeça',
  legs: 'Pernas',
  boots: 'Pés',
  ring: 'Anel',
  amulet: 'Pescoço',
  consumable: 'Consumível',
  misc: 'Tralha',
};

/** Slots que aceitam equipar. Consumíveis e tralha ficam só na mochila. */
export function isEquippable(slot: ItemSlot): boolean {
  return slot !== 'consumable' && slot !== 'misc';
}
