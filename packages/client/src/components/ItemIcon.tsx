/**
 * Ícones de item desenhados em SVG.
 *
 * Nada aqui é sprite: cada item é um punhado de formas vetoriais coloridas
 * pela raridade. A razão é dupla — a plataforma não baixa nenhum asset, e a
 * arte de Tibia pertence à CipSoft. Um ícone desenhado por nós é honesto sobre
 * o que é, e ainda muda de cor conforme o item melhora.
 */

import type { ReactElement } from 'react';

import type { ItemDef, ItemShape } from '@rpg/shared';
import { itemIcon } from '@rpg/shared';

/** Escurece uma cor hex — usado para a sombra da própria peça. */
function shade(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const channels = [0, 2, 4].map((offset) => {
    const raw = Number.parseInt(full.slice(offset, offset + 2), 16);
    return Math.max(0, Math.min(255, Math.round(raw * amount)));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

interface ShapeProps {
  tint: string;
  accent: string;
  dark: string;
}

/**
 * Uma silhueta por forma.
 *
 * Todas desenham dentro de 0 0 32 32 e usam as mesmas três cores, para que
 * qualquer item novo herde o visual do conjunto sem ajuste manual.
 */
const SHAPES: Record<ItemShape, (props: ShapeProps) => ReactElement> = {
  sword: ({ tint, accent, dark }) => (
    <>
      <path d="M16 3l3 4v14h-6V7z" fill={tint} />
      <path d="M16 3l3 4v14h-3z" fill={dark} />
      <rect x="9" y="21" width="14" height="3" fill={accent} />
      <rect x="15" y="24" width="2" height="5" fill={accent} />
      <circle cx="16" cy="29" r="1.6" fill={accent} />
    </>
  ),
  axe: ({ tint, accent, dark }) => (
    <>
      <rect x="15" y="4" width="2.5" height="25" fill={accent} />
      <path d="M17 5c6 0 10 3 10 7s-4 7-10 7z" fill={tint} />
      <path d="M17 12c4 0 7 1 7 0s-3-7-7-7z" fill={dark} />
    </>
  ),
  club: ({ tint, accent }) => (
    <>
      <rect x="14" y="16" width="4" height="13" rx="1.5" fill={accent} />
      <path d="M16 3c4 0 6 4 6 8s-2 6-6 6-6-2-6-6 2-8 6-8z" fill={tint} />
      <circle cx="13" cy="9" r="1.2" fill={accent} />
      <circle cx="19" cy="12" r="1.2" fill={accent} />
    </>
  ),
  hammer: ({ tint, accent, dark }) => (
    <>
      <rect x="15" y="12" width="3" height="17" fill={accent} />
      <rect x="7" y="4" width="19" height="9" rx="1.5" fill={tint} />
      <rect x="7" y="9" width="19" height="4" fill={dark} />
    </>
  ),
  spear: ({ tint, accent }) => (
    <>
      <rect x="15" y="10" width="2" height="19" fill={accent} />
      <path d="M16 2l4 8h-8z" fill={tint} />
      <rect x="13" y="10" width="6" height="2" fill={tint} />
    </>
  ),
  bow: ({ tint, accent }) => (
    <>
      <path d="M10 4c8 4 8 20 0 24" stroke={tint} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M10 4L10 28" stroke={accent} strokeWidth="1.2" fill="none" />
      <path d="M12 16h14" stroke={accent} strokeWidth="1.4" />
      <path d="M22 13l4 3-4 3z" fill={tint} />
    </>
  ),
  crossbow: ({ tint, accent, dark }) => (
    <>
      <rect x="14" y="8" width="4" height="20" rx="1" fill={accent} />
      <path d="M3 10c5-2 21-2 26 0" stroke={tint} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M4 11l12 5 12-5" stroke={dark} strokeWidth="1.2" fill="none" />
      <rect x="12" y="18" width="8" height="3" fill={tint} />
    </>
  ),
  arrow: ({ tint, accent }) => (
    <>
      <rect x="15" y="8" width="2" height="20" fill={accent} />
      <path d="M16 2l4 7h-8z" fill={tint} />
      <path d="M12 24l4 4 4-4" stroke={tint} strokeWidth="1.6" fill="none" />
    </>
  ),
  wand: ({ tint, accent, dark }) => (
    <>
      <rect
        x="15"
        y="12"
        width="3"
        height="17"
        rx="1.5"
        fill={accent}
        transform="rotate(-12 16 20)"
      />
      <path d="M18 3l2.2 4.6L25 9l-4 3 1 5-4-2.6L14 17l1-5-4-3 4.8-1.4z" fill={tint} />
      <circle cx="18" cy="9.5" r="1.6" fill={dark} />
    </>
  ),
  rod: ({ tint, accent, dark }) => (
    <>
      <rect x="15" y="11" width="3" height="18" rx="1.5" fill={accent} />
      <circle cx="16.5" cy="8" r="6" fill={tint} />
      <circle cx="14.5" cy="6" r="2" fill={dark} opacity="0.7" />
    </>
  ),
  shield: ({ tint, accent, dark }) => (
    <>
      <path d="M16 3l11 4v9c0 7-5 12-11 14C10 28 5 23 5 16V7z" fill={tint} />
      <path d="M16 3v27c6-2 11-7 11-14V7z" fill={dark} />
      <path d="M16 8v14" stroke={accent} strokeWidth="2" />
      <path d="M9 13h14" stroke={accent} strokeWidth="2" />
    </>
  ),
  helmet: ({ tint, accent, dark }) => (
    <>
      <path d="M6 18a10 10 0 0120 0v8H6z" fill={tint} />
      <path d="M16 8a10 10 0 0110 10v8h-10z" fill={dark} />
      <rect x="10" y="15" width="12" height="3" rx="1" fill={accent} />
      <rect x="15" y="18" width="2" height="8" fill={accent} />
    </>
  ),
  armor: ({ tint, accent, dark }) => (
    <>
      <path d="M10 5h12l4 4-2 5 2 13H8l2-13-2-5z" fill={tint} />
      <path d="M16 5h6l4 4-2 5 2 13h-10z" fill={dark} />
      <path d="M16 12v13" stroke={accent} strokeWidth="1.6" />
      <path d="M10 14h12" stroke={accent} strokeWidth="1.4" />
    </>
  ),
  legs: ({ tint, accent, dark }) => (
    <>
      <path d="M8 4h16v8l-2 16h-5l-1-12-1 12h-5L8 12z" fill={tint} />
      <path d="M16 4h8v8l-2 16h-5l-1-12z" fill={dark} />
      <rect x="8" y="4" width="16" height="3" fill={accent} />
    </>
  ),
  boots: ({ tint, accent, dark }) => (
    <>
      <path d="M9 4h7v14l7 3v6H9z" fill={tint} />
      <path d="M16 18l7 3v6h-7z" fill={dark} />
      <rect x="9" y="25" width="14" height="3" fill={accent} />
    </>
  ),
  ring: ({ tint, accent }) => (
    <>
      <circle cx="16" cy="19" r="8.5" fill="none" stroke={tint} strokeWidth="3.4" />
      <path d="M16 3l4 6h-8z" fill={accent} />
      <circle cx="16" cy="8" r="2.6" fill={accent} />
    </>
  ),
  amulet: ({ tint, accent }) => (
    <>
      <path d="M7 5c3 8 6 11 9 11s6-3 9-11" stroke={accent} strokeWidth="1.8" fill="none" />
      <path d="M16 15l6 6-6 8-6-8z" fill={tint} />
      <path d="M16 19l2.5 2.5L16 25l-2.5-3.5z" fill={accent} opacity="0.8" />
    </>
  ),
  potion: ({ tint, accent }) => (
    <>
      <rect x="13" y="3" width="6" height="5" rx="1" fill={accent} />
      <path d="M12 8h8l4 8v9a3 3 0 01-3 3H11a3 3 0 01-3-3v-9z" fill={tint} opacity="0.35" />
      <path d="M9 17h14v8a3 3 0 01-3 3H12a3 3 0 01-3-3z" fill={tint} />
      <circle cx="13" cy="21" r="1.4" fill="#ffffff" opacity="0.35" />
    </>
  ),
  food: ({ tint, accent }) => (
    <>
      <path d="M5 15a11 8 0 0122 0z" fill={tint} />
      <rect x="13" y="15" width="6" height="13" rx="2.5" fill={accent} />
      <circle cx="11" cy="11" r="1.6" fill={accent} opacity="0.6" />
      <circle cx="20" cy="12" r="1.2" fill={accent} opacity="0.6" />
    </>
  ),
  coin: ({ tint, accent }) => (
    <>
      <circle cx="12" cy="18" r="8" fill={tint} />
      <circle cx="20" cy="14" r="9" fill={tint} />
      <circle cx="20" cy="14" r="5.5" fill="none" stroke={accent} strokeWidth="1.6" />
      <path d="M20 10v8M17 14h6" stroke={accent} strokeWidth="1.4" />
    </>
  ),
  rope: ({ tint, accent }) => (
    <>
      <ellipse cx="16" cy="12" rx="10" ry="4.5" fill="none" stroke={tint} strokeWidth="3" />
      <ellipse cx="16" cy="18" rx="10" ry="4.5" fill="none" stroke={tint} strokeWidth="3" />
      <path d="M24 20c3 3 2 8-2 8" stroke={accent} strokeWidth="2.4" fill="none" />
    </>
  ),
  shovel: ({ tint, accent }) => (
    <>
      <rect x="15" y="3" width="2.5" height="16" fill={accent} />
      <rect x="12" y="3" width="8" height="2.5" rx="1.2" fill={accent} />
      <path d="M10 19h12v4a6 6 0 01-12 0z" fill={tint} />
    </>
  ),
  scale: ({ tint, accent, dark }) => (
    <>
      <path d="M16 3c7 4 10 10 10 15s-4 11-10 11S6 23 6 18 9 7 16 3z" fill={tint} />
      <path d="M16 3c7 4 10 10 10 15s-4 11-10 11z" fill={dark} />
      <path d="M16 10c3 3 4 6 4 8" stroke={accent} strokeWidth="1.4" fill="none" />
    </>
  ),
  bag: ({ tint, accent, dark }) => (
    <>
      <path d="M11 8V6a5 5 0 0110 0v2" stroke={accent} strokeWidth="2" fill="none" />
      <path d="M7 8h18l2 20H5z" fill={tint} />
      <path d="M16 8h9l2 20h-11z" fill={dark} />
      <rect x="12" y="16" width="8" height="4" rx="1" fill={accent} />
    </>
  ),
};

export function ItemIcon({ item, size = 32 }: { item: ItemDef; size?: number }) {
  const icon = itemIcon(item);
  const accent = icon.accent ?? '#6b4f2a';
  const Shape = SHAPES[icon.shape];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={item.name}
      className={icon.glow ? 'item-icon glowing' : 'item-icon'}
      style={icon.glow ? { filter: `drop-shadow(0 0 3px ${icon.glow})` } : undefined}
    >
      <Shape tint={icon.tint} accent={accent} dark={shade(icon.tint, 0.72)} />
    </svg>
  );
}
