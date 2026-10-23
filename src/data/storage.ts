/* ==========================================================================
   storage.ts
   Acesso ao localStorage.

   Todas as chaves usam o prefixo "buzzerlab.". O OLED Lab usa "oledlab." e os
   dois projetos podem ficar no mesmo dominio, entao misturar prefixos apagaria
   o trabalho do aluno no outro app.

   Todo acesso e protegido por try/catch: navegacao anonima e cotas cheias nao
   podem derrubar a aplicacao.
   ========================================================================== */

const PREFIX = 'buzzerlab.';

export const STORAGE_KEYS = {
  song: `${PREFIX}song`,
  songName: `${PREFIX}songName`,
  settings: `${PREFIX}settings`,
  customSongs: `${PREFIX}customSongs`,
  playlist: `${PREFIX}playlist`,
  profileName: `${PREFIX}profileName`,
} as const;

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignorado de proposito */
  }
}
