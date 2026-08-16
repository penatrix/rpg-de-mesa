import { useEffect, useState } from 'react';

import type { Character, SettingDefinition, VitalState } from '@rpg/shared';
import { carryStatus, experienceForLevel } from '@rpg/shared';

import { useStore } from '../store.js';
import { vitalColor } from '../theme.js';

export function VitalBar({
  id,
  name,
  state,
}: {
  id: string;
  name: string;
  state: VitalState;
}) {
  const percent = state.max > 0 ? Math.max(0, Math.min(100, (state.current / state.max) * 100)) : 0;
  return (
    <div className="vital">
      <div className="vital-head">
        <span>{name}</span>
        <span className="mono">
          {state.current} / {state.max}
        </span>
      </div>
      <div className="vital-bar">
        <div
          className="vital-fill"
          style={{ width: `${percent}%`, background: vitalColor(id) }}
          role="progressbar"
          aria-valuenow={state.current}
          aria-valuemin={0}
          aria-valuemax={state.max}
          aria-label={name}
        />
      </div>
    </div>
  );
}

export function CharacterSheet({
  character,
  setting,
  editable,
}: {
  character: Character;
  setting: SettingDefinition;
  editable: boolean;
}) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const [notes, setNotes] = useState(character.notes);

  // A ficha é do servidor; o rascunho de notas é local até o blur.
  useEffect(() => setNotes(character.notes), [character.notes]);

  const vocation = setting.characterModel.classes.find((c) => c.id === character.classId);
  const origin = setting.characterModel.origins?.find((o) => o.id === character.originId);
  const carry = carryStatus(character, setting);

  const nextLevelXp = experienceForLevel(setting, character.level + 1);
  const currentLevelXp = experienceForLevel(setting, character.level);
  const progress =
    nextLevelXp > currentLevelXp
      ? ((character.experience - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
      : 0;

  function toggleEquip(itemId: string) {
    if (!editable) return;
    void updateCharacter({
      ...character,
      inventory: character.inventory.map((entry) =>
        entry.itemId === itemId ? { ...entry, equipped: !entry.equipped } : entry,
      ),
    });
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <div>
          <h3 style={{ margin: 0 }}>{character.name}</h3>
          <div className="small muted">
            {vocation?.icon} {vocation?.name ?? character.classId} · nível {character.level}
            {origin && ` · ${origin.name}`}
          </div>
        </div>
      </div>

      {Object.entries(character.vitals).map(([id, state]) => {
        const vital = setting.characterModel.vitals.find((v) => v.id === id);
        return <VitalBar key={id} id={id} name={vital?.name ?? id} state={state} />;
      })}

      <div className="vital">
        <div className="vital-head">
          <span>Experiência</span>
          <span className="mono">
            {character.experience} / {nextLevelXp}
          </span>
        </div>
        <div className="vital-bar">
          <div
            className="vital-fill"
            style={{ width: `${Math.min(100, progress)}%`, background: 'var(--accent)' }}
          />
        </div>
      </div>

      {carry && (
        <div className="small muted mono" style={{ marginBottom: '0.6rem' }}>
          Carga {carry.carried} / {carry.capacity}
          {carry.carried > carry.capacity && (
            <span style={{ color: 'var(--danger)' }}> · sobrecarregado</span>
          )}
        </div>
      )}

      {character.conditions.length > 0 && (
        <div className="row wrap" style={{ marginBottom: '0.6rem' }}>
          {character.conditions.map((condition) => (
            <span key={condition} className="badge preview">
              {condition}
            </span>
          ))}
        </div>
      )}

      <h4>Atributos</h4>
      <div className="attribute-grid" style={{ marginBottom: '0.8rem' }}>
        {setting.characterModel.attributes.map((attribute) => (
          <div key={attribute.id} className="attribute" title={attribute.description}>
            <div className="abbr">{attribute.abbreviation}</div>
            <div className="value">{character.attributes[attribute.id] ?? 0}</div>
          </div>
        ))}
      </div>

      <h4>{setting.labels.ability}s</h4>
      <div className="stack" style={{ marginBottom: '0.8rem' }}>
        {character.abilities.length === 0 && <span className="small muted">Nenhuma.</span>}
        {character.abilities.map((abilityId) => {
          const ability = setting.abilities.find((a) => a.id === abilityId);
          if (!ability) return null;
          const cost = Object.entries(ability.cost)
            .map(([vitalId, amount]) => `${amount} ${vitalId}`)
            .join(', ');
          return (
            <div key={abilityId} className="small" title={ability.description}>
              <strong>{ability.name}</strong>
              {ability.incantation && (
                <span className="mono muted"> · “{ability.incantation}”</span>
              )}
              {cost && <span className="muted"> · {cost}</span>}
            </div>
          );
        })}
      </div>

      <h4>Inventário</h4>
      <div style={{ marginBottom: '0.8rem' }}>
        {character.inventory.length === 0 && <span className="small muted">Vazio.</span>}
        {character.inventory.map((entry) => {
          const item = setting.items.find((i) => i.id === entry.itemId);
          const equippable = item && item.slot !== 'consumable' && item.slot !== 'misc';
          return (
            <div
              key={entry.itemId}
              className={`inventory-item ${entry.equipped ? 'equipped' : ''}`}
              title={item?.description}
            >
              <span>
                {item?.name ?? entry.itemId}
                {entry.quantity > 1 && <span className="muted"> ×{entry.quantity}</span>}
              </span>
              {equippable && editable ? (
                <button type="button" className="tiny ghost" onClick={() => toggleEquip(entry.itemId)}>
                  {entry.equipped ? 'equipado' : 'equipar'}
                </button>
              ) : (
                <span className="small muted">{item?.slot}</span>
              )}
            </div>
          );
        })}
      </div>

      <h4>Anotações</h4>
      <textarea
        value={notes}
        readOnly={!editable}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          if (editable && notes !== character.notes) {
            void updateCharacter({ ...character, notes });
          }
        }}
        placeholder="Pistas, nomes, promessas feitas…"
      />
    </div>
  );
}
