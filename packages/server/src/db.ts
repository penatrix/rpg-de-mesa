/**
 * Persistência em SQLite.
 *
 * As mesas vivem em memória durante o jogo (latência importa) e são gravadas
 * a cada mudança relevante. O banco é a rede de segurança para reinício do
 * servidor, não o caminho quente.
 */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

import type { TableState } from '@rpg/shared';
import { config } from './config.js';

let db: Database.Database | undefined;

export function initDb(): Database.Database {
  if (db) return db;

  mkdirSync(dirname(config.dbPath), { recursive: true });
  db = new Database(config.dbPath);

  // WAL permite leitura concorrente com a escrita — importante porque
  // gravamos a cada ação de mesa.
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tables (
      id          TEXT PRIMARY KEY,
      join_code   TEXT NOT NULL UNIQUE,
      setting_id  TEXT NOT NULL,
      name        TEXT NOT NULL,
      state       TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tables_join_code ON tables(join_code);
    CREATE INDEX IF NOT EXISTS idx_tables_updated ON tables(updated_at);
  `);

  return db;
}

function requireDb(): Database.Database {
  return db ?? initDb();
}

export function saveTable(table: TableState): void {
  requireDb()
    .prepare(
      `INSERT INTO tables (id, join_code, setting_id, name, state, created_at, updated_at)
       VALUES (@id, @joinCode, @settingId, @name, @state, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         state = excluded.state,
         name = excluded.name,
         updated_at = excluded.updated_at`,
    )
    .run({
      id: table.id,
      joinCode: table.joinCode,
      settingId: table.config.settingId,
      name: table.config.name,
      state: JSON.stringify(table),
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    });
}

/**
 * Reidrata uma mesa gravada, preenchendo campos que versões anteriores não
 * conheciam.
 *
 * O estado vai para o banco como um único blob JSON, então uma mesa criada
 * antes de um campo existir volta sem ele — e o servidor quebraria no primeiro
 * `table.pendingChecks.push`. Migração de esquema aqui é uma linha; ausência
 * dela é um erro em produção numa mesa antiga.
 */
function hydrate(raw: string): TableState {
  const table = JSON.parse(raw) as TableState;

  table.pendingChecks ??= [];
  table.aiUsage ??= {
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    requests: 0,
    estimatedCents: 0,
  };
  table.config.budgetCents ??= config.tableBudgetCents;

  return table;
}

export function loadTable(id: string): TableState | undefined {
  const row = requireDb().prepare('SELECT state FROM tables WHERE id = ?').get(id) as
    | { state: string }
    | undefined;
  return row ? hydrate(row.state) : undefined;
}

export function loadTableByJoinCode(joinCode: string): TableState | undefined {
  const row = requireDb()
    .prepare('SELECT state FROM tables WHERE join_code = ?')
    .get(joinCode.toUpperCase()) as { state: string } | undefined;
  return row ? hydrate(row.state) : undefined;
}

export interface TableSummaryRow {
  id: string;
  joinCode: string;
  settingId: string;
  name: string;
  updatedAt: number;
}

export function listRecentTables(limit = 20): TableSummaryRow[] {
  return requireDb()
    .prepare(
      `SELECT id, join_code AS joinCode, setting_id AS settingId, name, updated_at AS updatedAt
       FROM tables ORDER BY updated_at DESC LIMIT ?`,
    )
    .all(limit) as TableSummaryRow[];
}

export function joinCodeExists(joinCode: string): boolean {
  const row = requireDb()
    .prepare('SELECT 1 FROM tables WHERE join_code = ?')
    .get(joinCode.toUpperCase());
  return row !== undefined;
}

export function closeDb(): void {
  db?.close();
  db = undefined;
}
