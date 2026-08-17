import type { SettingDefinition, TableView } from '@rpg/shared';

import { useStore } from '../store.js';
import { VitalBar } from './CharacterSheet.js';

export function PartyPanel({
  table,
  setting,
}: {
  table: TableView;
  setting: SettingDefinition;
}) {
  const removeCompanion = useStore((s) => s.removeCompanion);
  const humans = table.participants.filter((p) => p.role === 'player');

  return (
    <div className="panel">
      <div className="panel-title">
        <h3 style={{ margin: 0 }}>{setting.labels.party}</h3>
        <span className="badge">
          {humans.length} / {table.config.maxPlayers}
        </span>
      </div>

      <div className="stack">
        {humans.map((participant) => {
          const character = table.characters.find((c) => c.id === participant.characterId);
          const vocation = character
            ? setting.characterModel.classes.find((c) => c.id === character.classId)
            : undefined;

          return (
            <div key={participant.id} className="party-member">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{character?.name ?? participant.name}</strong>
                <span className="row" style={{ marginBottom: 0 }}>
                  <span
                    className="badge"
                    style={{
                      color: participant.connected ? 'var(--success)' : 'var(--text-muted)',
                      borderColor: participant.connected ? 'var(--success)' : 'var(--border)',
                    }}
                  >
                    {participant.seat === 'npc'
                      ? 'companheiro'
                      : participant.connected
                        ? 'online'
                        : 'ausente'}
                  </span>
                  {participant.seat === 'npc' && (
                    <button
                      type="button"
                      className="tiny ghost"
                      title={`Dispensar ${participant.name}`}
                      onClick={() => void removeCompanion(participant.id)}
                    >
                      ×
                    </button>
                  )}
                </span>
              </div>

              {character ? (
                <>
                  <div className="small muted">
                    {vocation?.icon} {vocation?.name} · nível {character.level} · {participant.name}
                  </div>
                  <div style={{ marginTop: '0.4rem' }}>
                    {Object.entries(character.vitals).map(([id, state]) => {
                      const vital = setting.characterModel.vitals.find((v) => v.id === id);
                      return (
                        <VitalBar key={id} id={id} name={vital?.abbreviation ?? id} state={state} />
                      );
                    })}
                  </div>
                  {character.conditions.length > 0 && (
                    <div className="row wrap small" style={{ marginTop: '0.3rem' }}>
                      {character.conditions.map((condition) => (
                        <span key={condition} className="badge preview">
                          {condition}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="small muted">ainda criando o personagem…</div>
              )}
            </div>
          );
        })}

        {humans.length === 0 && <p className="small muted">Ninguém sentou à mesa ainda.</p>}
      </div>

      <CompanionRecruiter table={table} setting={setting} />
    </div>
  );
}

/**
 * Recrutamento de companheiros.
 *
 * Quem os interpreta é o Mestre, no mesmo turno que já ia acontecer — por isso
 * um grupo de quatro custa o mesmo que jogar sozinho. Só aparece quando a mesa
 * foi criada permitindo companheiros e ainda há alguém para chamar.
 */
function CompanionRecruiter({
  table,
  setting,
}: {
  table: TableView;
  setting: SettingDefinition;
}) {
  const addCompanion = useStore((s) => s.addCompanion);

  if (!table.config.allowNpcCompanions || !setting.companions?.length) return null;

  const taken = new Set(
    table.participants.filter((p) => p.seat === 'npc').map((p) => p.name),
  );
  const available = setting.companions.filter((companion) => !taken.has(companion.name));
  const full = table.participants.filter((p) => p.role === 'player').length >= table.config.maxPlayers;

  if (available.length === 0 || full) return null;

  return (
    <div style={{ marginTop: '0.7rem', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
      <div className="small muted" style={{ marginBottom: '0.4rem' }}>
        Chamar alguém para o grupo:
      </div>
      <div className="row wrap">
        {available.map((companion) => {
          const vocation = setting.characterModel.classes.find((c) => c.id === companion.classId);
          return (
            <button
              key={companion.id}
              type="button"
              className="tiny"
              title={`${companion.personality}\n\n${companion.catchphrases.join('\n')}`}
              onClick={() => void addCompanion(companion.id)}
            >
              {vocation?.icon} {companion.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CombatPanel({
  table,
  setting,
}: {
  table: TableView;
  setting: SettingDefinition;
}) {
  if (table.scene.combatants.length === 0) return null;

  const healthId = setting.characterModel.vitals[0]?.id ?? 'hp';

  return (
    <div className="panel">
      <div className="panel-title">
        <h3 style={{ margin: 0 }}>{table.scene.inCombat ? 'Combate' : 'Em cena'}</h3>
        {table.scene.inCombat && <span className="badge accent">iniciativa ativa</span>}
      </div>

      <div className="stack">
        {(table.scene.inCombat && table.scene.turnOrder.length > 0
          ? table.scene.turnOrder
              .map((id) => table.scene.combatants.find((c) => c.id === id))
              .filter((c): c is NonNullable<typeof c> => Boolean(c))
          : table.scene.combatants
        ).map((combatant) => {
          const health = combatant.vitals[healthId];
          const down = (health?.current ?? 1) <= 0;

          return (
            <div
              key={combatant.id}
              className={[
                'combatant',
                combatant.hostile ? 'hostile' : '',
                combatant.id === table.scene.activeTurn ? 'active' : '',
                down ? 'down' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{combatant.name}</strong>
                {health && (
                  <span className="mono small">
                    {health.current}/{health.max}
                  </span>
                )}
              </div>
              {health && (
                <div className="vital-bar" style={{ marginTop: '0.25rem' }}>
                  <div
                    className="vital-fill"
                    style={{
                      width: `${Math.max(0, (health.current / health.max) * 100)}%`,
                      background: combatant.hostile ? 'var(--danger)' : 'var(--success)',
                    }}
                  />
                </div>
              )}
              {combatant.conditions.length > 0 && (
                <div className="small muted">{combatant.conditions.join(', ')}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
