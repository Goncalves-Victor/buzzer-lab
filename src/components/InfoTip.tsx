/* ==========================================================================
   InfoTip.tsx
   Bolinha "?" que revela uma explicacao curta.

   Existe para a interface poder ser didatica sem ficar cheia de texto fixo.
   Funciona com clique (necessario em touchscreen) e nao apenas com hover.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';
import type { HelpTerm } from '../data/helpTexts';

interface InfoTipProps {
  info: HelpTerm;
}

export function InfoTip({ info }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span className="infotip" ref={wrapperRef}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={`O que é ${info.term}?`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      {open ? (
        <span className="infotip-bubble" role="note">
          <strong>{info.term}</strong>
          {info.text}
        </span>
      ) : null}
    </span>
  );
}
