/**
 * Aplicação do tema da ambientação.
 *
 * A UI inteira é escrita contra variáveis CSS. Trocar de ambientação é trocar
 * o valor das variáveis na raiz — nenhum componente conhece Tibia ou qualquer
 * outro mundo, e uma ambientação nova ganha a UI adaptada sem tocar em React.
 */

import type { SettingDefinition } from '@rpg/shared';

export function applyTheme(setting: SettingDefinition | null): void {
  const root = document.documentElement;

  if (!setting) {
    root.removeAttribute('data-setting');
    return;
  }

  const { colors, fonts, backdrop, radius } = setting.theme;

  root.style.setProperty('--bg', colors.bg);
  root.style.setProperty('--bg-elevated', colors.bgElevated);
  root.style.setProperty('--surface', colors.surface);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--text', colors.text);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-soft', colors.accentSoft);
  root.style.setProperty('--danger', colors.danger);
  root.style.setProperty('--success', colors.success);

  for (const [id, color] of Object.entries(colors.vitals)) {
    root.style.setProperty(`--vital-${id}`, color);
  }

  root.style.setProperty('--font-display', fonts.display);
  root.style.setProperty('--font-body', fonts.body);
  root.style.setProperty('--font-mono', fonts.mono);
  root.style.setProperty('--backdrop', backdrop);
  root.style.setProperty('--radius', `${radius}px`);

  root.setAttribute('data-setting', setting.id);
  root.setAttribute('data-dice-style', setting.theme.diceStyle);
}

/** Cor de um vital, com um cinza de reserva para ambientações que não definam. */
export function vitalColor(vitalId: string): string {
  return `var(--vital-${vitalId}, var(--accent))`;
}
