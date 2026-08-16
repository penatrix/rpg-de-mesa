import type { Character, SettingDefinition, VitalState } from '@rpg/shared';
export declare function VitalBar({ id, name, state, }: {
    id: string;
    name: string;
    state: VitalState;
}): import("react").JSX.Element;
export declare function CharacterSheet({ character, setting, editable, }: {
    character: Character;
    setting: SettingDefinition;
    editable: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=CharacterSheet.d.ts.map