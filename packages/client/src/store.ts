/**
 * Estado do cliente.
 *
 * O servidor é a fonte da verdade: a store guarda a última projeção recebida e
 * aplica só as atualizações incrementais (deltas de narração) que não valem uma
 * retransmissão do estado inteiro.
 */

import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';

import type {
  Character,
  ClientToServerEvents,
  DiceRoll,
  LogEntry,
  Result,
  ServerToClientEvents,
  SettingDefinition,
  TableView,
} from '@rpg/shared';

import type { SettingSummary } from '@rpg/shared';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Guarda o assento entre recarregamentos: F5 não faz perder o personagem. */
const SEAT_KEY = 'rpg-de-mesa:seat';

interface Seat {
  playerId: string;
  joinCode: string;
  playerName: string;
}

function loadSeat(): Seat | null {
  try {
    const raw = localStorage.getItem(SEAT_KEY);
    return raw ? (JSON.parse(raw) as Seat) : null;
  } catch {
    return null;
  }
}

function saveSeat(seat: Seat | null): void {
  try {
    if (seat) localStorage.setItem(SEAT_KEY, JSON.stringify(seat));
    else localStorage.removeItem(SEAT_KEY);
  } catch {
    // localStorage indisponível (modo privado, quota): a sessão só perde a
    // reconexão automática, o jogo continua.
  }
}

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

/** Envolve os acks do socket numa Promise para usar com async/await. */
function request<T>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('O servidor não respondeu.')), 20_000);
    (socket.emit as (e: string, p: unknown, ack: (r: Result<T>) => void) => void)(
      event,
      payload,
      (result: Result<T>) => {
        clearTimeout(timeout);
        if (result.ok) resolve(result.data);
        else reject(new Error(result.error));
      },
    );
  });
}

export const useStore = create<State>((set, get) => ({
  socket: null,
  connected: false,
  screen: 'home',
  summaries: [],
  setting: null,
  table: null,
  playerId: null,
  gmThinking: false,
  lastRoll: null,
  error: null,

  connect() {
    if (get().socket) return;
    const socket: ClientSocket = io({ autoConnect: true, transports: ['websocket', 'polling'] });

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));

    socket.on('table:state', (table) => set({ table }));

    socket.on('table:log', (entry: LogEntry) => {
      const table = get().table;
      if (!table) return;
      // Uma entrada pode chegar duas vezes (log + retransmissão de estado);
      // deduplica por id em vez de confiar na ordem de chegada.
      if (table.log.some((e) => e.id === entry.id)) return;
      set({ table: { ...table, log: [...table.log, entry] } });
    });

    socket.on('table:narration-delta', ({ entryId, text }) => {
      const table = get().table;
      if (!table) return;
      set({
        table: {
          ...table,
          log: table.log.map((entry) =>
            entry.id === entryId ? { ...entry, text: entry.text + text, streaming: true } : entry,
          ),
        },
      });
    });

    socket.on('table:narration-end', ({ entryId }) => {
      const table = get().table;
      if (!table) return;
      set({
        table: {
          ...table,
          log: table.log.map((entry) =>
            entry.id === entryId ? { ...entry, streaming: false } : entry,
          ),
        },
      });
    });

    socket.on('table:scene', (scene) => {
      const table = get().table;
      if (table) set({ table: { ...table, scene } });
    });

    socket.on('table:roll', (roll) => set({ lastRoll: roll }));
    socket.on('table:gm-thinking', ({ thinking }) => set({ gmThinking: thinking }));
    socket.on('table:error', ({ message }) => set({ error: message }));

    set({ socket });
  },

  async loadSummaries() {
    const response = await fetch('/api/settings');
    const data = (await response.json()) as { settings: SettingSummary[] };
    set({ summaries: data.settings });
  },

  async loadSetting(id: string) {
    const cached = get().setting;
    if (cached?.id === id) return cached;
    const response = await fetch(`/api/settings/${id}`);
    if (!response.ok) throw new Error('Ambientação não encontrada.');
    const data = (await response.json()) as { setting: SettingDefinition };
    set({ setting: data.setting });
    return data.setting;
  },

  async createTable(input) {
    get().connect();
    const socket = get().socket!;
    try {
      const data = await request<{ table: TableView; playerId: string }>(
        socket,
        'table:create',
        input,
      );
      await get().loadSetting(data.table.config.settingId);
      saveSeat({
        playerId: data.playerId,
        joinCode: data.table.joinCode,
        playerName: input.playerName,
      });
      set({
        table: data.table,
        playerId: data.playerId,
        error: null,
        screen: data.table.viewerRole === 'gm' ? 'table' : 'character',
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Falha ao criar a mesa.' });
      throw error;
    }
  },

  async joinTable(joinCode, playerName) {
    get().connect();
    const socket = get().socket!;
    try {
      const data = await request<{ table: TableView; playerId: string }>(socket, 'table:join', {
        joinCode,
        playerName,
      });
      await get().loadSetting(data.table.config.settingId);
      saveSeat({ playerId: data.playerId, joinCode: data.table.joinCode, playerName });

      const hasCharacter = data.table.participants.some(
        (p) => p.id === data.playerId && p.characterId,
      );
      set({
        table: data.table,
        playerId: data.playerId,
        error: null,
        screen: data.table.viewerRole === 'gm' || hasCharacter ? 'table' : 'character',
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Falha ao entrar na mesa.' });
      throw error;
    }
  },

  /** Reconecta ao assento salvo depois de um F5. */
  async tryResume() {
    const seat = loadSeat();
    if (!seat) return false;

    get().connect();
    const socket = get().socket!;
    try {
      const data = await request<{ table: TableView; playerId: string }>(socket, 'table:join', {
        joinCode: seat.joinCode,
        playerName: seat.playerName,
        playerId: seat.playerId,
      });
      await get().loadSetting(data.table.config.settingId);
      saveSeat({ ...seat, playerId: data.playerId });

      const hasCharacter = data.table.participants.some(
        (p) => p.id === data.playerId && p.characterId,
      );
      set({
        table: data.table,
        playerId: data.playerId,
        screen: data.table.viewerRole === 'gm' || hasCharacter ? 'table' : 'character',
      });
      return true;
    } catch {
      // Mesa apagada ou código inválido: descarta o assento e volta ao início.
      saveSeat(null);
      return false;
    }
  },

  leaveTable() {
    const { socket, table } = get();
    if (socket && table) socket.emit('table:leave', { tableId: table.id });
    saveSeat(null);
    set({ table: null, playerId: null, screen: 'home', setting: null, lastRoll: null });
  },

  async createCharacter(input) {
    const { socket, table } = get();
    if (!socket || !table) return;
    try {
      await request(socket, 'character:create', { tableId: table.id, ...input });
      set({ screen: 'table', error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Falha ao criar o personagem.' });
    }
  },

  async updateCharacter(character) {
    const { socket, table } = get();
    if (!socket || !table) return;
    try {
      await request(socket, 'character:update', { tableId: table.id, character });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Falha ao salvar a ficha.' });
    }
  },

  async rollDice(notation, label, secret) {
    const { socket, table } = get();
    if (!socket || !table) return;
    try {
      await request(socket, 'dice:roll', { tableId: table.id, notation, label, secret });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Rolagem inválida.' });
    }
  },

  async check(input) {
    const { socket, table } = get();
    if (!socket || !table) return;
    try {
      await request(socket, 'dice:check', { tableId: table.id, ...input });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Teste inválido.' });
    }
  },

  say(text, kind) {
    const { socket, table } = get();
    if (!socket || !table || !text.trim()) return;
    socket.emit('chat:say', { tableId: table.id, text: text.trim(), kind });
  },

  async askGm(prompt) {
    const { socket, table } = get();
    if (!socket || !table || !prompt.trim()) return;
    try {
      await request(socket, 'gm:ai-turn', { tableId: table.id, prompt: prompt.trim() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'O Mestre não respondeu.' });
    }
  },

  async gmAction(payload) {
    const { socket, table } = get();
    if (!socket || !table) return;
    try {
      await request(socket, 'gm:action', { tableId: table.id, ...payload });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Ação recusada.' });
    }
  },

  setScreen(screen) {
    set({ screen });
  },

  clearError() {
    set({ error: null });
  },
}));

/** Personagem do jogador atual, quando existe. */
export function useMyCharacter(): Character | null {
  return useStore((state) => {
    if (!state.table || !state.playerId) return null;
    const me = state.table.participants.find((p) => p.id === state.playerId);
    return state.table.characters.find((c) => c.id === me?.characterId) ?? null;
  });
}

export function useIsGm(): boolean {
  return useStore((state) => state.table?.viewerRole === 'gm');
}
