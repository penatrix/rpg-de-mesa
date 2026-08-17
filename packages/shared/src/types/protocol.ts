/**
 * Protocolo Socket.IO entre cliente e servidor.
 *
 * Tipado nos dois lados: o servidor implementa `ClientToServerEvents` e o
 * cliente implementa `ServerToClientEvents`.
 */

import type {
  Character,
  CharacterId,
  DiceRoll,
  GameMasterKind,
  LogEntry,
  PlayerId,
  Scene,
  SettingId,
  TableId,
  TableView,
} from './core.js';

export interface CreateTablePayload {
  settingId: SettingId;
  tableName: string;
  playerName: string;
  gmKind: GameMasterKind;
  allowNpcCompanions: boolean;
  musicEnabled: boolean;
}

export interface JoinTablePayload {
  joinCode: string;
  playerName: string;
  /** Reconexão: mantém o assento e o personagem anteriores. */
  playerId?: PlayerId;
}

export interface CreateCharacterPayload {
  tableId: TableId;
  name: string;
  classId: string;
  originId?: string;
  allocations?: Record<string, number>;
}

export interface RollPayload {
  tableId: TableId;
  notation: string;
  label?: string;
  secret?: boolean;
}

export interface CheckPayload {
  tableId: TableId;
  characterId: CharacterId;
  attributeId: string;
  difficulty: number;
  label?: string;
  bonus?: number;
  advantage?: 'none' | 'advantage' | 'disadvantage';
  secret?: boolean;
}

/** Resolve um teste que o Mestre pediu — a rolagem é do jogador. */
export interface ResolveCheckPayload {
  tableId: TableId;
  checkId: string;
}

/** Recruta ou dispensa um companheiro NPC. */
export type CompanionPayload =
  | { tableId: TableId; action: 'add'; companionId: string }
  | { tableId: TableId; action: 'remove'; participantId: PlayerId };

export interface SayPayload {
  tableId: TableId;
  text: string;
  kind: 'speech' | 'ooc';
}

/** Ação do Mestre humano — o mesmo conjunto que a IA opera via ferramentas. */
export type GmActionPayload =
  | { tableId: TableId; action: 'narrate'; text: string; gmOnly?: boolean }
  | { tableId: TableId; action: 'set-scene'; title: string; description: string; locationId?: string; trackId?: string }
  | { tableId: TableId; action: 'spawn'; bestiaryId: string; count: number }
  | { tableId: TableId; action: 'damage'; combatantId: string; vitalId: string; amount: number }
  | { tableId: TableId; action: 'heal'; combatantId: string; vitalId: string; amount: number }
  | { tableId: TableId; action: 'start-combat' }
  | { tableId: TableId; action: 'end-combat' }
  | { tableId: TableId; action: 'next-turn' }
  | { tableId: TableId; action: 'grant-xp'; characterId: CharacterId; amount: number }
  | { tableId: TableId; action: 'give-item'; characterId: CharacterId; itemId: string; quantity: number }
  | { tableId: TableId; action: 'set-music'; trackId: string | null };

export interface AiTurnPayload {
  tableId: TableId;
  /** Mensagem do jogador que provoca a resposta do Mestre IA. */
  prompt: string;
}

export interface ClientToServerEvents {
  'table:create': (
    payload: CreateTablePayload,
    ack: (result: Result<{ table: TableView; playerId: PlayerId }>) => void,
  ) => void;
  'table:join': (
    payload: JoinTablePayload,
    ack: (result: Result<{ table: TableView; playerId: PlayerId }>) => void,
  ) => void;
  'table:leave': (payload: { tableId: TableId }) => void;

  'character:create': (
    payload: CreateCharacterPayload,
    ack: (result: Result<{ character: Character }>) => void,
  ) => void;
  'character:update': (
    payload: { tableId: TableId; character: Character },
    ack: (result: Result<{ character: Character }>) => void,
  ) => void;

  'dice:roll': (payload: RollPayload, ack: (result: Result<{ roll: DiceRoll }>) => void) => void;
  'dice:check': (payload: CheckPayload, ack: (result: Result<{ roll: DiceRoll }>) => void) => void;
  'dice:resolve-check': (
    payload: ResolveCheckPayload,
    ack: (result: Result<{ roll: DiceRoll }>) => void,
  ) => void;

  'table:companion': (payload: CompanionPayload, ack: (result: Result<null>) => void) => void;

  'chat:say': (payload: SayPayload) => void;

  'gm:action': (payload: GmActionPayload, ack: (result: Result<null>) => void) => void;
  'gm:ai-turn': (payload: AiTurnPayload, ack: (result: Result<null>) => void) => void;
}

export interface ServerToClientEvents {
  'table:state': (table: TableView) => void;
  'table:log': (entry: LogEntry) => void;
  /** Trecho de narração do Mestre IA chegando em tempo real. */
  'table:narration-delta': (payload: { entryId: string; text: string }) => void;
  'table:narration-end': (payload: { entryId: string }) => void;
  'table:scene': (scene: Scene) => void;
  'table:roll': (roll: DiceRoll) => void;
  'table:error': (payload: { message: string }) => void;
  /** O Mestre IA está pensando — usado para o indicador na UI. */
  'table:gm-thinking': (payload: { thinking: boolean }) => void;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = <T = never>(error: string): Result<T> => ({ ok: false, error });
