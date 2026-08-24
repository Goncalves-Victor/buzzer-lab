/* ==========================================================================
   CodePanel.tsx
   Mostra os dois vetores gerados a partir da musica atual.

   Atualiza sozinho a cada edicao: e o retorno visual de que a musica e o
   codigo sao a mesma coisa vista de dois jeitos.
   ========================================================================== */

import { useEffect, useState } from 'react';
import type { SongEvent } from '../music/songTypes';
import { generateArrays, songStats } from '../export/codeGenerator';

interface CodePanelProps {
  events: SongEvent[];
  songName: string;
  onOpenFullCode: () => void;
}

export function CodePanel({ events, songName, onOpenFullCode }: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const arrays = generateArrays(events, songName);
  const stats = songStats(events);

  // A mensagem "Copiado!" some sozinha; o timer e limpo no unmount.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(arrays.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="panel code-panel" aria-label="Código gerado">
      <header className="panel-head">
        <h2 className="panel-title">Código gerado</h2>
        <span className="panel-meta">
          {stats.noteCount} {stats.noteCount === 1 ? 'nota' : 'notas'}
          {stats.restCount > 0
            ? ` · ${stats.restCount} ${stats.restCount === 1 ? 'pausa' : 'pausas'}`
            : ''}{' '}
          · Duração total: {stats.totalLabel}
        </span>
      </header>

      <pre className="code-block" tabIndex={0}>
        <code>{events.length === 0 ? '// Grave ou abra um exemplo para ver o código.' : arrays.code}</code>
      </pre>

      <div className="code-actions">
        <button type="button" className="btn btn-small" onClick={copy} disabled={events.length === 0}>
          {copied ? '✓ Copiado!' : '⧉ Copiar código'}
        </button>
        <button
          type="button"
          className="btn btn-small btn-primary"
          onClick={onOpenFullCode}
          disabled={events.length === 0}
        >
          Ver código completo
        </button>
      </div>
    </section>
  );
}
