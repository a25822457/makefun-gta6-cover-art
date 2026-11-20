// Neon Coast Cover Studio — editor wiring.
// Owns the photos, the cover state, undo/redo history, the live preview and
// the PNG exports. The render engine lives in cover.js; this file only
// connects it to the page. Shot scenes (?shot=…) are handled by shots.js.

import {
  LAYOUTS, GRADES, EXPORT_SIZES, MAX_PHOTOS,
  createCoverState, layoutOf, gradeOf, panelCount, panelRects,
  renderCover, renderCoverToCanvas, exportCoverPNG, ensureCoverFonts,
} from './cover.js';

const $ = (id) => document.getElementById(id);
const state = createCoverState();
const photos = []; // { image: HTMLImageElement, name: string, url: string }
let undoStack = [];
let redoStack = [];
let drag = null; // { startX, startY, panX, panY } while dragging the preview

/** A plain snapshot of the editable state, for undo/redo. */
function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

function restore(snap) {
  const keepSelection = state.selectedPanel;
  Object.assign(state, JSON.parse(JSON.stringify(snap)));
  state.selectedPanel = keepSelection;
  syncControls();
  renderPreview();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  updateUndoButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  updateUndoButtons();
}

function updateUndoButtons() {
  $('undoBtn').disabled = undoStack.length === 0;
  $('redoBtn').disabled = redoStack.length === 0;
}

/** The export size the preview shows. */
function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.exportSize) || EXPORT_SIZES[1];
}

/** Redraw the preview canvas from the current state and photos. */
function renderPreview() {
  const size = currentSize();
  const canvas = $('previewCanvas');
  const fit = $('previewFit');
  // Backing store at half export resolution keeps the preview crisp but fast.
  const scale = 0.5;
  renderCover(canvas, { ...state, showSelection: true }, photos,
    Math.round(size.width * scale), Math.round(size.height * scale));
  fit.style.aspectRatio = `${size.width} / ${size.height}`;
  updatePhotoStrip();
  updatePanelHint();
}

/** The filmstrip under the preview: one thumb per photo, click to assign to the selected panel. */
function updatePhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = `${photo.name} — click to put it in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;
    button.appendChild(img);
    const tag = document.createElement('span');
    tag.textContent = `Photo ${i + 1}`;
    button.appendChild(tag);
    button.addEventListener('click', () => {
      pushHistory();
      state.panels[state.selectedPanel].photo = i;
      renderPreview();
    });
    strip.appendChild(button);
  });
  const count = $('photoCount');
  count.textContent = `${photos.length} / ${MAX_PHOTOS} photos`;
}

/** Hint line under the preview: which panel is selected and what it shows. */
function updatePanelHint() {
  const n = panelCount(state.layout);
  const framing = state.panels[state.selectedPanel] || {};
  const name = photos[framing.photo] ? photos[framing.photo].name : 'no photo yet';
  $('panelHint').textContent =
    `Panel ${state.selectedPanel + 1} of ${n} — ${name} · zoom ${(framing.zoom || 1).toFixed(2)}× · click a panel to select it, drag it to move the photo`;
}

/** Copy the state into every control (used after undo/redo and shot setup). */
function syncControls() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
  $('starsInput').value = String(state.stars);
  $('titleFillInput').value = state.titleFill;
  $('grainInput').checked = state.grain;
  $('vignetteInput').checked = state.vignette;
  $('halftoneInput').checked = state.halftone;
  document.querySelectorAll('#layoutGrid button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeGrid button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizeGrid button').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.exportSize);
  });
  const framing = state.panels[state.selectedPanel] || { zoom: 1.1, panX: 0, panY: 0 };
  $('zoomInput').value = String(framing.zoom || 1.1);
  $('panXInput').value = String(framing.panX || 0);
  $('panYInput').value = String(framing.panY || 0);
  $('zoomValue').textContent = `${(framing.zoom || 1.1).toFixed(2)}×`;
}

/** Build the layout / grade / size picker buttons. */
function buildPickers() {
  const layoutGrid = $('layoutGrid');
  LAYOUTS.forEach((layout) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = layout.id;
    b.innerHTML = `<strong>${layout.name}</strong><span>${layout.panels} panel${layout.panels > 1 ? 's' : ''} · ${layout.hint}</span>`;
    b.addEventListener('click', () => {
      if (state.layout === layout.id) return;
      pushHistory();
      state.layout = layout.id;
      state.selectedPanel = 0;
      syncControls();
      renderPreview();
    });
    layoutGrid.appendChild(b);
  });
  const gradeGrid = $('gradeGrid');
  GRADES.forEach((grade) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = grade.id;
    b.style.setProperty('--g1', grade.top);
    b.style.setProperty('--g2', grade.bottom);
    b.innerHTML = `<span class="swatch"></span><strong>${grade.name}</strong>`;
    b.addEventListener('click', () => {
      if (state.grade === grade.id) return;
      pushHistory();
      state.grade = grade.id;
      syncControls();
      renderPreview();
    });
    gradeGrid.appendChild(b);
  });
  const sizeGrid = $('sizeGrid');
  EXPORT_SIZES.forEach((size) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = size.id;
    b.textContent = size.label;
    b.addEventListener('click', () => {
      state.exportSize = size.id;
      syncControls();
      renderPreview();
    });
    sizeGrid.appendChild(b);
  });
}

/** Load one image file (or sample URL) into the photo list. */
function addPhotoFromImage(image, name, url) {
  if (photos.length >= MAX_PHOTOS) {
    alert(`Neon Coast holds up to ${MAX_PHOTOS} photos — remove one first.`);
    return false;
  }
  photos.push({ image, name, url });
  return true;
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => reject(new Error(`could not read ${file.name}`));
    image.src = url;
  });
}

function loadSample(url, name) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => reject(new Error(`could not load ${url}`));
    image.src = url;
  });
}

async function loadSamples() {
  // The two bundled sample photos, so the editor opens with a cover ready.
  for (const [url, name] of [['samples/boulevard.jpg', 'Boulevard sunset'], ['samples/pier.jpg', 'Pier fishing']]) {
    try {
      const { image } = await loadSample(url, name);
      addPhotoFromImage(image, name, url);
    } catch (err) {
      console.warn(err.message);
    }
  }
}

/** Download a blob as a file, the way the export buttons hand out PNGs. */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const safeTitle = () => (state.title || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';

async function exportOne(size) {
  const clean = { ...state, showSelection: false };
  const blob = await exportCoverPNG(clean, photos, size.width, size.height);
  downloadBlob(blob, `neon-coast-${safeTitle()}-${size.width}x${size.height}.png`);
  return blob;
}

async function exportAll() {
  const btn = $('exportAllBtn');
  btn.disabled = true;
  btn.textContent = 'Exporting…';
  try {
    for (const size of EXPORT_SIZES) {
      await exportOne(size);
      await new Promise((r) => setTimeout(r, 250));
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Export all three sizes';
  }
}

/** Which panel (if any) sits under a click on the preview canvas. */
function panelAtPoint(event) {
  const canvas = $('previewCanvas');
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const size = currentSize();
  const scale = canvas.width / size.width;
  const rects = panelRects(state.layout, size.width, size.height);
  // Tilted panels are rotated; hit-test in their unrotated frame.
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    let px = x / scale;
    let py = y / scale;
    if (r.rot) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const a = (-r.rot * Math.PI) / 180;
      const dx = px - cx;
      const dy = py - cy;
      px = cx + dx * Math.cos(a) - dy * Math.sin(a);
      py = cy + dx * Math.sin(a) + dy * Math.cos(a);
    }
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

function bindPreview() {
  const canvas = $('previewCanvas');
  canvas.addEventListener('pointerdown', (event) => {
    const i = panelAtPoint(event);
    if (i < 0) return;
    state.selectedPanel = i;
    const framing = state.panels[i];
    drag = { startX: event.clientX, startY: event.clientY, panX: framing.panX, panY: framing.panY, moved: false };
    canvas.setPointerCapture(event.pointerId);
    syncControls();
    renderPreview();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (event.clientX - drag.startX) / rect.width;
    const dy = (event.clientY - drag.startY) / rect.height;
    if (Math.abs(dx) + Math.abs(dy) > 0.01) drag.moved = true;
    const framing = state.panels[state.selectedPanel];
    framing.panX = Math.max(-1, Math.min(1, drag.panX + dx * 2));
    framing.panY = Math.max(-1, Math.min(1, drag.panY + dy * 2));
    $('panXInput').value = String(framing.panX);
    $('panYInput').value = String(framing.panY);
    renderPreview();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) pushHistory();
    drag = null;
  });
}

function bindControls() {
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; renderPreview(); });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; renderPreview(); });
  $('subtitleInput').addEventListener('change', pushHistory);
  $('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; renderPreview(); });
  $('badgeInput').addEventListener('change', pushHistory);
  $('starsInput').addEventListener('input', (e) => { state.stars = Number(e.target.value); renderPreview(); });
  $('starsInput').addEventListener('change', pushHistory);
  $('titleFillInput').addEventListener('change', (e) => { pushHistory(); state.titleFill = e.target.value; renderPreview(); });
  $('grainInput').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; renderPreview(); });
  $('vignetteInput').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; renderPreview(); });
  $('halftoneInput').addEventListener('change', (e) => { pushHistory(); state.halftone = e.target.checked; renderPreview(); });

  const framing = () => state.panels[state.selectedPanel];
  $('zoomInput').addEventListener('input', (e) => {
    framing().zoom = Number(e.target.value);
    $('zoomValue').textContent = `${framing().zoom.toFixed(2)}×`;
    renderPreview();
  });
  $('zoomInput').addEventListener('change', pushHistory);
  $('panXInput').addEventListener('input', (e) => { framing().panX = Number(e.target.value); renderPreview(); });
  $('panXInput').addEventListener('change', pushHistory);
  $('panYInput').addEventListener('input', (e) => { framing().panY = Number(e.target.value); renderPreview(); });
  $('panYInput').addEventListener('change', pushHistory);

  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('resetBtn').addEventListener('click', () => {
    pushHistory();
    const fresh = createCoverState();
    Object.assign(state, fresh);
    syncControls();
    renderPreview();
  });

  $('uploadInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      if (photos.length >= MAX_PHOTOS) break;
      try {
        const { image, url } = await loadImageFile(file);
        addPhotoFromImage(image, file.name, url);
      } catch (err) {
        console.warn(err.message);
      }
    }
    e.target.value = '';
    renderPreview();
  });
  $('addPhotoBtn').addEventListener('click', () => $('uploadInput').click());

  $('exportSquareBtn').addEventListener('click', () => exportOne(EXPORT_SIZES[0]));
  $('exportPortraitBtn').addEventListener('click', () => exportOne(EXPORT_SIZES[1]));
  $('exportWideBtn').addEventListener('click', () => exportOne(EXPORT_SIZES[2]));
  $('exportAllBtn').addEventListener('click', exportAll);
}

/** Start the editor: fonts, sample photos, controls, first preview. */
async function startEditor() {
  buildPickers();
  bindControls();
  bindPreview();
  syncControls();
  updateUndoButtons();
  await ensureCoverFonts();
  await loadSamples();
  renderPreview();

  // Shot scenes (?shot=cover / ?shot=editor) take over after the editor is ready.
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    const shots = await import('./shots.js');
    await shots.runShot(shot, params, { state, photos, renderPreview, syncControls, pushHistory });
  }
  window.__coverApp = { state, photos, renderCover, renderCoverToCanvas, exportCoverPNG, exportOne, exportAll, renderPreview };
}

startEditor();
