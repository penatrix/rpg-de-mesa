import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';

import { listSettingSummaries, requireSetting } from '@rpg/shared';

import { aiAvailable, config } from './config.js';
import { closeDb, initDb, listRecentTables } from './db.js';
import { attachSockets } from './socket.js';
import { activeTableCount, evictIdleTables } from './tables.js';

const here = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// --- API REST: só leitura de catálogo. O jogo em si roda por socket. --------

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    gameMaster: aiAvailable() ? 'ai' : 'offline',
    model: aiAvailable() ? config.gmModel : null,
    effort: aiAvailable() ? config.gmEffort : null,
    activeTables: activeTableCount(),
  });
});

app.get('/api/settings', (_req, res) => {
  res.json({ settings: listSettingSummaries() });
});

app.get('/api/settings/:id', (req, res) => {
  try {
    res.json({ setting: requireSetting(req.params.id) });
  } catch {
    res.status(404).json({ error: 'Ambientação não encontrada.' });
  }
});

app.get('/api/tables/recent', (_req, res) => {
  res.json({ tables: listRecentTables(20) });
});

// --- Cliente compilado (produção) ------------------------------------------

const clientDist = resolve(here, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA: qualquer rota não-API devolve o index para o roteador do cliente.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// --- Sobe ------------------------------------------------------------------

initDb();

const httpServer = createServer(app);
attachSockets(httpServer);

// Mesas ociosas saem da memória de hora em hora; o estado fica no SQLite.
const evictionTimer = setInterval(
  () => {
    const evicted = evictIdleTables();
    if (evicted > 0) console.log(`[mesas] ${evicted} mesa(s) ociosa(s) descarregada(s).`);
  },
  1000 * 60 * 60,
);
evictionTimer.unref();

httpServer.listen(config.port, () => {
  console.log(`\n  RPG de Mesa — servidor em http://localhost:${config.port}`);
  console.log(
    `  Mestre: ${aiAvailable() ? `IA (${config.gmModel}, esforço ${config.gmEffort})` : 'Offline — defina ANTHROPIC_API_KEY para habilitar a IA'}`,
  );
  console.log(`  Ambientações: ${listSettingSummaries().map((s) => s.name).join(', ')}\n`);
});

function shutdown(signal: string): void {
  console.log(`\n[${signal}] encerrando...`);
  httpServer.close(() => {
    closeDb();
    process.exit(0);
  });
  // Se conexões abertas travarem o close, não fique pendurado para sempre.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
