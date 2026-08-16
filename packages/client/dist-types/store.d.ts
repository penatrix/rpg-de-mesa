/**
 * Estado do cliente.
 *
 * O servidor é a fonte da verdade: a store guarda a última projeção recebida e
 * aplica só as atualizações incrementais (deltas de narração) que não valem uma
 * retransmissão do estado inteiro.
 */
import { type Socket } from 'socket.io-client';
import type { Character, ClientToServerEvents, DiceRoll, ServerToClientEvents, SettingDefinition, TableView } from '@rpg/shared';
import type { SettingSummary } from '@rpg/shared';
type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type Screen = 'home' | 'lobby' | 'character' | 'table';
interface State {
    socket: ClientSocket | null;
    connected: boolean;
    screen: Screen;
    summaries: SettingSummary[];
    setting: SettingDefinition | null;
    table: TableView | null;
    playerId: string | null;
    gmThinking: boolean;
    lastRoll: DiceRoll | null;
    error: string | null;
    connect(): void;
    loadSummaries(): Promise<void>;
    loadSetting(id: string): Promise<SettingDefinition>;
    createTable(input: {
        settingId: string;
        tableName: string;
        playerName: string;
        gmKind: 'human' | 'ai';
        allowNpcCompanions: boolean;
        musicEnabled: boolean;
    }): Promise<void>;
    joinTable(joinCode: string, playerName: string): Promise<void>;
    tryResume(): Promise<boolean>;
    leaveTable(): void;
    createCharacter(input: {
        name: string;
        classId: string;
        originId?: string;
        allocations?: Record<string, number>;
    }): Promise<void>;
    updateCharacter(character: Character): Promise<void>;
    rollDice(notation: string, label?: string, secret?: boolean): Promise<void>;
    check(input: {
        characterId: string;
        attributeId: string;
        difficulty: number;
        label?: string;
        advantage?: 'none' | 'advantage' | 'disadvantage';
        secret?: boolean;
    }): Promise<void>;
    say(text: string, kind: 'speech' | 'ooc'): void;
    askGm(prompt: string): Promise<void>;
    gmAction(payload: Record<string, unknown>): Promise<void>;
    setScreen(screen: Screen): void;
    clearError(): void;
}
export declare const useStore: import("zustand").UseBoundStore<import("zustand").StoreApi<State>>;
/** Personagem do jogador atual, quando existe. */
export declare function useMyCharacter(): Character | null;
export declare function useIsGm(): boolean;
export {};
//# sourceMappingURL=store.d.ts.map