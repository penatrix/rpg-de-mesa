/**
 * Registro de ambientações.
 *
 * Adicionar um mundo novo é adicionar uma entrada aqui — nem o motor de regras
 * nem a UI precisam mudar.
 */

import type { SettingDefinition } from './types.js';
import { tibiaSetting } from './tibia/index.js';
import { cosmicHorrorSetting } from './cosmic-horror/index.js';
import { spaceOperaSetting } from './space-opera/index.js';

const settings: SettingDefinition[] = [tibiaSetting, cosmicHorrorSetting, spaceOperaSetting];

const bySettingId = new Map(settings.map((setting) => [setting.id, setting]));

export function listSettings(): SettingDefinition[] {
  return settings;
}

/** Resumo leve para a tela de seleção — evita mandar o bestiário inteiro. */
export interface SettingSummary {
  id: string;
  name: string;
  tagline: string;
  description: string;
  status: SettingDefinition['status'];
  accent: string;
  classCount: number;
  bestiaryCount: number;
  locationCount: number;
}

export function listSettingSummaries(): SettingSummary[] {
  return settings.map((setting) => ({
    id: setting.id,
    name: setting.name,
    tagline: setting.tagline,
    description: setting.description,
    status: setting.status,
    accent: setting.theme.colors.accent,
    classCount: setting.characterModel.classes.length,
    bestiaryCount: setting.bestiary.length,
    locationCount: setting.locations.length,
  }));
}

export function getSetting(id: string): SettingDefinition | undefined {
  return bySettingId.get(id);
}

/** Como `getSetting`, mas lança quando o id é desconhecido. */
export function requireSetting(id: string): SettingDefinition {
  const setting = bySettingId.get(id);
  if (!setting) {
    throw new Error(`Ambientação desconhecida: "${id}". Disponíveis: ${[...bySettingId.keys()].join(', ')}`);
  }
  return setting;
}

export { tibiaSetting, cosmicHorrorSetting, spaceOperaSetting };
