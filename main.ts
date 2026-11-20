// Neon Coast Cover Studio — submission program (Node 22, standard library only).
//
// What it hands in: the static web app in this repo's app/ folder — an
// offline GTA-style cover maker (six multi-panel layouts, five sunset/neon
// colour grades, three PNG export sizes) — plus the screenshots/ folder.
// It copies both into the output directory and writes dossier.json there
// with the vendored make.fun library, so the judge can read the entry.
//
// How to run it outside the grader (MAKEFUN_OUTPUT_DIR stands in for /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice and the two outputs are byte-identical: the copy is a plain
// recursive copy and buildDossier is deterministic, so nothing in the
// output depends on the time or on the order files happen to be listed.
//
// The caps below are the scorer's own: text_max_bytes is the only one that
// shapes the dossier's bytes; the rest refuse an entry the scorer would
// refuse (more than 4 screenshots, one over 256 KiB, more than 993 files
// in app/ or 48 MiB of app files, or an app path over 1000 bytes).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root: the folder this file lives in.
const here = fileURLToPath(new URL('.', import.meta.url));
// The grader writes to /output; a local run overrides it with MAKEFUN_OUTPUT_DIR.
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
