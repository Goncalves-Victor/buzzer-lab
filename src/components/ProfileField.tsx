/* ==========================================================================
   ProfileField.tsx
   Campo "Seu nome...": o nome e a chave do perfil na nuvem. Quem digita o
   mesmo nome em outro computador ve as mesmas musicas salvas e a mesma
   playlist (e como um bloco de notas: nao ha senha).

   So interface: o que acontece com o nome mora em state/useLibrary.ts.
   ========================================================================== */

import type { CloudStatus } from '../state/useLibrary';
import { PROFILE_NAME_MAX } from '../state/useLibrary';

interface ProfileFieldProps {
  value: string;
  onChange: (name: string) => void;
  /** Nome ja confirmado; o status so aparece quando existe um perfil ativo. */
  profileName: string;
  status: CloudStatus;
  error: string;
}

function statusLabel(status: CloudStatus): string {
  switch (status) {
    case 'loading':
      return '⏳ Carregando suas músicas...';
    case 'syncing':
      return '💾 Salvando...';
    case 'saved':
      return '✅ Sincronizado';
    case 'error':
      return '❌ Erro ao sincronizar';
    default:
      return '';
  }
}

export function ProfileField({ value, onChange, profileName, status, error }: ProfileFieldProps) {
  return (
    <div
      className="profile-field"
      title="Digite seu nome para guardar suas músicas e a playlist na nuvem e abrir em qualquer computador. Quem digitar o mesmo nome vê as mesmas músicas."
    >
      <input
        type="text"
        className="profile-input"
        placeholder="Seu nome..."
        maxLength={PROFILE_NAME_MAX}
        value={value}
        aria-label="Seu nome (perfil na nuvem)"
        onChange={(event) => onChange(event.target.value)}
      />
      {profileName ? (
        <span
          className={`cloud-status cloud-status-${status}`}
          title={status === 'error' ? error : undefined}
          role="status"
          aria-live="polite"
        >
          {statusLabel(status)}
        </span>
      ) : null}
    </div>
  );
}
