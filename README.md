# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/a25822457/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/a25822457/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your photos into GTA-style multi-panel cover art, in the browser, offline.

**Competition:** [gta6-cover-art-01 on make.fun](https://make.fun/bounty/gta6-cover-art-01)

## What it does

- **6 layouts** — Full-bleed, 4-panel grid, Hero + 3, 9-panel grid, Tilted snapshots (overlapping polaroids), Split duo.
- **5 colour grades** — Vice Sunset, Neon Night, Golden Hour, Palm Dusk, Mono Noir. Each is a sunset/neon wash over the photos, drawn live on canvas.
- **Any photos, up to 4** — upload your own, or start with the two bundled sample photos. Click a panel to select it, click a thumbnail to put a photo in it, drag the photo to reposition it, zoom with the slider.
- **Your words** — big Anton title (solid white or sunset-gradient fill, black outline), Pacifico neon handwriting subtitle, badge ribbon, 0–5 heat stars.
- **Effects** — film grain, vignette, halftone dots behind the title.
- **One-click export** — 1080 × 1080, 1080 × 1350 and 1920 × 1080 PNGs, each its own button, plus one button that exports all three.
- **Undo / redo** — every edit is on a history stack.
- **Live preview** — the cover redraws as you change anything.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: every script, style, font and sample photo is a file under `app/`, and your photos are read on your own machine and never uploaded.

## Files

- `app/index.html` — the editor page (controls left, live preview right).
- `app/style.css` — dark violet / neon pink editor theme.
- `app/src/cover.js` — the cover render engine (layouts, grades, lettering, effects, PNG export).
- `app/src/main.js` — editor wiring (uploads, panel picking, drag-to-pan, history, exports).
- `app/src/shots.js` — screenshot scenes (`?shot=cover` shows the exported PNG, `?shot=editor` shows the full editor).
- `app/fonts/` — Anton and Pacifico, SIL Open Font License (see `app/fonts/OFL.txt`).
- `app/samples/` — two sample photos made with an image model, free to use.

## Originality

Everything here is original work. No Rockstar Games logo, wordmark, official artwork, character or font file is used. The title face is Anton and the handwriting is Pacifico, both under the SIL Open Font License.

## Licence

MIT — see [LICENSE](LICENSE).
