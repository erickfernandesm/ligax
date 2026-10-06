import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SEED_LESSONS, SEED_PROFESSORS } from '@/content/lessons';

// ─────────────────────────────────────────────────────────────────────────────
// Armazenamento do servidor. Todo o resto de src/server fala só com a interface
// Store, que tem duas implementações:
//
//  - FileStore: um arquivo JSON em /data. É o que roda na sua máquina
//    (npm run dev) ou em qualquer servidor Node com disco.
//  - D1Store: o banco D1 da Cloudflare (SQLite). É escolhido sozinho quando a
//    aplicação roda na Cloudflare com o binding "DB" configurado.
//
// Os dados são guardados como documentos (coleção + id → JSON). É simples de
// propósito: serve bem para o tamanho atual e deixa a troca por tabelas
// "de verdade" contida neste arquivo.
// ─────────────────────────────────────────────────────────────────────────────

export type Collection = 'users' | 'sessions' | 'userData' | 'professors' | 'lessons' | 'matches' | 'media' | 'meta';

export interface Store {
  readonly kind: 'file' | 'd1';
  get<T>(collection: Collection, id: string): Promise<T | null>;
  list<T>(collection: Collection): Promise<T[]>;
  put<T>(collection: Collection, id: string, value: T): Promise<void>;
  remove(collection: Collection, id: string): Promise<void>;
}

// ───────────────────────── arquivo (Node) ─────────────────────────

/** Pasta do projeto. Na Cloudflare não existe disco (nem sempre existe process.cwd): cai para "/". */
function projectDir(): string {
  try {
    return process.cwd();
  } catch {
    return '/';
  }
}

export const DATA_DIR = process.env.LIGAX_DATA_DIR || join(projectDir(), 'data');
export const UPLOAD_DIR = join(DATA_DIR, 'uploads');
const DB_FILE = join(DATA_DIR, 'ligax.json');

type FileData = Record<string, Record<string, unknown>>;

/** Converte o formato antigo (listas) para o atual (coleção → id → documento). */
function migrate(raw: Record<string, unknown>): FileData {
  if (raw.collections) return raw.collections as FileData;
  const data: FileData = {};
  const byId = (name: string, key = 'id') => {
    const list = raw[name];
    if (!Array.isArray(list)) return;
    data[name] = Object.fromEntries(list.map((row) => [String((row as Record<string, unknown>)[key]), row]));
  };
  byId('users');
  byId('sessions', 'tokenHash');
  byId('professors');
  byId('lessons');
  byId('matches');
  byId('media');
  if (raw.userData && typeof raw.userData === 'object') data.userData = raw.userData as Record<string, unknown>;
  // quem já tinha banco no formato antigo já tinha o conteúdo inicial
  if (data.professors) data.meta = { seed: { done: true } };
  return data;
}

class FileStore implements Store {
  readonly kind = 'file' as const;
  private data: FileData;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    this.data = {};
    if (existsSync(DB_FILE)) {
      try {
        this.data = migrate(JSON.parse(readFileSync(DB_FILE, 'utf8')));
      } catch (err) {
        // Arquivo corrompido: preserva uma cópia e recomeça, em vez de derrubar o servidor.
        console.error('[store] não foi possível ler o banco, iniciando vazio.', err);
        try {
          renameSync(DB_FILE, `${DB_FILE}.corrompido-${Date.now()}`);
        } catch {
          /* segue */
        }
      }
    }
  }

  private col(name: Collection): Record<string, unknown> {
    return (this.data[name] ??= {});
  }

  /** Várias alterações seguidas viram uma escrita só; a troca do arquivo é atômica. */
  private save(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        mkdirSync(DATA_DIR, { recursive: true });
        const tmp = `${DB_FILE}.tmp`;
        writeFileSync(tmp, JSON.stringify({ collections: this.data }));
        renameSync(tmp, DB_FILE);
      } catch (err) {
        console.error('[store] falha ao gravar o banco.', err);
      }
    }, 120);
  }

  // structuredClone: quem recebe um documento pode alterá-lo sem mexer no que está guardado
  async get<T>(collection: Collection, id: string): Promise<T | null> {
    const value = this.col(collection)[id];
    return value === undefined ? null : (structuredClone(value) as T);
  }
  async list<T>(collection: Collection): Promise<T[]> {
    return Object.values(this.col(collection)).map((v) => structuredClone(v) as T);
  }
  async put<T>(collection: Collection, id: string, value: T): Promise<void> {
    this.col(collection)[id] = structuredClone(value);
    this.save();
  }
  async remove(collection: Collection, id: string): Promise<void> {
    delete this.col(collection)[id];
    this.save();
  }
}

// ───────────────────────── D1 (Cloudflare) ─────────────────────────

/** O pedaço da API do D1 que usamos. */
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1Like {
  prepare(sql: string): D1Statement;
}

export class D1Store implements Store {
  readonly kind = 'd1' as const;
  private ready: Promise<unknown> | null = null;

  constructor(private db: D1Like) {}

  /** Cria a tabela na primeira vez (uma vez por instância do servidor). */
  private init(): Promise<unknown> {
    return (this.ready ??= this.db
      .prepare('CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (col, id))')
      .run());
  }

  async get<T>(collection: Collection, id: string): Promise<T | null> {
    await this.init();
    const row = await this.db.prepare('SELECT data FROM docs WHERE col = ?1 AND id = ?2').bind(collection, id).first<{ data: string }>();
    return row ? (JSON.parse(row.data) as T) : null;
  }
  async list<T>(collection: Collection): Promise<T[]> {
    await this.init();
    const { results } = await this.db.prepare('SELECT data FROM docs WHERE col = ?1').bind(collection).all<{ data: string }>();
    return results.map((r) => JSON.parse(r.data) as T);
  }
  async put<T>(collection: Collection, id: string, value: T): Promise<void> {
    await this.init();
    await this.db
      .prepare('INSERT INTO docs (col, id, data) VALUES (?1, ?2, ?3) ON CONFLICT (col, id) DO UPDATE SET data = excluded.data')
      .bind(collection, id, JSON.stringify(value))
      .run();
  }
  async remove(collection: Collection, id: string): Promise<void> {
    await this.init();
    await this.db.prepare('DELETE FROM docs WHERE col = ?1 AND id = ?2').bind(collection, id).run();
  }
}

// ───────────────────────── escolha e conteúdo inicial ─────────────────────────

/**
 * Bindings da Cloudflare. O adaptador OpenNext publica o contexto da requisição
 * neste símbolo global (é o mesmo lugar que `getCloudflareContext()` lê); ler
 * direto daqui evita depender do pacote quando a aplicação roda fora da Cloudflare.
 */
function cloudflareEnv(): Record<string, unknown> | null {
  const ctx = (globalThis as Record<symbol, unknown>)[Symbol.for('__cloudflare-context__')] as { env?: Record<string, unknown> } | undefined;
  return ctx?.env ?? null;
}

/** Valor de configuração: variável da Cloudflare ou variável de ambiente comum. */
export function envVar(name: string): string | undefined {
  const fromCf = cloudflareEnv()?.[name];
  return typeof fromCf === 'string' ? fromCf : process.env[name];
}

/** Conteúdo inicial (professores e aulas-rascunho), gravado uma única vez. */
export async function seed(store: Store): Promise<void> {
  if (await store.get('meta', 'seed')) return;
  for (const p of SEED_PROFESSORS) await store.put('professors', p.id, p);
  for (const l of SEED_LESSONS) await store.put('lessons', l.id, l);
  await store.put('meta', 'seed', { done: true, at: new Date().toISOString() });
}

// globalThis: sobrevive ao hot reload do Next em desenvolvimento.
const holder = globalThis as unknown as { __ligaxStore?: Promise<Store>; __ligaxTestStore?: Store };

export function getStore(): Promise<Store> {
  if (holder.__ligaxTestStore) return Promise.resolve(holder.__ligaxTestStore);
  return (holder.__ligaxStore ??= (async () => {
    const d1 = cloudflareEnv()?.DB as D1Like | undefined;
    const store: Store = d1 ? new D1Store(d1) : new FileStore();
    await seed(store);
    return store;
  })());
}

/** Só para testes: troca o armazenamento (ex.: um D1 simulado). */
export function useStoreForTests(store: Store | null): void {
  holder.__ligaxTestStore = store ?? undefined;
  holder.__ligaxStore = undefined;
}

export function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
