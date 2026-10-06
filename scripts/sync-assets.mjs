// Sincroniza /assets -> /public/assets, copia a engine de xadrez para /public/engine
// e gera um manifesto com as caricaturas disponíveis.
//
// Para trocar a silhueta de um personagem pela caricatura oficial basta soltar o
// arquivo em /assets/characters/<id>.(png|jpg|webp|svg) — ex.: tio-guilherme.png.
// Nenhuma alteração de código é necessária.
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'assets');
const publicAssets = join(root, 'public', 'assets');
const publicEngine = join(root, 'public', 'engine');
const manifestPath = join(root, 'src', 'config', 'assets.generated.json');

// 1. assets
rmSync(publicAssets, { recursive: true, force: true });
mkdirSync(publicAssets, { recursive: true });
if (existsSync(assetsDir)) cpSync(assetsDir, publicAssets, { recursive: true });

// 2. caricaturas
// Cada imagem vira uma versão leve (WebP quadrado de 384 px): o avatar aparece
// com no máximo ~100 px, então não faz sentido mandar o arquivo original de
// vários MB para o celular. Sem o "sharp" disponível, usa o original mesmo.
const characters = {};
const charDir = join(assetsDir, 'characters');
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  /* segue com os originais */
}
if (existsSync(charDir)) {
  for (const file of readdirSync(charDir)) {
    const ext = extname(file).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif'].includes(ext)) continue;
    const id = basename(file, extname(file));
    characters[id] = `/assets/characters/${file}`;
    if (!sharp || ext === '.svg') continue;
    try {
      const out = join(publicAssets, 'characters', `${id}.webp`);
      await sharp(join(charDir, file)).resize(384, 384, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toFile(out + '.tmp');
      rmSync(join(publicAssets, 'characters', file), { force: true });
      renameSync(out + '.tmp', out);
      // o parâmetro muda quando o arquivo muda: o navegador não fica com a imagem antiga
      characters[id] = `/assets/characters/${id}.webp?v=${Math.round(statSync(join(charDir, file)).mtimeMs)}`;
    } catch (err) {
      console.warn(`[sync-assets] não foi possível otimizar ${file}:`, err.message);
    }
  }
}

// 3. engine (Stockfish WASM, roda isolada em Web Worker)
const ENGINE_FILES = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];
const engineSrc = join(root, 'node_modules', 'stockfish', 'bin');
mkdirSync(publicEngine, { recursive: true });
let engineOk = true;
for (const f of ENGINE_FILES) {
  const from = join(engineSrc, f);
  if (existsSync(from)) cpSync(from, join(publicEngine, f));
  else engineOk = false;
}

mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(
  manifestPath,
  JSON.stringify(
    { characters, engine: engineOk ? `/engine/${ENGINE_FILES[0]}` : null },
    null,
    2,
  ) + '\n',
);
console.log(
  `[sync-assets] caricaturas: ${Object.keys(characters).length} | engine: ${engineOk ? 'ok' : 'ausente (fallback JS)'}`,
);
