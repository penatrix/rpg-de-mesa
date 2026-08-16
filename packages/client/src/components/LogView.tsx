import { useEffect, useRef } from 'react';

import type { LogEntry } from '@rpg/shared';
import { useStore } from '../store.js';

export function LogView({ entries }: { entries: LogEntry[] }) {
  const gmThinking = useStore((s) => s.gmThinking);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  // Só rola sozinho se o leitor já estava no fim: quem subiu para reler uma
  // cena antiga não deve ser arrastado de volta a cada narração nova.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pinnedToBottom.current) return;
    container.scrollTop = container.scrollHeight;
  }, [entries, gmThinking]);

  function handleScroll() {
    const container = containerRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    pinnedToBottom.current = distance < 80;
  }

  return (
    <div className="log" ref={containerRef} onScroll={handleScroll} aria-live="polite">
      {entries.map((entry) => (
        <article
          key={entry.id}
          className={[
            'log-entry',
            entry.kind,
            entry.gmOnly ? 'gm-only' : '',
            entry.streaming ? 'streaming' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {entry.kind !== 'system' && (
            <div className="author">
              {entry.authorName}
              {entry.gmOnly && ' · só o Mestre vê'}
            </div>
          )}
          <div className="body">{entry.text}</div>
          {entry.roll && (
            <div className="dice-tray" style={{ marginTop: '0.3rem' }}>
              {entry.roll.dice.map((die, index) => (
                <span key={index} className={`die ${die.dropped ? 'dropped' : ''}`}>
                  {die.value}
                </span>
              ))}
            </div>
          )}
        </article>
      ))}

      {gmThinking && (
        <div className="thinking" aria-label="O Mestre está pensando">
          <span />
          <span />
          <span />
          <em style={{ marginLeft: '0.4em' }}>o Mestre está pensando…</em>
        </div>
      )}

      {entries.length === 0 && <p className="muted">A mesa ainda está em silêncio.</p>}
    </div>
  );
}
