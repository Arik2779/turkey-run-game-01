// Turkey Run — Escape Thanksgiving Dinner. The hand-in program (Node 22, standard
// library only): the game is this directory's game/ folder, plain static files a
// desktop browser loads offline (game/index.html and its ES modules, no library and
// no network request). This program assembles the submission in /output: it copies
// game/ and screenshots/ from beside this file, checks the screenshots meet the
// competition's caps (3 or 4 images, each at most 256 KiB), and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library (vendor/makefun-game.ts, the kit's copy, unchanged).
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262144;

function fail(message: string): never {
  throw new Error(`turkey-run main.ts: ${message}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.')).sort();
if (shots.length < 3 || shots.length > MAX_SCREENSHOTS) {
  fail(`expected 3 or 4 screenshots, found ${shots.length}`);
}
for (const name of shots) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > MAX_SCREENSHOT_BYTES) fail(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
}
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the others refuse an
// entry the scorer would refuse (more than 993 files in game/ or 48 MiB of game files,
// in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`turkey-run: handed in ${shots.length} screenshots (${shots.join(', ')}) to ${out}`);
