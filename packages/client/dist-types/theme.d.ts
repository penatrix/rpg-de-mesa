/**
 * Aplicação do tema da ambientação.
 *
 * A UI inteira é escrita contra variáveis CSS. Trocar de ambientação é trocar
 * o valor das variáveis na raiz — nenhum componente conhece Tibia ou qualquer
 * outro mundo, e uma ambientação nova ganha a UI adaptada sem tocar em React.
 */
import type { SettingDefinition } from '@rpg/shared';
export declare function applyTheme(setting: SettingDefinition | null): void;
/** Cor de um vital, com um cinza de reserva para ambientações que não definam. */
export declare function vitalColor(vitalId: string): string;
//# sourceMappingURL=theme.d.ts.map