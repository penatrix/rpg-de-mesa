import { useEffect, useState } from 'react';

import { useStore } from '../store.js';
import { unlockAudio } from '../audio/music.js';

type Mode = 'create' | 'join';

export function HomeScreen() {
  const summaries = useStore((s) => s.summaries);
  const loadSummaries = useStore((s) => s.loadSummaries);
  const loadSetting = useStore((s) => s.loadSetting);
  const createTable = useStore((s) => s.createTable);
  const joinTable = useStore((s) => s.joinTable);
  const connected = useStore((s) => s.connected);

  const [mode, setMode] = useState<Mode>('create');
  const [settingId, setSettingId] = useState<string>('tibia');
  const [playerName, setPlayerName] = useState('');
  const [tableName, setTableName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [gmKind, setGmKind] = useState<'ai' | 'human'>('ai');
  const [allowNpc, setAllowNpc] = useState(true);
  const [music, setMusic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [gmAvailable, setGmAvailable] = useState<'ai' | 'offline' | null>(null);

  useEffect(() => {
    void loadSummaries();
    // Saber se a IA está configurada evita prometer um Mestre que não existe.
    void fetch('/api/health')
      .then((r) => r.json())
      .then((data: { gameMaster: 'ai' | 'offline' }) => setGmAvailable(data.gameMaster))
      .catch(() => setGmAvailable(null));
  }, [loadSummaries]);

  // Pré-carrega a ambientação escolhida para o tema já entrar antes da mesa.
  useEffect(() => {
    if (settingId) void loadSetting(settingId).catch(() => undefined);
  }, [settingId, loadSetting]);

  const selected = summaries.find((s) => s.id === settingId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    unlockAudio();
    setBusy(true);
    try {
      if (mode === 'create') {
        await createTable({
          settingId,
          tableName: tableName || `Mesa de ${selected?.name ?? ''}`,
          playerName,
          gmKind,
          allowNpcCompanions: allowNpc,
          musicEnabled: music,
        });
      } else {
        await joinTable(joinCode, playerName);
      }
    } catch {
      // O erro já foi publicado na store e aparece no banner.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="home">
      <header className="home-header">
        <h1>RPG de Mesa</h1>
        <p className="muted">
          Múltiplas ambientações, dados e fichas in-game, até 6 jogadores.
          <br />
          O Mestre pode ser você ou uma IA.
        </p>
      </header>

      <h2>Escolha a ambientação</h2>
      <div className="setting-grid">
        {summaries.map((summary) => (
          <button
            key={summary.id}
            type="button"
            className="setting-card"
            aria-pressed={settingId === summary.id}
            onClick={() => setSettingId(summary.id)}
          >
            <div className="swatch" style={{ background: summary.accent }} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>{summary.name}</h3>
              {summary.status === 'preview' ? (
                <span className="badge preview">Preview</span>
              ) : (
                <span className="badge accent">Completa</span>
              )}
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {summary.tagline}
            </p>
            <p className="small" style={{ margin: 0 }}>
              {summary.description}
            </p>
            <p className="small muted mono" style={{ margin: 0 }}>
              {summary.classCount} classes · {summary.bestiaryCount} criaturas ·{' '}
              {summary.locationCount} locais
            </p>
          </button>
        ))}
        {summaries.length === 0 && <p className="muted">Carregando ambientações…</p>}
      </div>

      <div className="panel">
        <div className="tabs" role="tablist">
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={mode === 'create'}
            onClick={() => setMode('create')}
          >
            Criar mesa
          </button>
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={mode === 'join'}
            onClick={() => setMode('join')}
          >
            Entrar com código
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="playerName">Seu nome</label>
            <input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Como a mesa vai te chamar"
              maxLength={40}
              required
            />
          </div>

          {mode === 'create' ? (
            <>
              <div className="field">
                <label htmlFor="tableName">Nome da mesa</label>
                <input
                  id="tableName"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder={`Mesa de ${selected?.name ?? '…'}`}
                  maxLength={80}
                />
              </div>

              <div className="field">
                <label>Quem mestra</label>
                <div className="row wrap">
                  <button
                    type="button"
                    className={gmKind === 'ai' ? 'primary' : ''}
                    onClick={() => setGmKind('ai')}
                  >
                    Mestre IA
                  </button>
                  <button
                    type="button"
                    className={gmKind === 'human' ? 'primary' : ''}
                    onClick={() => setGmKind('human')}
                  >
                    Eu mestro
                  </button>
                </div>
                <p className="small muted" style={{ marginTop: '0.4em' }}>
                  {gmKind === 'ai'
                    ? gmAvailable === 'offline'
                      ? 'A chave da API não está configurada no servidor — a mesa vai usar o Mestre Offline, que narra a partir dos ganchos da ambientação.'
                      : 'A IA conduz a história, rola dados e controla as criaturas. Você joga com um personagem.'
                    : 'Você recebe o painel completo: cenas, bestiário, dano, cura, experiência e trilha sonora.'}
                </p>
              </div>

              <div className="field row wrap">
                <label className="row" style={{ marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={allowNpc}
                    onChange={(e) => setAllowNpc(e.target.checked)}
                  />
                  <span>Companheiros NPC nos assentos vazios</span>
                </label>
                <label className="row" style={{ marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={music}
                    onChange={(e) => setMusic(e.target.checked)}
                  />
                  <span>Trilha sonora</span>
                </label>
              </div>
            </>
          ) : (
            <div className="field">
              <label htmlFor="joinCode">Código da mesa</label>
              <input
                id="joinCode"
                className="mono join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={10}
                required
              />
            </div>
          )}

          <button type="submit" className="primary" disabled={busy || !connected}>
            {busy ? 'Aguarde…' : mode === 'create' ? 'Criar mesa' : 'Entrar'}
          </button>
          {!connected && (
            <span className="small muted" style={{ marginLeft: '0.7em' }}>
              conectando ao servidor…
            </span>
          )}
        </form>
      </div>
    </div>
  );
}
