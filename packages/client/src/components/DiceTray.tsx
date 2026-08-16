import { useState } from 'react';

import type { DiceRoll } from '@rpg/shared';
import { useIsGm, useMyCharacter, useStore } from '../store.js';

/** Atalhos que cobrem a maioria das rolagens de mesa. */
const QUICK = ['1d4', '1d6', '1d8', '1d10', '1d12', '1d20', '2d6', '1d100'];

export function DiceTray() {
  const rollDice = useStore((s) => s.rollDice);
  const check = useStore((s) => s.check);
  const setting = useStore((s) => s.setting);
  const lastRoll = useStore((s) => s.lastRoll);
  const character = useMyCharacter();
  const isGm = useIsGm();

  const [notation, setNotation] = useState('1d20');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState(false);
  const [difficulty, setDifficulty] = useState(14);
  const [advantage, setAdvantage] = useState<'none' | 'advantage' | 'disadvantage'>('none');

  return (
    <div className="panel">
      <div className="panel-title">
        <h3 style={{ margin: 0 }}>Dados</h3>
        {isGm && (
          <label className="row small" style={{ marginBottom: 0 }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={secret}
              onChange={(e) => setSecret(e.target.checked)}
            />
            <span>secreta</span>
          </label>
        )}
      </div>

      <div className="row wrap" style={{ marginBottom: '0.6rem' }}>
        {QUICK.map((quick) => (
          <button key={quick} type="button" className="tiny mono" onClick={() => setNotation(quick)}>
            {quick}
          </button>
        ))}
      </div>

      <div className="row" style={{ marginBottom: '0.5rem' }}>
        <input
          className="mono"
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          placeholder="2d6+3"
          aria-label="Notação de dados"
        />
        <button
          type="button"
          className="primary"
          onClick={() => void rollDice(notation, label || undefined, secret)}
        >
          Rolar
        </button>
      </div>

      <div className="field">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="O que está rolando? (opcional)"
          maxLength={80}
        />
      </div>

      {character && setting && (
        <>
          <h4>Teste de atributo</h4>
          <div className="row wrap" style={{ marginBottom: '0.5rem' }}>
            <select
              className="grow"
              value={advantage}
              onChange={(e) => setAdvantage(e.target.value as typeof advantage)}
              aria-label="Vantagem"
            >
              <option value="none">Normal</option>
              <option value="advantage">Com vantagem</option>
              <option value="disadvantage">Com desvantagem</option>
            </select>
            <select
              className="grow"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              aria-label="Dificuldade"
            >
              {setting.rules.difficulties.map((entry) => (
                <option key={entry.name} value={entry.value}>
                  {entry.name} ({entry.value})
                </option>
              ))}
            </select>
          </div>

          <div className="attribute-grid">
            {setting.characterModel.attributes.map((attribute) => (
              <button
                key={attribute.id}
                type="button"
                className="attribute"
                title={attribute.description}
                onClick={() =>
                  void check({
                    characterId: character.id,
                    attributeId: attribute.id,
                    difficulty,
                    advantage,
                    secret: isGm && secret,
                  })
                }
              >
                <div className="abbr">{attribute.abbreviation}</div>
                <div className="value">{character.attributes[attribute.id] ?? 0}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {lastRoll && <RollResult roll={lastRoll} />}
    </div>
  );
}

export function RollResult({ roll }: { roll: DiceRoll }) {
  const setting = useStore((s) => s.setting);
  const degree = roll.check?.degree;
  const degreeLabel = degree && setting ? setting.rules.degreeLabels[degree] : null;

  return (
    <div style={{ marginTop: '0.7rem', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
      {roll.label && <div className="small muted">{roll.label}</div>}
      <div className="dice-tray" style={{ margin: '0.4rem 0' }}>
        {roll.dice.map((die, index) => (
          <span
            key={index}
            className={[
              'die',
              die.dropped ? 'dropped' : '',
              die.exploded ? 'exploded' : '',
              !die.dropped && die.value === die.sides ? 'max' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={`d${die.sides}${die.dropped ? ' (descartado)' : ''}${die.exploded ? ' (explosão)' : ''}`}
          >
            {die.value}
          </span>
        ))}
        {roll.modifier !== 0 && (
          <span className="die" style={{ borderStyle: 'dashed' }}>
            {roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier}
          </span>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className={`roll-result ${degree ? `degree-${degree}` : ''}`}>{roll.total}</span>
        {degreeLabel && <span className={`badge degree-${degree}`}>{degreeLabel}</span>}
      </div>
      {roll.check && (
        <div className="small muted mono">
          contra {roll.check.difficulty} · margem{' '}
          {roll.check.margin >= 0 ? `+${roll.check.margin}` : roll.check.margin}
        </div>
      )}
      <div className="small muted mono" title="Semente da rolagem — permite auditar o resultado">
        seed {roll.seed}
      </div>
    </div>
  );
}
