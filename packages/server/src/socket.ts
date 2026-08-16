/**
 * Camada de tempo real.
 *
 * Traduz eventos de socket em ações do gerenciador de mesas, aplica as
 * permissões (Mestre vs jogador) e devolve a cada cliente uma projeção do
 * estado já filtrada — informação de Mestre nunca chega ao cliente de um
 * jogador, nem mesmo escondida.
 */

import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';

import {
  err,
  ok,
  type ClientToServerEvents,
  type DiceRoll,
  type LogEntry,
  type Scene,
  type ServerToClientEvents,
} from '@rpg/shared';

import * as tables from './tables.js';
import { TableError } from './tables.js';
import { getGameMaster } from './gm/aiGameMaster.js';

interface SocketData {
  playerId?: string;
  tableId?: string;
}

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>;

/** Impede dois turnos de Mestre IA simultâneos na mesma mesa. */
const gmTurnLocks = new Set<string>();

function roomOf(tableId: string): string {
  return `table:${tableId}`;
}

function messageOf(error: unknown): string {
  if (error instanceof TableError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Erro inesperado.';
}

export function attachSockets(httpServer: HttpServer): TypedServer {
  const io: TypedServer = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    // Mesas de RPG ficam abertas por horas com longos silêncios; o padrão de
    // 20s derrubaria conexões ociosas sem motivo.
    pingTimeout: 60_000,
  });

  /**
   * Envia a cada socket da sala a sua própria projeção do estado. É por isso
   * que não usamos um broadcast único: cada participante vê um recorte
   * diferente conforme o papel.
   */
  const broadcastState = (tableId: string): void => {
    const table = tables.getTable(tableId);
    for (const socket of io.sockets.sockets.values()) {
      const typed = socket as TypedSocket;
      if (typed.data.tableId !== tableId || !typed.data.playerId) continue;
      typed.emit('table:state', tables.viewFor(table, typed.data.playerId));
    }
  };

  tables.setEmitter({
    state: broadcastState,
    log: (tableId: string, entry: LogEntry) => {
      for (const socket of io.sockets.sockets.values()) {
        const typed = socket as TypedSocket;
        if (typed.data.tableId !== tableId || !typed.data.playerId) continue;
        // Entradas de Mestre só chegam ao Mestre.
        if (entry.gmOnly) {
          const table = tables.getTable(tableId);
          if (!tables.isGameMaster(table, typed.data.playerId)) continue;
        }
        typed.emit('table:log', entry);
      }
    },
    scene: (tableId: string, scene: Scene) => {
      io.to(roomOf(tableId)).emit('table:scene', scene);
    },
    roll: (tableId: string, diceRoll: DiceRoll) => {
      io.to(roomOf(tableId)).emit('table:roll', diceRoll);
    },
  });

  io.on('connection', (socket: TypedSocket) => {
    // --- Entrada -----------------------------------------------------------

    socket.on('table:create', (payload, ack) => {
      try {
        const { table, playerId } = tables.createTable({
          settingId: payload.settingId,
          tableName: payload.tableName,
          playerName: payload.playerName,
          gmKind: payload.gmKind,
          allowNpcCompanions: payload.allowNpcCompanions,
          musicEnabled: payload.musicEnabled,
        });

        socket.data.playerId = playerId;
        socket.data.tableId = table.id;
        void socket.join(roomOf(table.id));

        ack(ok({ table: tables.viewFor(table, playerId), playerId }));
      } catch (error) {
        ack(err(messageOf(error)));
      }
    });

    socket.on('table:join', (payload, ack) => {
      try {
        const { table, playerId } = tables.joinTable(
          payload.joinCode,
          payload.playerName,
          payload.playerId,
        );

        socket.data.playerId = playerId;
        socket.data.tableId = table.id;
        void socket.join(roomOf(table.id));

        ack(ok({ table: tables.viewFor(table, playerId), playerId }));
        broadcastState(table.id);
      } catch (error) {
        ack(err(messageOf(error)));
      }
    });

    socket.on('table:leave', ({ tableId }) => {
      if (socket.data.playerId) tables.markDisconnected(tableId, socket.data.playerId);
      void socket.leave(roomOf(tableId));
      socket.data.tableId = undefined;
    });

    // --- Personagem --------------------------------------------------------

    socket.on('character:create', (payload, ack) => {
      try {
        const { table, playerId } = requireSeat(socket, payload.tableId);
        const character = tables.createCharacterForPlayer(table, playerId, {
          name: payload.name,
          classId: payload.classId,
          originId: payload.originId,
          allocations: payload.allocations,
        });
        ack(ok({ character }));
      } catch (error) {
        ack(err(messageOf(error)));
      }
    });

    socket.on('character:update', (payload, ack) => {
      try {
        const { table, playerId } = requireSeat(socket, payload.tableId);
        const character = tables.updateCharacter(table, playerId, payload.character);
        ack(ok({ character }));
      } catch (error) {
        ack(err(messageOf(error)));
      }
    });

    // --- Dados -------------------------------------------------------------

    socket.on('dice:roll', (payload, ack) => {
      try {
        const { table, playerId } = requireSeat(socket, payload.tableId);
        const diceRoll = tables.rollForTable(
          table,
          playerId,
          payload.notation,
          payload.label,
          payload.secret,
        );
        ack(ok({ roll: diceRoll }));
      } catch (error) {
        ack(err(messageOf(error)));
      }
    });

    socket.on('dice:check', (payload, ack) => {
      try {
        const { table, playerId } = requireSeat(socket, payload.tableId);
        const diceRoll = tables.checkForTable(table, playerId, {
          characterId: payload.characterId,
          attributeId: payload.attributeId,
          difficulty: payload.difficulty,
          label: payload.label,
          bonus: payload.bonus,
          advantage: payload.advantage,
          secret: payload.secret,
        });
        ack(ok({ roll: diceRoll }));
      } catch (error) {
        ack(err(messageOf(error)));
      }
    });

    // --- Conversa ----------------------------------------------------------

    socket.on('chat:say', (payload) => {
      try {
        const { table, playerId } = requireSeat(socket, payload.tableId);
        tables.say(table, playerId, payload.text, payload.kind);
      } catch (error) {
        socket.emit('table:error', { message: messageOf(error) });
      }
    });

    // --- Painel do Mestre --------------------------------------------------

    socket.on('gm:action', (payload, ack) => {
      try {
        const { table, playerId } = requireSeat(socket, payload.tableId);
        if (!tables.isGameMaster(table, playerId)) {
          ack(err('Apenas o Mestre pode executar esta ação.'));
          return;
        }

        switch (payload.action) {
          case 'narrate':
            tables.narrate(table, payload.text, payload.gmOnly ?? false);
            break;
          case 'set-scene':
            tables.setScene(table, {
              title: payload.title,
              description: payload.description,
              locationId: payload.locationId,
              trackId: payload.trackId,
            });
            break;
          case 'spawn':
            tables.spawnCreatures(table, payload.bestiaryId, payload.count);
            break;
          case 'damage':
            tables.damageCombatant(table, payload.combatantId, payload.vitalId, payload.amount);
            break;
          case 'heal':
            tables.healCombatant(table, payload.combatantId, payload.vitalId, payload.amount);
            break;
          case 'start-combat':
            tables.startCombat(table);
            break;
          case 'end-combat':
            tables.endCombat(table);
            break;
          case 'next-turn':
            tables.nextTurn(table);
            break;
          case 'grant-xp':
            tables.grantXp(table, payload.characterId, payload.amount);
            break;
          case 'give-item':
            tables.giveItem(table, payload.characterId, payload.itemId, payload.quantity);
            break;
          case 'set-music':
            tables.setMusic(table, payload.trackId);
            break;
        }
        ack(ok(null));
      } catch (error) {
        ack(err(messageOf(error)));
      }
    });

    // --- Turno do Mestre IA ------------------------------------------------

    socket.on('gm:ai-turn', (payload, ack) => {
      let table;
      let playerId: string;
      try {
        const seat = requireSeat(socket, payload.tableId);
        table = seat.table;
        playerId = seat.playerId;
      } catch (error) {
        ack(err(messageOf(error)));
        return;
      }

      if (table.config.gmKind !== 'ai') {
        ack(err('Esta mesa tem um Mestre humano.'));
        return;
      }
      if (gmTurnLocks.has(table.id)) {
        ack(err('O Mestre ainda está respondendo ao turno anterior.'));
        return;
      }

      // A ação do jogador entra no log antes do turno para que o Mestre a veja
      // no contexto e para que os outros jogadores acompanhem.
      tables.say(table, playerId, payload.prompt, 'speech');

      gmTurnLocks.add(table.id);
      ack(ok(null));

      const tableId = table.id;
      const gameMaster = getGameMaster();

      void gameMaster
        .runTurn(table, payload.prompt, {
          thinking: (active) => {
            io.to(roomOf(tableId)).emit('table:gm-thinking', { thinking: active });
          },
          narrationStart: () => {
            // A entrada já foi emitida por `appendLog`; nada a fazer aqui.
          },
          narrationDelta: (entryId, text) => {
            io.to(roomOf(tableId)).emit('table:narration-delta', { entryId, text });
          },
          narrationEnd: (entryId) => {
            io.to(roomOf(tableId)).emit('table:narration-end', { entryId });
          },
        })
        .catch((error: unknown) => {
          io.to(roomOf(tableId)).emit('table:error', { message: messageOf(error) });
        })
        .finally(() => {
          gmTurnLocks.delete(tableId);
          broadcastState(tableId);
        });
    });

    socket.on('disconnect', () => {
      if (socket.data.tableId && socket.data.playerId) {
        tables.markDisconnected(socket.data.tableId, socket.data.playerId);
      }
    });
  });

  return io;
}

/** Garante que o socket tem assento na mesa que está tentando manipular. */
function requireSeat(socket: TypedSocket, tableId: string) {
  if (!socket.data.playerId || socket.data.tableId !== tableId) {
    throw new TableError('Você não está nesta mesa.');
  }
  return { table: tables.getTable(tableId), playerId: socket.data.playerId };
}
