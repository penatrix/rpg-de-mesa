import { useMemo, useState } from 'react';

import type { SettingDefinition } from '@rpg/shared';

/** Consulta rápida do mundo: lore, bestiário, locais, itens e habilidades. */
export function Codex({ setting }: { setting: SettingDefinition }) {
  const [tab, setTab] = useState<'lore' | 'bestiario' | 'locais' | 'itens' | 'magias'>('lore');
  const [query, setQuery] = useState('');

  const filter = useMemo(() => query.trim().toLowerCase(), [query]);
  const matches = (...fields: (string | undefined)[]): boolean =>
    !filter || fields.some((field) => field?.toLowerCase().includes(filter));

  return (
    <div className="panel">
      <h3>Compêndio</h3>

      <div className="tabs" role="tablist">
        {(
          [
            ['lore', 'Lore'],
            ['bestiario', setting.labels.bestiary],
            ['locais', 'Locais'],
            ['itens', 'Itens'],
            ['magias', `${setting.labels.ability}s`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="tab"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="field">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar…"
          aria-label="Buscar no compêndio"
        />
      </div>

      <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        {tab === 'lore' &&
          setting.lore
            .filter((entry) => matches(entry.title, entry.text, entry.category))
            .map((entry) => (
              <div key={entry.id} className="codex-entry">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{entry.title}</strong>
                  <span className="badge">{entry.category}</span>
                </div>
                <p className="small" style={{ margin: '0.3em 0 0' }}>
                  {entry.text}
                </p>
              </div>
            ))}

        {tab === 'bestiario' &&
          [...setting.bestiary]
            .sort((a, b) => a.threat - b.threat)
            .filter((entry) => matches(entry.name, entry.description))
            .map((entry) => (
              <div key={entry.id} className="codex-entry">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{entry.name}</strong>
                  <span className="badge accent">ameaça {entry.threat}</span>
                </div>
                <p className="small muted" style={{ margin: '0.2em 0' }}>
                  {entry.description}
                </p>
                <div className="small mono">
                  {Object.entries(entry.vitals)
                    .map(([id, value]) => `${id} ${value}`)
                    .join(' · ')}{' '}
                  · {entry.experience} xp
                </div>
                <div className="small">
                  {entry.attacks.map((attack) => (
                    <div key={attack.name}>
                      {attack.name} <span className="mono muted">{attack.damage}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

        {tab === 'locais' &&
          setting.locations
            .filter((entry) => matches(entry.name, entry.description))
            .map((entry) => (
              <div key={entry.id} className="codex-entry">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{entry.name}</strong>
                  <span className="badge">{entry.kind}</span>
                </div>
                <p className="small muted" style={{ margin: '0.2em 0' }}>
                  {entry.description}
                </p>
                {entry.recommendedLevel && (
                  <div className="small mono">
                    níveis {entry.recommendedLevel[0]}–{entry.recommendedLevel[1]}
                  </div>
                )}
                {entry.npcs && entry.npcs.length > 0 && (
                  <div className="small">
                    {entry.npcs.map((npc) => (
                      <div key={npc.name}>
                        <strong>{npc.name}</strong> — {npc.role}: {npc.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

        {tab === 'itens' &&
          setting.items
            .filter((entry) => matches(entry.name, entry.description))
            .map((entry) => (
              <div key={entry.id} className="codex-entry">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{entry.name}</strong>
                  <span className="badge">{entry.rarity}</span>
                </div>
                <p className="small muted" style={{ margin: '0.2em 0' }}>
                  {entry.description}
                </p>
                <div className="small mono">
                  {entry.slot}
                  {entry.damage && ` · dano ${entry.damage}`}
                  {entry.armor && ` · armadura ${entry.armor}`}
                  {` · ${entry.weight} un · ${entry.value} ${setting.labels.currency}`}
                </div>
              </div>
            ))}

        {tab === 'magias' &&
          setting.abilities
            .filter((entry) => matches(entry.name, entry.description, entry.incantation))
            .map((entry) => (
              <div key={entry.id} className="codex-entry">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{entry.name}</strong>
                  {entry.incantation && <span className="mono accent">“{entry.incantation}”</span>}
                </div>
                <p className="small muted" style={{ margin: '0.2em 0' }}>
                  {entry.description}
                </p>
                <div className="small mono">
                  {Object.entries(entry.cost)
                    .map(([vitalId, value]) => `${value} ${vitalId}`)
                    .join(', ') || 'sem custo'}
                  {entry.requires?.level && ` · nível ${entry.requires.level}+`}
                  {entry.effect.kind === 'damage' && ` · ${entry.effect.formula}`}
                  {entry.effect.kind === 'heal' && ` · cura ${entry.effect.formula}`}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
