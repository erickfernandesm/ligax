// Camada de persistência. Hoje: localStorage. Num app React Native basta
// fornecer outra implementação de KeyValueStorage (ex.: AsyncStorage); num
// backend, trocar os repositórios que usam esta interface.

export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function createWebStorage(): KeyValueStorage {
  const memory = createMemoryStorage();
  const local = (): Storage | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null; // modo privado / storage bloqueado
    }
  };
  return {
    getItem: (k) => {
      try {
        return local()?.getItem(k) ?? memory.getItem(k);
      } catch {
        return memory.getItem(k);
      }
    },
    setItem: (k, v) => {
      try {
        const s = local();
        if (s) s.setItem(k, v);
        else memory.setItem(k, v);
      } catch {
        memory.setItem(k, v);
      }
    },
    removeItem: (k) => {
      try {
        local()?.removeItem(k);
      } catch {
        /* ignora */
      }
      memory.removeItem(k);
    },
  };
}

export const appStorage: KeyValueStorage = createWebStorage();

export const STORAGE_KEYS = {
  session: 'ligax:session',
  progress: 'ligax:progress',
  content: 'ligax:content',
  lab: 'ligax:lab',
  settings: 'ligax:settings',
  activeGame: 'ligax:active-game',
} as const;

export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}
