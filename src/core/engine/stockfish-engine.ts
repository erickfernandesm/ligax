import type { ChessEngine, EngineLimits, EngineLine, EngineResult } from './types';

/** Mínimo que precisamos de um Web Worker — fácil de adaptar para outra plataforma. */
export interface EngineWorkerLike {
  postMessage(message: string): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

interface Job {
  fen: string;
  limits: EngineLimits;
  onUpdate?: (lines: EngineLine[]) => void;
  resolve: (r: EngineResult) => void;
  lines: Map<number, EngineLine>;
  whiteToMove: boolean;
}

/**
 * Stockfish (UCI) rodando num worker. Recebe uma fábrica de worker para não
 * depender diretamente do browser.
 */
export class StockfishEngine implements ChessEngine {
  readonly name = 'Stockfish';
  private worker: EngineWorkerLike | null = null;
  private ready: Promise<void> | null = null;
  private current: Job | null = null;
  private pending: Job | null = null;
  private appliedSkill: number | null = null;
  private appliedMultiPv: number | null = null;

  constructor(private createWorker: () => EngineWorkerLike, private initTimeoutMs = 15000) {}

  init(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Engine demorou demais para iniciar'));
        }
      }, this.initTimeoutMs);
      try {
        const worker = this.createWorker();
        this.worker = worker;
        worker.onerror = (e) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(e instanceof Error ? e : new Error('Falha ao carregar a engine'));
          }
        };
        worker.onmessage = (event) => {
          const line = typeof event.data === 'string' ? event.data : '';
          if (!settled && line === 'readyok') {
            settled = true;
            clearTimeout(timer);
            resolve();
            return;
          }
          this.handleLine(line);
        };
        worker.postMessage('uci');
        worker.postMessage('isready');
      } catch (err) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
    return this.ready;
  }

  async search(fen: string, limits: EngineLimits, onUpdate?: (lines: EngineLine[]) => void): Promise<EngineResult> {
    await this.init();
    return new Promise<EngineResult>((resolve) => {
      const job: Job = {
        fen,
        limits,
        onUpdate,
        resolve,
        lines: new Map(),
        whiteToMove: fen.split(' ')[1] !== 'b',
      };
      if (this.current) {
        // Cancela a busca em andamento; a nova começa quando o "bestmove" dela chegar.
        if (this.pending) this.pending.resolve({ bestMove: null, lines: [] });
        this.pending = job;
        this.worker?.postMessage('stop');
      } else {
        this.start(job);
      }
    });
  }

  stop(): void {
    if (this.pending) {
      this.pending.resolve({ bestMove: null, lines: [] });
      this.pending = null;
    }
    if (this.current) this.worker?.postMessage('stop');
  }

  dispose(): void {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.current = null;
  }

  private start(job: Job): void {
    const w = this.worker;
    if (!w) {
      job.resolve({ bestMove: null, lines: [] });
      return;
    }
    this.current = job;
    const skill = Math.max(0, Math.min(20, job.limits.skillLevel ?? 20));
    if (skill !== this.appliedSkill) {
      w.postMessage(`setoption name Skill Level value ${skill}`);
      this.appliedSkill = skill;
    }
    const multiPv = Math.max(1, job.limits.multiPv ?? 1);
    if (multiPv !== this.appliedMultiPv) {
      w.postMessage(`setoption name MultiPV value ${multiPv}`);
      this.appliedMultiPv = multiPv;
    }
    w.postMessage(`position fen ${job.fen}`);
    const parts = ['go'];
    if (job.limits.depth) parts.push('depth', String(job.limits.depth));
    if (job.limits.moveTimeMs) parts.push('movetime', String(job.limits.moveTimeMs));
    if (parts.length === 1) parts.push('depth', '10');
    w.postMessage(parts.join(' '));
  }

  private handleLine(line: string): void {
    const job = this.current;
    if (!job) return;
    if (line.startsWith('info ') && line.includes(' pv ')) {
      const parsed = parseInfo(line, job.whiteToMove);
      if (parsed) {
        job.lines.set(parsed.rank, parsed);
        job.onUpdate?.(sortLines(job.lines));
      }
      return;
    }
    if (line.startsWith('bestmove')) {
      const move = line.split(/\s+/)[1];
      this.current = null;
      job.resolve({
        bestMove: !move || move === '(none)' ? null : move,
        lines: sortLines(job.lines),
      });
      if (this.pending) {
        const next = this.pending;
        this.pending = null;
        this.start(next);
      }
    }
  }
}

function sortLines(map: Map<number, EngineLine>): EngineLine[] {
  return [...map.values()].sort((a, b) => a.rank - b.rank);
}

function parseInfo(line: string, whiteToMove: boolean): EngineLine | null {
  const tokens = line.split(/\s+/);
  const value = (key: string) => {
    const i = tokens.indexOf(key);
    return i >= 0 ? tokens[i + 1] : undefined;
  };
  const scoreIdx = tokens.indexOf('score');
  const pvIdx = tokens.indexOf('pv');
  if (scoreIdx < 0 || pvIdx < 0) return null;
  // limites (lowerbound/upperbound) são estimativas intermediárias: ignora
  if (tokens.includes('lowerbound') || tokens.includes('upperbound')) return null;
  const kind = tokens[scoreIdx + 1];
  const raw = Number(tokens[scoreIdx + 2]);
  if (Number.isNaN(raw)) return null;
  const sign = whiteToMove ? 1 : -1;
  return {
    rank: Number(value('multipv') ?? 1),
    depth: Number(value('depth') ?? 0),
    scoreCp: kind === 'cp' ? raw * sign : null,
    mateIn: kind === 'mate' ? raw * sign : null,
    pv: tokens.slice(pvIdx + 1),
  };
}
