import type { SettingDefinition, TableView } from '@rpg/shared';

import { VitalBar } from './CharacterSheet.js';

export function PartyPanel({
  table,
  setting,
}: {
  table: TableView;
  setting: SettingDefinition;
}) {
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
                <span
                  className="badge"
                  style={{
                    color: participant.connected ? 'var(--success)' : 'var(--text-muted)',
                    borderColor: participant.connected ? 'var(--success)' : 'var(--border)',
                  }}
                >
                  {participant.seat === 'npc' ? 'NPC' : participant.connected ? 'online' : 'ausente'}
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
