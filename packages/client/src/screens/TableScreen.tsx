import { useState } from 'react';

import type { TableView } from '@rpg/shared';

import { useIsGm, useMyCharacter, useStore } from '../store.js';
import { setVolume, stopMusic, unlockAudio } from '../audio/music.js';
import { CharacterSheet } from '../components/CharacterSheet.js';
import { CombatPanel, PartyPanel } from '../components/PartyPanel.js';
import { DiceTray, PendingChecks } from '../components/DiceTray.js';
import { LogView } from '../components/LogView.js';
import { GmPanel } from '../components/GmPanel.js';
import { Codex } from '../components/Codex.js';

/**
 * Quanto o Mestre IA já custou nesta mesa.
 *
 * Fica no cabeçalho, ao lado do papel de quem joga, porque uma conta que só
 * aparece na fatura do fim do mês é uma conta que ninguém controla — e porque
 * o número muda a forma de jogar: dá para ver que abrir combate custa mais que
 * conversar, e decidir com essa informação na mão.
 */
function UsageMeter({ table }: { table: TableView }) {
  const { aiUsage, config } = table;
  const dollars = aiUsage.estimatedCents / 100;
  const budget = config.budgetCents;
  const share = budget > 0 ? aiUsage.estimatedCents / budget : 0;

  // Leitura de cache alta em relação à entrada crua é sinal de saúde: quer
  // dizer que o prefixo caro está sendo reaproveitado, não reenviado.
  const cached = aiUsage.cacheReadTokens + aiUsage.inputTokens;
  const cacheShare = cached > 0 ? Math.round((aiUsage.cacheReadTokens / cached) * 100) : 0;

  return (
    <span
      className={`badge usage-meter ${share >= 0.75 ? 'preview' : ''}`}
      title={
        `${aiUsage.requests} chamadas à API\n` +
        `entrada ${aiUsage.inputTokens.toLocaleString('pt-BR')} tokens\n` +
        `cache lido ${aiUsage.cacheReadTokens.toLocaleString('pt-BR')} (${cacheShare}% do total lido)\n` +
        `cache gravado ${aiUsage.cacheWriteTokens.toLocaleString('pt-BR')}\n` +
        `saída ${aiUsage.outputTokens.toLocaleString('pt-BR')}\n\n` +
        (budget > 0 ? `Teto desta mesa: US$ ${(budget / 100).toFixed(2)}\n` : '') +
        'Estimativa a partir do uso relatado pela API — a conta oficial é a do painel da Anthropic.'
      }
    >
      US$ {dollars.toFixed(3)}
      {budget > 0 && <span className="muted"> / {(budget / 100).toFixed(2)}</span>}
    </span>
  );
}

export function TableScreen() {
  const table = useStore((s) => s.table);
  const setting = useStore((s) => s.setting);
  const say = useStore((s) => s.say);
  const askGm = useStore((s) => s.askGm);
  const gmThinking = useStore((s) => s.gmThinking);
  const leaveTable = useStore((s) => s.leaveTable);
  const connected = useStore((s) => s.connected);
  const character = useMyCharacter();
  const isGm = useIsGm();

  const [input, setInput] = useState('');
  const [ooc, setOoc] = useState(false);
  const [rightTab, setRightTab] = useState<'mesa' | 'compendio'>('mesa');
  const [volume, setVolumeState] = useState(0.35);

  if (!table || !setting) {
    return (
      <div className="home">
        <p className="muted">Carregando a mesa…</p>
      </div>
    );
  }

  const aiGm = table.config.gmKind === 'ai';

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (ooc) {
      say(text, 'ooc');
      return;
    }
    // Numa mesa com Mestre IA, a fala do jogador é o turno: o servidor
    // registra a fala e dispara a resposta do Mestre.
    if (aiGm && !isGm) void askGm(text);
    else say(text, 'speech');
  }

  const location = table.scene.locationId
    ? setting.locations.find((l) => l.id === table.scene.locationId)
    : undefined;

  return (
    <div className="table-layout">
      <header className="table-header">
        <div>
          <h2 style={{ margin: 0 }}>{table.scene.title}</h2>
          <div className="small muted">
            {setting.name}
            {location && ` · ${location.name}`} · mesa “{table.config.name}” · código{' '}
            <span className="join-code">{table.joinCode}</span>
          </div>
        </div>

        <div className="row wrap">
          {!connected && <span className="badge preview">reconectando…</span>}
          <span className="badge">{isGm ? 'Mestre' : 'Jogador'}</span>
          <span className="badge accent">{aiGm ? 'Mestre IA' : 'Mestre humano'}</span>
          {aiGm && <UsageMeter table={table} />}

          {table.config.musicEnabled && (
            <label className="row small" style={{ marginBottom: 0 }} title="Volume da trilha">
              🎵
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                style={{ width: '80px' }}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setVolumeState(next);
                  unlockAudio();
                  setVolume(next);
                  if (next === 0) stopMusic();
                }}
                aria-label="Volume da trilha sonora"
              />
            </label>
          )}

          <button type="button" className="ghost" onClick={leaveTable}>
            Sair
          </button>
        </div>
      </header>

      {/* Coluna esquerda: sua ficha (ou o painel do Mestre). */}
      <div className="table-column">
        {isGm ? (
          <GmPanel table={table} setting={setting} />
        ) : character ? (
          <CharacterSheet character={character} setting={setting} editable />
        ) : (
          <div className="panel">
            <p className="muted">Você ainda não tem personagem nesta mesa.</p>
          </div>
        )}
      </div>

      {/* Coluna central: a cena e o registro. */}
      <div className="table-column" style={{ overflow: 'hidden' }}>
        <div className="panel" style={{ flexShrink: 0 }}>
          <p style={{ margin: 0 }}>{table.scene.description}</p>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <LogView entries={table.log} />

          <form onSubmit={submit} style={{ marginTop: '0.6rem', flexShrink: 0 }}>
            <div className="row">
              <input
                className="grow"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  ooc
                    ? 'Comentário fora de personagem…'
                    : aiGm && !isGm
                      ? 'O que seu personagem faz ou diz? O Mestre responde.'
                      : 'Fala ou ação do personagem…'
                }
                maxLength={2000}
                disabled={aiGm && !isGm && gmThinking}
              />
              <button
                type="submit"
                className="primary"
                disabled={!input.trim() || (aiGm && !isGm && gmThinking)}
              >
                {aiGm && !isGm ? 'Agir' : 'Falar'}
              </button>
            </div>
            <label className="row small" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={ooc}
                onChange={(e) => setOoc(e.target.checked)}
              />
              <span className="muted">fora de personagem</span>
            </label>
          </form>
        </div>
      </div>

      {/* Coluna direita: grupo, combate, dados e compêndio. */}
      <div className="table-column">
        <div className="tabs" role="tablist" style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={rightTab === 'mesa'}
            onClick={() => setRightTab('mesa')}
          >
            Mesa
          </button>
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={rightTab === 'compendio'}
            onClick={() => setRightTab('compendio')}
          >
            Compêndio
          </button>
        </div>

        {rightTab === 'mesa' ? (
          <>
            <PendingChecks />
            <PartyPanel table={table} setting={setting} />
            <CombatPanel table={table} setting={setting} />
            <DiceTray />
          </>
        ) : (
          <Codex setting={setting} />
        )}
      </div>
    </div>
  );
}
