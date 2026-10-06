import manifest from '@/config/assets.generated.json';
import { MinimaxEngine, StockfishEngine, type ChessEngine, type EngineWorkerLike } from '@/core/engine';

// Ponto único de acesso à engine. Tenta o Stockfish (WASM, em Web Worker);
// se o aparelho não suportar, cai para a engine em JavaScript.

let enginePromise: Promise<ChessEngine> | null = null;

async function createEngine(): Promise<ChessEngine> {
  const path = manifest.engine;
  if (path && typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined') {
    const engine = new StockfishEngine(() => new Worker(path) as unknown as EngineWorkerLike);
    try {
      await engine.init();
      return engine;
    } catch (err) {
      console.warn('[engine] Stockfish indisponível, usando engine JS.', err);
      engine.dispose();
    }
  }
  const fallback = new MinimaxEngine();
  await fallback.init();
  return fallback;
}

export function getEngine(): Promise<ChessEngine> {
  if (!enginePromise) enginePromise = createEngine();
  return enginePromise;
}

/** Começa a carregar a engine antes de ela ser necessária. */
export function warmUpEngine(): void {
  void getEngine();
}
