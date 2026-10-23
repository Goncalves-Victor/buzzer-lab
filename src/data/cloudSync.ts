/* ==========================================================================
   cloudSync.ts
   Perfis na nuvem (Firebase Realtime Database).

   O aluno digita um NOME e esse nome vira a "gaveta" onde ficam guardados os
   "Meus exemplos" e a playlist dele, em qualquer computador ou celular. E o
   mesmo esquema do OLED Lab: o nome e a chave de acesso, nao ha senha.

   ISOLAMENTO (regra de ouro): o projeto Firebase e COMPARTILHADO com outras
   aplicacoes (bloco de notas "documentos/", OLED Lab "oledlab_exemplos/").
   O Buzzer Lab so le e escreve em "buzzerlab_perfis/<nome>". Todo acesso
   passa por pathFor(); nao crie outro caminho e nunca escreva em um no mais
   alto que um perfil, senao um unico set() poderia apagar dados de outras
   pessoas ou aplicacoes.

   As credenciais abaixo sao chaves de CLIENTE (nao sao segredo por natureza).

   O SDK do Firebase e carregado sob demanda (import dinamico): quem nao usa
   perfil nao baixa essa biblioteca.
   ========================================================================== */

import type { StoredSong } from '../music/songTypes';
import { sanitizeStoredSongs } from './songLists';

const firebaseConfig = {
  apiKey: 'AIzaSyBZ4-9-9uegoCUHq3icNN1nI-8F7e9K8zU',
  authDomain: 'educarino-45cc8.firebaseapp.com',
  databaseURL: 'https://educarino-45cc8-default-rtdb.firebaseio.com',
  projectId: 'educarino-45cc8',
  storageBucket: 'educarino-45cc8.firebasestorage.app',
  messagingSenderId: '879757167851',
  appId: '1:879757167851:web:071a190e687697979502ae',
};

/** Unico prefixo do Buzzer Lab no banco. Nao reutilize os dos outros apps. */
const PROFILES_ROOT = 'buzzerlab_perfis';

/** O que fica guardado em um perfil. */
export interface ProfileData {
  /** "Meus exemplos" */
  customSongs: StoredSong[];
  playlist: StoredSong[];
}

/** Transforma o nome digitado numa chave valida do Firebase (sem . # $ [ ] /). */
export function sanitizeProfileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[.#$[\]/\u0000-\u001f]/g, '_');
}

function pathFor(name: string): string {
  const key = sanitizeProfileName(name);
  // Chave vazia apontaria para "buzzerlab_perfis/" inteiro: gravar ali
  // apagaria TODOS os perfis. Recusamos em vez de arriscar.
  if (!key) throw new Error('Nome de perfil vazio.');
  return `${PROFILES_ROOT}/${key}`;
}

type FirebaseModules = {
  db: import('firebase/database').Database;
  ref: typeof import('firebase/database').ref;
  set: typeof import('firebase/database').set;
  onValue: typeof import('firebase/database').onValue;
};

let firebasePromise: Promise<FirebaseModules> | null = null;

function loadFirebase(): Promise<FirebaseModules> {
  if (!firebasePromise) {
    firebasePromise = (async () => {
      const [{ initializeApp }, database] = await Promise.all([
        import('firebase/app'),
        import('firebase/database'),
      ]);
      const app = initializeApp(firebaseConfig);
      return {
        db: database.getDatabase(app),
        ref: database.ref,
        set: database.set,
        onValue: database.onValue,
      };
    })();
    // Se falhar (ex.: sem internet para baixar o SDK), a proxima tentativa recomeca.
    firebasePromise.catch(() => {
      firebasePromise = null;
    });
  }
  return firebasePromise;
}

/** Le o que veio do banco. Listas vazias nao existem no Firebase: viram []. */
function parseProfile(value: unknown): ProfileData {
  const data = (typeof value === 'object' && value !== null ? value : {}) as {
    exemplos?: unknown;
    playlist?: unknown;
  };
  return {
    customSongs: sanitizeStoredSongs(data.exemplos),
    playlist: sanitizeStoredSongs(data.playlist),
  };
}

/**
 * Observa um perfil em tempo real. `onData` roda quando ja existe algo salvo
 * (la ou daqui mesmo); `onEmpty` quando o nome ainda nao tem nada.
 * Devolve a funcao que para de observar (segura para chamar a qualquer hora).
 */
export function watchProfile(
  name: string,
  onData: (profile: ProfileData) => void,
  onEmpty: () => void,
  onError: (message: string) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  loadFirebase()
    .then(({ db, ref, onValue }) => {
      if (cancelled) return;
      unsubscribe = onValue(
        ref(db, pathFor(name)),
        (snapshot) => {
          if (cancelled) return;
          const value: unknown = snapshot.val();
          if (value === null) onEmpty();
          else onData(parseProfile(value));
        },
        (error) => {
          if (!cancelled) onError(error.message);
        },
      );
    })
    .catch((error: unknown) => {
      if (!cancelled) onError(error instanceof Error ? error.message : 'Falha ao conectar.');
    });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

/** Salva o perfil inteiro. So escreve dentro de buzzerlab_perfis/<nome>. */
export async function saveProfile(name: string, profile: ProfileData): Promise<void> {
  const path = pathFor(name);
  const { db, ref, set } = await loadFirebase();
  // O Firebase recusa `undefined`; passar por JSON garante um objeto limpo.
  const payload: unknown = JSON.parse(
    JSON.stringify({ exemplos: profile.customSongs, playlist: profile.playlist }),
  );
  await set(ref(db, path), payload);
}
