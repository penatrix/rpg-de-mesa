import { useMemo, useState } from 'react';

import { useStore } from '../store.js';

/**
 * Criação de personagem dirigida pela ambientação: atributos, classes, origens
 * e pontos livres vêm todos da `SettingDefinition`, então esta tela funciona
 * igual em Tibia, no Horror Cósmico ou no Aro Exterior.
 */
export function CharacterCreation() {
  const setting = useStore((s) => s.setting);
  const table = useStore((s) => s.table);
  const createCharacter = useStore((s) => s.createCharacter);

  const [name, setName] = useState('');
  const [classId, setClassId] = useState<string>('');
  const [originId, setOriginId] = useState<string>('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const model = setting?.characterModel;
  const selectedClass = model?.classes.find((c) => c.id === classId);
  const selectedOrigin = model?.origins?.find((o) => o.id === originId);

  const spent = useMemo(
    () => Object.values(allocations).reduce((sum, n) => sum + n, 0),
    [allocations],
  );
  const remaining = (model?.pointBuy ?? 0) - spent;

  // Prévia dos atributos finais: base + classe + origem + pontos livres.
  const preview = useMemo(() => {
    if (!model) return {};
    const result: Record<string, number> = {};
    for (const attribute of model.attributes) {
      result[attribute.id] = Math.min(
        attribute.max,
        Math.max(
          attribute.min,
          attribute.base +
            (selectedClass?.attributeModifiers[attribute.id] ?? 0) +
            (selectedOrigin?.attributeModifiers?.[attribute.id] ?? 0) +
            (allocations[attribute.id] ?? 0),
        ),
      );
    }
    return result;
  }, [model, selectedClass, selectedOrigin, allocations]);

  if (!setting || !model || !table) {
    return (
      <div className="home">
        <p className="muted">Carregando a ambientação…</p>
      </div>
    );
  }

  function adjust(attributeId: string, delta: number) {
    setAllocations((current) => {
      const next = Math.max(0, (current[attributeId] ?? 0) + delta);
      if (delta > 0 && remaining <= 0) return current;
      return { ...current, [attributeId]: next };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!classId || busy) return;
    setBusy(true);
    try {
      await createCharacter({
        name,
        classId,
        originId: originId || undefined,
        allocations,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="home">
      <header className="home-header">
        <h1>Novo {setting.labels.character}</h1>
        <p className="muted">
          {setting.name} — mesa “{table.config.name}” · código{' '}
          <span className="join-code">{table.joinCode}</span>
        </p>
      </header>

      <form onSubmit={submit}>
        <div className="panel">
          <div className="field">
            <label htmlFor="charName">Nome</label>
            <input
              id="charName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Nome do seu ${setting.labels.character.toLowerCase()}`}
              maxLength={40}
              required
            />
          </div>
        </div>

        <div className="panel">
          <h3>{setting.labels.class}</h3>
          <div className="setting-grid">
            {model.classes.map((klass) => (
              <button
                key={klass.id}
                type="button"
                className="setting-card"
                aria-pressed={classId === klass.id}
                onClick={() => setClassId(klass.id)}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h3>
                    {klass.icon} {klass.name}
                  </h3>
                </div>
                <p className="small muted" style={{ margin: 0, fontStyle: 'italic' }}>
                  {klass.tagline}
                </p>
                <p className="small" style={{ margin: 0 }}>
                  {klass.description}
                </p>
                {klass.promotion && (
                  <p className="small muted mono" style={{ margin: 0 }}>
                    Promoção no nível {klass.promotion.atLevel}: {klass.promotion.name}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {model.origins && model.origins.length > 0 && (
          <div className="panel">
            <h3>Origem</h3>
            <div className="field">
              <select value={originId} onChange={(e) => setOriginId(e.target.value)}>
                <option value="">Sem origem definida</option>
                {model.origins.map((origin) => (
                  <option key={origin.id} value={origin.id}>
                    {origin.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedOrigin && <p className="small muted">{selectedOrigin.description}</p>}
          </div>
        )}

        <div className="panel">
          <div className="panel-title">
            <h3 style={{ margin: 0 }}>Atributos</h3>
            <span className={remaining === 0 ? 'badge' : 'badge accent'}>
              {remaining} de {model.pointBuy} pontos livres
            </span>
          </div>

          <div className="attribute-grid">
            {model.attributes.map((attribute) => (
              <div key={attribute.id} className="attribute" title={attribute.description}>
                <div className="abbr">{attribute.abbreviation}</div>
                <div className="value">{preview[attribute.id]}</div>
                <div className="small muted">{attribute.name}</div>
                <div className="row" style={{ justifyContent: 'center', marginTop: '0.3em' }}>
                  <button
                    type="button"
                    className="tiny"
                    onClick={() => adjust(attribute.id, -1)}
                    disabled={(allocations[attribute.id] ?? 0) === 0}
                    aria-label={`Reduzir ${attribute.name}`}
                  >
                    −
                  </button>
                  <span className="small mono">+{allocations[attribute.id] ?? 0}</span>
                  <button
                    type="button"
                    className="tiny"
                    onClick={() => adjust(attribute.id, 1)}
                    disabled={remaining <= 0}
                    aria-label={`Aumentar ${attribute.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedClass && (
          <div className="panel">
            <h4>Começa com</h4>
            <p className="small">
              <strong>{setting.labels.ability}s:</strong>{' '}
              {selectedClass.startingAbilities
                .map((id) => setting.abilities.find((a) => a.id === id)?.name ?? id)
                .join(', ') || '—'}
            </p>
            <p className="small">
              <strong>Equipamento:</strong>{' '}
              {selectedClass.startingItems
                .map((id) => setting.items.find((i) => i.id === id)?.name ?? id)
                .join(', ') || '—'}
            </p>
          </div>
        )}

        <button type="submit" className="primary" disabled={!classId || !name.trim() || busy}>
          {busy ? 'Criando…' : 'Entrar na mesa'}
        </button>
      </form>
    </div>
  );
}
