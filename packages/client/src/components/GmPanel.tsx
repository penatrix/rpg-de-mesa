import { useState } from 'react';

import type { SettingDefinition, TableView } from '@rpg/shared';
import { useStore } from '../store.js';

/**
 * Painel do Mestre humano.
 *
 * Expõe exatamente as mesmas ações que o Mestre IA aciona por ferramenta — é
 * o mesmo conjunto no servidor, então nenhum dos dois pode fazer algo que o
 * outro não possa.
 */
export function GmPanel({ table, setting }: { table: TableView; setting: SettingDefinition }) {
  const gmAction = useStore((s) => s.gmAction);

  const [tab, setTab] = useState<'cena' | 'criaturas' | 'combate' | 'recompensa'>('cena');

  const [sceneTitle, setSceneTitle] = useState(table.scene.title);
  const [sceneText, setSceneText] = useState('');
  const [locationId, setLocationId] = useState(table.scene.locationId ?? '');
  const [narration, setNarration] = useState('');
  const [gmOnly, setGmOnly] = useState(false);

  const [bestiaryId, setBestiaryId] = useState(setting.bestiary[0]?.id ?? '');
  const [spawnCount, setSpawnCount] = useState(1);

  const [targetId, setTargetId] = useState('');
  const [vitalId, setVitalId] = useState(setting.characterModel.vitals[0]?.id ?? 'hp');
  const [amount, setAmount] = useState(10);

  const [xpTarget, setXpTarget] = useState('');
  const [xpAmount, setXpAmount] = useState(100);
  const [itemId, setItemId] = useState(setting.items[0]?.id ?? '');
  const [itemQty, setItemQty] = useState(1);

  return (
    <div className="panel">
      <h3>Painel do Mestre</h3>

      <div className="tabs" role="tablist">
        {(['cena', 'criaturas', 'combate', 'recompensa'] as const).map((name) => (
          <button
            key={name}
            type="button"
            className="tab"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === 'cena' && (
        <>
          <div className="field">
            <label htmlFor="narration">Narrar</label>
            <textarea
              id="narration"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="O que a mesa vê, ouve e sente."
            />
          </div>
          <div className="row" style={{ marginBottom: '0.8rem' }}>
            <label className="row small grow" style={{ marginBottom: 0 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={gmOnly}
                onChange={(e) => setGmOnly(e.target.checked)}
              />
              <span>nota privada</span>
            </label>
            <button
              type="button"
              className="primary"
              disabled={!narration.trim()}
              onClick={() => {
                void gmAction({ action: 'narrate', text: narration, gmOnly });
                setNarration('');
              }}
            >
              Enviar
            </button>
          </div>

          <h4>Mudar de cena</h4>
          <div className="field">
            <input
              value={sceneTitle}
              onChange={(e) => setSceneTitle(e.target.value)}
              placeholder="Título da cena"
            />
          </div>
          <div className="field">
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Sem local definido</option>
              {setting.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.kind})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <textarea
              value={sceneText}
              onChange={(e) => setSceneText(e.target.value)}
              placeholder="Descrição do lugar"
            />
          </div>
          <button
            type="button"
            disabled={!sceneTitle.trim()}
            onClick={() =>
              void gmAction({
                action: 'set-scene',
                title: sceneTitle,
                description: sceneText,
                locationId: locationId || undefined,
              })
            }
          >
            Definir cena
          </button>

          {locationId && (
            <div style={{ marginTop: '0.8rem' }}>
              <h4>Ganchos deste local</h4>
              {setting.locations
                .find((l) => l.id === locationId)
                ?.hooks.map((hook, index) => (
                  <div key={index} className="codex-entry small">
                    {hook}
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {tab === 'criaturas' && (
        <>
          <div className="field">
            <label htmlFor="bestiary">{setting.labels.bestiary}</label>
            <select id="bestiary" value={bestiaryId} onChange={(e) => setBestiaryId(e.target.value)}>
              {[...setting.bestiary]
                .sort((a, b) => a.threat - b.threat)
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} — ameaça {entry.threat} · {entry.experience} xp
                  </option>
                ))}
            </select>
          </div>
          <div className="row" style={{ marginBottom: '0.8rem' }}>
            <input
              type="number"
              min={1}
              max={12}
              value={spawnCount}
              onChange={(e) => setSpawnCount(Number(e.target.value))}
              aria-label="Quantidade"
            />
            <button
              type="button"
              className="primary"
              onClick={() => void gmAction({ action: 'spawn', bestiaryId, count: spawnCount })}
            >
              Colocar em cena
            </button>
          </div>

          {(() => {
            const entry = setting.bestiary.find((b) => b.id === bestiaryId);
            if (!entry) return null;
            return (
              <div className="small">
                <p className="muted">{entry.description}</p>
                <p className="mono">
                  {Object.entries(entry.vitals)
                    .map(([id, value]) => `${id} ${value}`)
                    .join(' · ')}
                </p>
                {entry.attacks.map((attack) => (
                  <div key={attack.name}>
                    <strong>{attack.name}</strong>{' '}
                    <span className="mono muted">{attack.damage}</span>
                    {attack.element && <span className="muted"> ({attack.element})</span>}
                  </div>
                ))}
                {entry.weaknesses && (
                  <p className="muted">Fraquezas: {entry.weaknesses.join(', ')}</p>
                )}
                {entry.immunities && (
                  <p className="muted">Imunidades: {entry.immunities.join(', ')}</p>
                )}
              </div>
            );
          })()}
        </>
      )}

      {tab === 'combate' && (
        <>
          <div className="row wrap" style={{ marginBottom: '0.8rem' }}>
            <button type="button" onClick={() => void gmAction({ action: 'start-combat' })}>
              Iniciar combate
            </button>
            <button
              type="button"
              disabled={!table.scene.inCombat}
              onClick={() => void gmAction({ action: 'next-turn' })}
            >
              Próximo turno
            </button>
            <button
              type="button"
              disabled={!table.scene.inCombat}
              onClick={() => void gmAction({ action: 'end-combat' })}
            >
              Encerrar
            </button>
          </div>

          <div className="field">
            <label htmlFor="target">Alvo</label>
            <select id="target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Escolha um combatente</option>
              {table.scene.combatants.map((combatant) => (
                <option key={combatant.id} value={combatant.id}>
                  {combatant.name} {combatant.hostile ? '(hostil)' : '(aliado)'}
                </option>
              ))}
            </select>
          </div>

          <div className="row" style={{ marginBottom: '0.6rem' }}>
            <select value={vitalId} onChange={(e) => setVitalId(e.target.value)} aria-label="Vital">
              {setting.characterModel.vitals.map((vital) => (
                <option key={vital.id} value={vital.id}>
                  {vital.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-label="Quantidade"
            />
          </div>

          <div className="row">
            <button
              type="button"
              disabled={!targetId}
              onClick={() =>
                void gmAction({ action: 'damage', combatantId: targetId, vitalId, amount })
              }
            >
              Aplicar dano
            </button>
            <button
              type="button"
              disabled={!targetId}
              onClick={() =>
                void gmAction({ action: 'heal', combatantId: targetId, vitalId, amount })
              }
            >
              Curar
            </button>
          </div>
        </>
      )}

      {tab === 'recompensa' && (
        <>
          <div className="field">
            <label htmlFor="xpTarget">Personagem</label>
            <select id="xpTarget" value={xpTarget} onChange={(e) => setXpTarget(e.target.value)}>
              <option value="">Escolha</option>
              {table.characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name} (nível {character.level})
                </option>
              ))}
            </select>
          </div>

          <div className="row" style={{ marginBottom: '0.8rem' }}>
            <input
              type="number"
              min={0}
              value={xpAmount}
              onChange={(e) => setXpAmount(Number(e.target.value))}
              aria-label="Experiência"
            />
            <button
              type="button"
              disabled={!xpTarget}
              onClick={() =>
                void gmAction({ action: 'grant-xp', characterId: xpTarget, amount: xpAmount })
              }
            >
              Conceder XP
            </button>
          </div>

          <div className="field">
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label="Item">
              {setting.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.rarity})
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <input
              type="number"
              min={1}
              value={itemQty}
              onChange={(e) => setItemQty(Number(e.target.value))}
              aria-label="Quantidade"
            />
            <button
              type="button"
              disabled={!xpTarget}
              onClick={() =>
                void gmAction({
                  action: 'give-item',
                  characterId: xpTarget,
                  itemId,
                  quantity: itemQty,
                })
              }
            >
              Entregar item
            </button>
          </div>
        </>
      )}
    </div>
  );
}
