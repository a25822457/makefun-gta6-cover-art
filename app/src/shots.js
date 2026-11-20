// Neon Coast Cover Studio — screenshot scenes.
// ?shot=cover renders the real exported PNG (the same blob the export
// buttons download) and shows it full-bleed; ?shot=editor leaves the full
// editor up with the sample photos loaded. Either scene sets
// window.__shotReady = true once the picture is on screen.

import { EXPORT_SIZES, exportCoverPNG, ensureCoverFonts } from './cover.js';

/** Apply the shot URL's overrides (layout / grade / title / subtitle / size) to the state. */
function applyShotParams(params, ctx) {
  const { state } = ctx;
  const layout = params.get('layout');
  if (layout) state.layout = layout;
  const grade = params.get('grade');
  if (grade) state.grade = grade;
  const title = params.get('title');
  if (title) state.title = title;
  const subtitle = params.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;
  const sizeId = params.get('size');
  if (sizeId) state.exportSize = sizeId;
  state.selectedPanel = 0;
  state.showSelection = false;
}

/** The cover scene: show the exported PNG itself, scaled to the viewport. */
async function runCoverShot(params, ctx) {
  const { state, photos } = ctx;
  applyShotParams(params, ctx);
  await ensureCoverFonts();
  const size = EXPORT_SIZES.find((s) => s.id === state.exportSize) || EXPORT_SIZES[1];
  const clean = { ...state, showSelection: false };
  const blob = await exportCoverPNG(clean, photos, size.width, size.height);
  const url = URL.createObjectURL(blob);
  document.body.classList.add('shot-cover');
  document.body.innerHTML = '';
  const img = document.createElement('img');
  img.id = 'shotCover';
  img.src = url;
  img.alt = `Exported Neon Coast cover — ${state.title}`;
  document.body.appendChild(img);
  await new Promise((resolve) => {
    if (img.complete) resolve();
    else { img.onload = resolve; img.onerror = resolve; }
  });
  window.__shotReady = true;
}

/** The editor scene: the full editor, samples loaded, preview rendered. */
async function runEditorShot(params, ctx) {
  const { state, syncControls, renderPreview } = ctx;
  applyShotParams(params, ctx);
  await ensureCoverFonts();
  syncControls();
  renderPreview();
  // Let the preview paint before signalling readiness.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
}

/** Entry point from main.js once the editor (and its sample photos) is ready. */
export async function runShot(shot, params, ctx) {
  if (shot === 'cover') return runCoverShot(params, ctx);
  if (shot === 'editor') return runEditorShot(params, ctx);
  window.__shotReady = true;
  return undefined;
}
