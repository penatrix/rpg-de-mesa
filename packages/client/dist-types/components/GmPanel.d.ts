import type { SettingDefinition, TableView } from '@rpg/shared';
/**
 * Painel do Mestre humano.
 *
 * Expõe exatamente as mesmas ações que o Mestre IA aciona por ferramenta — é
 * o mesmo conjunto no servidor, então nenhum dos dois pode fazer algo que o
 * outro não possa.
 */
export declare function GmPanel({ table, setting }: {
    table: TableView;
    setting: SettingDefinition;
}): import("react").JSX.Element;
//# sourceMappingURL=GmPanel.d.ts.map