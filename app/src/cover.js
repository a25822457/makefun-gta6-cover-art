// Neon Coast Cover Studio — cover render engine.
// Pure canvas 2D, no dependencies. Every cover is drawn by renderCover()
// onto a caller-supplied canvas at the exact export size, so the preview,
// the ?shot= scenes and the downloaded PNGs all come from one code path.

export const LAYOUTS = [
  { id: 'fullbleed', name: 'Full-bleed', panels: 1, hint: 'One photo, edge to edge' },
  { id: 'grid4', name: '4-panel grid', panels: 4, hint: 'Classic 2 × 2 poster grid' },
  { id: 'hero3', name: 'Hero + 3', panels: 4, hint: 'One big moment, three small ones' },
  { id: 'grid9', name: '9-panel grid', panels: 9, hint: 'A wall of moments, 3 × 3' },
  { id: 'tilted', name: 'Tilted snapshots', panels: 3, hint: 'Overlapping polaroids, askew' },
  { id: 'duo', name: 'Split duo', panels: 2, hint: 'Two halves, one story' },
];

export const GRADES = [
  { id: 'vice', name: 'Vice Sunset', top: '#ff8a2a', bottom: '#ff2e88', mode: 'overlay', strength: 0.55 },
  { id: 'neon', name: 'Neon Night', top: '#ff2ea6', bottom: '#00e5ff', mode: 'overlay', strength: 0.6 },
  { id: 'golden', name: 'Golden Hour', top: '#ffd76a', bottom: '#ff8c1a', mode: 'soft-light', strength: 0.75 },
  { id: 'dusk', name: 'Palm Dusk', top: '#7b2ff7', bottom: '#ff5e8a', mode: 'overlay', strength: 0.55 },
  { id: 'mono', name: 'Mono Noir', top: '#8a8a8a', bottom: '#222222', mode: 'soft-light', strength: 0.5 },
];

export const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: '1080 × 1350', width: 1080, height: 1350 },
  { id: 'wide', label: '1920 × 1080', width: 1920, height: 1080 },
];

export const MAX_PHOTOS = 4;

/** A fresh cover state: title, caption, badge, stars, layout, grade, effects and per-panel framing. */
export function createCoverState() {
  const panels = [];
  for (let i = 0; i < 9; i++) {
    // The first three panels feed the tilted polaroids, whose wide frames
    // crop portrait photos hardest: bias them to the top of the photo so
    // faces stay in frame, and keep the zoom gentle.
    const tiltedDefault = i < 3;
    panels.push({
      photo: i % 2,
      zoom: tiltedDefault ? 1.05 : 1.1 + (i % 3) * 0.12,
      panX: ((i * 37) % 100) / 100 - 0.5,
      panY: tiltedDefault ? 0.55 - (i % 3) * 0.08 : ((i * 53) % 100) / 100 - 0.5,
    });
  }
  return {
    layout: 'hero3',
    grade: 'vice',
    title: 'NEON COAST',
    subtitle: 'chasing the sunset',
    badge: 'EST. 2026',
    stars: 4,
    titleFill: 'sunset',
    grain: true,
    vignette: true,
    halftone: true,
    selectedPanel: 0,
    exportSize: 'portrait',
    panels,
  };
}

/** The layout definition for an id, falling back to the first layout. */
export function layoutOf(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

/** The grade definition for an id, falling back to the first grade. */
export function gradeOf(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

/** How many panels a layout shows. */
export function panelCount(layoutId) {
  return layoutOf(layoutId).panels;
}

/** Panel rectangles for a layout on a W × H canvas. Each rect is {x, y, w, h, rot, polaroid}. */
export function panelRects(layoutId, W, H) {
  const gap = Math.max(4, Math.round(W * 0.012));
  const rects = [];
  if (layoutId === 'fullbleed') {
    rects.push({ x: 0, y: 0, w: W, h: H, rot: 0, polaroid: false });
  } else if (layoutId === 'grid4') {
    const w = (W - gap) / 2;
    const h = (H - gap) / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        rects.push({ x: c * (w + gap), y: r * (h + gap), w, h, rot: 0, polaroid: false });
      }
    }
  } else if (layoutId === 'hero3') {
    const heroW = Math.round(W * 0.58);
    const sideW = W - heroW - gap;
    const sideH = (H - gap * 2) / 3;
    rects.push({ x: 0, y: 0, w: heroW, h: H, rot: 0, polaroid: false });
    for (let i = 0; i < 3; i++) {
      rects.push({ x: heroW + gap, y: i * (sideH + gap), w: sideW, h: sideH, rot: 0, polaroid: false });
    }
  } else if (layoutId === 'grid9') {
    const w = (W - gap * 2) / 3;
    const h = (H - gap * 2) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        rects.push({ x: c * (w + gap), y: r * (h + gap), w, h, rot: 0, polaroid: false });
      }
    }
  } else if (layoutId === 'duo') {
    const w = (W - gap) / 2;
    rects.push({ x: 0, y: 0, w, h: H, rot: 0, polaroid: false });
    rects.push({ x: w + gap, y: 0, w, h: H, rot: 0, polaroid: false });
  } else if (layoutId === 'tilted') {
    // Three polaroids stacked down the upper part of the canvas; the title
    // band lives at the bottom, so the last polaroid stops above it.
    const pw = W * 0.62;
    const ph = H * 0.24;
    const rots = [-6, 5, -3];
    const centers = [
      { x: W * 0.5, y: H * 0.17 },
      { x: W * 0.5, y: H * 0.4 },
      { x: W * 0.5, y: H * 0.6 },
    ];
    for (let i = 0; i < 3; i++) {
      rects.push({
        x: centers[i].x - pw / 2,
        y: centers[i].y - ph / 2,
        w: pw,
        h: ph,
        rot: rots[i],
        polaroid: true,
      });
    }
  }
  return rects;
}

/** Which photo a panel shows, and its framing, from the state and the loaded photos. */
export function panelPhoto(state, index, photos) {
  if (!photos || photos.length === 0) return null;
  const framing = state.panels[index] || { photo: 0, zoom: 1.1, panX: 0, panY: 0 };
  const photoIndex = Number.isInteger(framing.photo) && framing.photo >= 0 && framing.photo < photos.length
    ? framing.photo
    : index % photos.length;
  return { image: photos[photoIndex].image, framing };
}

/** Draw one photo cover-fit into a rect, honouring zoom and pan (both -1..1 clamped). */
export function drawPhotoCover(ctx, image, rect, framing) {
  if (!image || !image.naturalWidth) return;
  const zoom = Math.min(2.5, Math.max(1, framing.zoom || 1));
  const panX = Math.max(-1, Math.min(1, framing.panX || 0));
  const panY = Math.max(-1, Math.min(1, framing.panY || 0));
  const scale = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight) * zoom;
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panX * Math.max(0, (dw - rect.w) / 2);
  const dy = rect.y + (rect.h - dh) / 2 + panY * Math.max(0, (dh - rect.h) / 2);
  ctx.drawImage(image, dx, dy, dw, dh);
}

/** A small reusable noise tile for the grain effect. */
let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const size = 128;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  noiseTile = tile;
  return tile;
}

/** A halftone dot pattern tile, drawn behind the title band. */
let dotTile = null;
function getDotTile() {
  if (dotTile) return dotTile;
  const tile = document.createElement('canvas');
  tile.width = 14;
  tile.height = 14;
  const tctx = tile.getContext('2d');
  tctx.fillStyle = '#000000';
  tctx.beginPath();
  tctx.arc(7, 7, 2.6, 0, Math.PI * 2);
  tctx.fill();
  dotTile = tile;
  return tile;
}

/** Split a title into lines that fit maxWidth at the given font, up to two lines. */
function wrapTitle(ctx, title, maxWidth, fontFor) {
  const words = String(title || 'NEON COAST').toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['NEON COAST'];
  const oneLine = words.join(' ');
  ctx.font = fontFor(100);
  if (ctx.measureText(oneLine).width <= maxWidth) return [oneLine];
  // Greedy wrap into at most two lines, balancing the split.
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (!best || w < best.w) best = { lines: [a, b], w };
  }
  return best ? best.lines : [oneLine];
}

/** Draw a five-pointed star path centred at (cx, cy) with outer radius r. */
function starPath(ctx, cx, cy, r) {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Draw the whole cover onto `canvas` at W × H (the canvas is resized to match).
 * `state` is a cover state, `photos` an array of {image, name}.
 */
export function renderCover(canvas, state, photos, W, H) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = gradeOf(state.grade);
  const rects = panelRects(state.layout, W, H);
  const count = rects.length;

  // Backdrop: deep violet, so gaps and the tilted layout read as poster board.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#160a2e');
  bg.addColorStop(1, '#2b0f3d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Photos, panel by panel.
  const mono = grade.id === 'mono';
  rects.forEach((rect, i) => {
    const slot = panelPhoto(state, i, photos);
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
    }
    if (rect.polaroid) {
      // White polaroid frame with a caption strip at the bottom.
      const frame = Math.round(W * 0.016);
      const strip = Math.round(H * 0.045);
      ctx.fillStyle = '#fdf8f0';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.round(W * 0.02);
      ctx.shadowOffsetY = Math.round(W * 0.008);
      ctx.fillRect(-frame, -frame, rect.w + frame * 2, rect.h + frame * 2 + strip);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      const inner = { x: 0, y: 0, w: rect.w, h: rect.h };
      ctx.save();
      ctx.beginPath();
      ctx.rect(inner.x, inner.y, inner.w, inner.h);
      ctx.clip();
      if (mono) ctx.filter = 'grayscale(1) contrast(1.12)';
      if (slot) drawPhotoCover(ctx, slot.image, inner, slot.framing);
      ctx.restore();
      ctx.fillStyle = '#1c1030';
      ctx.font = `400 ${Math.round(H * 0.022)}px Pacifico, cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.subtitle || '', rect.w / 2, rect.h + strip / 2 + frame * 0.4);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      if (mono) ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.04)';
      if (slot) drawPhotoCover(ctx, slot.image, rect, slot.framing);
      ctx.restore();
      // Thin white keyline, the GTA poster grid look.
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(2, Math.round(W * 0.0025));
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  });

  // Colour grade: a sunset / neon wash over the photos, title drawn after it.
  if (!mono) {
    ctx.save();
    ctx.globalCompositeOperation = grade.mode;
    ctx.globalAlpha = grade.strength;
    const wash = ctx.createLinearGradient(0, 0, W * 0.25, H);
    wash.addColorStop(0, grade.top);
    wash.addColorStop(1, grade.bottom);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.35;
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, '#9db4ff');
    wash.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Selected-panel marker (editor only hint; harmless on export, drawn faintly).
  if (state.showSelection && count > 1) {
    const sel = rects[state.selectedPanel] || rects[0];
    ctx.save();
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(3, Math.round(W * 0.004));
    ctx.setLineDash([Math.round(W * 0.02), Math.round(W * 0.012)]);
    ctx.strokeRect(sel.x + 2, sel.y + 2, sel.w - 4, sel.h - 4);
    ctx.restore();
  }

  // ---- Title block -------------------------------------------------------
  const titleTop = state.layout === 'tilted' ? H * 0.84 : H * 0.78;
  const bandH = H - titleTop;
  // Scrim so white lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, titleTop - H * 0.06, 0, H);
  scrim.addColorStop(0, 'rgba(10,4,24,0)');
  scrim.addColorStop(0.35, 'rgba(10,4,24,0.55)');
  scrim.addColorStop(1, 'rgba(10,4,24,0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, titleTop - H * 0.06, W, H - titleTop + H * 0.06);

  if (state.halftone) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = ctx.createPattern(getDotTile(), 'repeat');
    ctx.fillRect(0, titleTop - H * 0.02, W, bandH + H * 0.02);
    ctx.restore();
  }

  const margin = W * 0.05;
  const maxTextW = W - margin * 2;
  const fontFor = (px) => `400 ${Math.round(px)}px Anton, 'Arial Narrow', sans-serif`;
  // Find the biggest size that fits (one or two lines).
  let size = Math.round(W * 0.17);
  let lines = [];
  while (size > Math.round(W * 0.05)) {
    ctx.font = fontFor(size);
    lines = wrapTitle(ctx, state.title, maxTextW, fontFor);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxTextW) break;
    size = Math.round(size * 0.92);
  }
  const lineH = size * 1.02;
  const blockH = lines.length * lineH;
  let ty = titleTop + (bandH - blockH) / 2 + size * 0.36;
  if (state.layout === 'tilted') ty = H * 0.875 + size * 0.1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  lines.forEach((line, li) => {
    const y = ty + li * lineH;
    ctx.font = fontFor(size);
    ctx.lineWidth = Math.max(4, Math.round(size * 0.09));
    ctx.strokeStyle = '#0d0518';
    ctx.strokeText(line, W / 2, y);
    if (state.titleFill === 'sunset') {
      const fill = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
      fill.addColorStop(0, '#ffe259');
      fill.addColorStop(0.45, '#ff7e3d');
      fill.addColorStop(1, '#ff2e88');
      ctx.fillStyle = fill;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillText(line, W / 2, y);
  });

  // Subtitle in neon handwriting, under the title (except tilted, where the
  // polaroids already carry it — there it sits above the title instead).
  if (state.subtitle && state.layout !== 'tilted') {
    const subSize = Math.round(W * 0.042);
    ctx.font = `400 ${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ff7ad9';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.round(W * 0.018);
    const subY = Math.min(H - H * 0.035, ty + lines.length * lineH - lineH * 0.5 + subSize * 1.15);
    ctx.fillText(state.subtitle, W / 2, subY);
    ctx.shadowBlur = 0;
  }

  // Badge ribbon, top-left, rotated a touch.
  if (state.badge) {
    const badgeSize = Math.round(W * 0.032);
    ctx.save();
    ctx.translate(W * 0.055, H * 0.045);
    ctx.rotate(-0.06);
    ctx.font = `400 ${badgeSize}px Anton, 'Arial Narrow', sans-serif`;
    const bw = ctx.measureText(state.badge.toUpperCase()).width + badgeSize * 1.6;
    const bh = badgeSize * 1.9;
    const ribbon = ctx.createLinearGradient(0, 0, bw, 0);
    ribbon.addColorStop(0, '#ff2e88');
    ribbon.addColorStop(1, '#ff8a2a');
    ctx.fillStyle = ribbon;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bw - bh * 0.5, 0);
    ctx.lineTo(bw, bh / 2);
    ctx.lineTo(bw - bh * 0.5, bh);
    ctx.lineTo(0, bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.badge.toUpperCase(), bw / 2 - bh * 0.12, bh / 2 + 1);
    ctx.restore();
  }

  // Heat stars, top-right.
  if (state.stars > 0) {
    const r = Math.round(W * 0.021);
    const gapStars = r * 2.5;
    const totalW = 5 * gapStars - gapStars * 0.5;
    const startX = W - W * 0.06 - totalW;
    const cy = H * 0.045;
    for (let i = 0; i < 5; i++) {
      const cx = startX + i * gapStars + r;
      starPath(ctx, cx, cy, r);
      ctx.fillStyle = i < state.stars ? '#ffd76a' : 'rgba(255,255,255,0.28)';
      ctx.fill();
      ctx.strokeStyle = '#0d0518';
      ctx.lineWidth = Math.max(2, Math.round(r * 0.12));
      ctx.stroke();
    }
  }

  // Vignette and grain finish the poster look.
  if (state.vignette) {
    const vig = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5,2,16,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    const tile = getNoiseTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  return canvas;
}

/** Render a cover at W × H and return the canvas. */
export function renderCoverToCanvas(state, photos, W, H) {
  const canvas = document.createElement('canvas');
  return renderCover(canvas, state, photos, W, H);
}

/** Render a cover at W × H and return a PNG blob (what the export buttons download). */
export function exportCoverPNG(state, photos, W, H) {
  const canvas = renderCoverToCanvas(state, photos, W, H);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob produced no PNG'));
    }, 'image/png');
  });
}

/** Load the bundled Anton + Pacifico faces so canvas text measures correctly. */
export async function ensureCoverFonts() {
  try {
    await Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load('400 60px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    // Canvas falls back to sans-serif; the cover still renders.
    console.warn('cover fonts did not load, using fallbacks', err);
  }
}
