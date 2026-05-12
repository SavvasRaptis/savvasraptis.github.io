// Professional 2D plot builder. Returns an <svg>.
// scale: { name, plane, unit, halfWidth, center, id? }
// ctx:   { selected, tracks, planets, planetTracks, moonTrack, showBS, showMP, showOrbits, showLabels, showL1L2, showMoon, showPlanets,
//          selectedScId, hoveredId, endDate }
// opts:  { width, height, fontScale, showLegend }

(function(){
const { AU_KM, RE_KM, L1_KM, L2_KM, MOON_KM, GROUPS } = window.SC_DATA;
const SVG_NS = 'http://www.w3.org/2000/svg';
const SUN_RADIUS_KM = 696_340;
// Visual (not physical) marker scales tuned for readability.
const SYSTEM_SUN_RADIUS_AU = 0.041;    // ~0.082 AU diameter in Sun-Earth view.
const SYSTEM_EARTH_RADIUS_AU = 0.012;  // small Earth marker in Sun-Earth view.

function niceTicks(min, max, maxCount = 10) {
  const range = max - min;
  if (range <= 0) return [min];
  const rough = range / Math.max(1, maxCount - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const candidates = [1, 2, 2.5, 5, 10].map(m => m * pow);
  const step = candidates.find(c => range / c <= maxCount) || candidates[candidates.length - 1];
  const first = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = first; v <= max + step * 1e-6; v += step) {
    ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return ticks;
}

function fmtTick(v, step) {
  if (v === 0) return '0';
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return v.toFixed(decimals);
}

function el(tag, attrs = {}, text) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

function addSvgTitle(node, text) {
  if (!node || !text) return node;
  node.appendChild(el('title', {}, text));
  return node;
}

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function plotTheme() {
  const dark = document.documentElement.getAttribute('data-scviewer-theme') === 'dark';
  return {
    dark,
    paper: cssVar('--paper', dark ? '#151c2a' : '#ffffff'),
    plotBg: cssVar('--plot-bg', dark ? '#111827' : '#ffffff'),
    ink: cssVar('--ink', dark ? '#f4f7fb' : 'oklch(0.14 0.01 260)'),
    ink2: cssVar('--ink-2', dark ? '#d7deea' : 'oklch(0.26 0.01 260)'),
    ink3: cssVar('--ink-3', dark ? '#9aa8bc' : 'oklch(0.40 0.01 260)'),
    rule: cssVar('--rule', dark ? '#273246' : 'oklch(0.88 0.005 260)'),
    grid: dark ? '#263348' : 'oklch(0.92 0.004 260)',
    zero: dark ? '#526178' : 'oklch(0.65 0.01 260)',
    axis: dark ? '#7d8ba0' : 'oklch(0.28 0.01 260)',
    halo: dark ? '#111827' : '#ffffff',
    legendBg: dark ? 'rgba(21,28,42,0.92)' : 'rgba(255,255,255,0.87)',
  };
}

// Draw a spacecraft symbol at (cx, cy) with size `s`. Returns the element.
function drawSymbol(symbol, cx, cy, s, attrs) {
  const a = { fill: attrs.fill, stroke: attrs.stroke || '#fff', 'stroke-width': attrs.strokeWidth ?? 1.5, ...(attrs.dataAttrs || {}) };
  switch (symbol) {
    case 'square':
      return el('rect', { x: cx - s, y: cy - s, width: 2*s, height: 2*s, ...a });
    case 'triangle': {
      const h = s * 1.15;
      return el('polygon', { points: `${cx},${cy-h} ${cx-s},${cy+h*0.7} ${cx+s},${cy+h*0.7}`, ...a });
    }
    case 'triangleDown': {
      const h = s * 1.15;
      return el('polygon', { points: `${cx},${cy+h} ${cx-s},${cy-h*0.7} ${cx+s},${cy-h*0.7}`, ...a });
    }
    case 'diamond':
      return el('polygon', { points: `${cx},${cy-s*1.15} ${cx+s*1.05},${cy} ${cx},${cy+s*1.15} ${cx-s*1.05},${cy}`, ...a });
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI/2 + i * Math.PI / 5;
        const r = (i % 2 === 0) ? s * 1.25 : s * 0.55;
        pts.push(`${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`);
      }
      return el('polygon', { points: pts.join(' '), ...a });
    }
    case 'cross': {
      // rotated plus (X)
      const g = el('g', { ...a });
      const h = s * 1.1;
      g.appendChild(el('line', { x1: cx-h, y1: cy-h, x2: cx+h, y2: cy+h, stroke: attrs.fill, 'stroke-width': s*0.9, 'stroke-linecap': 'round' }));
      g.appendChild(el('line', { x1: cx-h, y1: cy+h, x2: cx+h, y2: cy-h, stroke: attrs.fill, 'stroke-width': s*0.9, 'stroke-linecap': 'round' }));
      return g;
    }
    case 'pentagon': {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI/2 + i * 2 * Math.PI / 5;
        pts.push(`${cx + s*1.1 * Math.cos(ang)},${cy + s*1.1 * Math.sin(ang)}`);
      }
      return el('polygon', { points: pts.join(' '), ...a });
    }
    case 'circle':
    default:
      return el('circle', { cx, cy, r: s, ...a });
  }
}

function buildPlot(scale, ctx, opts = {}) {
  const fs = opts.fontScale ?? 1;
  const showLegend = opts.showLegend ?? false;
  const theme = plotTheme();
  // If legend on, reserve right column
  const W_total = opts.width ?? 620;
  const H = opts.height ?? 620;
  const legendW = showLegend ? Math.max(180, Math.min(260, Math.round(W_total * 0.22))) : 0;
  const W = W_total - legendW;

  const tickSize = 15 * fs;
  const axisLabelSize = 18 * fs;
  const titleSize = 18 * fs;
  const planeSize = 13 * fs;
  const badgeSize = 15 * fs;
  const bodyLabelSize = 14 * fs;
  const refLabelSize = 15 * fs;
  const legendTextSize = 13 * fs;

  const PAD_L = 84 * fs, PAD_R = 28, PAD_T = 62 * fs, PAD_B = 74 * fs;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const svg = el('svg', {
    xmlns: SVG_NS,
    viewBox: `0 0 ${W_total} ${H}`,
    width: W_total, height: H,
    'font-family': "'Inter Tight', system-ui, sans-serif",
  });

  svg.appendChild(el('rect', { x: 0, y: 0, width: W_total, height: H, fill: theme.paper }));

  const unitKm = scale.unit === 'AU' ? AU_KM : RE_KM;
  const halfKm = scale.halfWidth * unitKm;
  const unitLabel = scale.unit === 'AU' ? 'AU' : 'Re';

  const cxU = scale.center.x / unitKm;
  const cyU = (scale.plane === 'xy' ? scale.center.y : scale.center.z) / unitKm;
  const xMinU = cxU - scale.halfWidth, xMaxU = cxU + scale.halfWidth;
  const yMinU = cyU - scale.halfWidth, yMaxU = cyU + scale.halfWidth;

  const pxPerKmX = plotW / (2 * halfKm);
  const pxPerKmY = plotH / (2 * halfKm);

  function worldToScreen(p) {
    const wx = p.x - scale.center.x;
    const wy = (scale.plane === 'xy' ? p.y : p.z) - (scale.plane === 'xy' ? scale.center.y : scale.center.z);
    return [PAD_L + plotW / 2 + wx * pxPerKmX, PAD_T + plotH / 2 - wy * pxPerKmY];
  }

  // --- Defs
  const defs = el('defs');
  const clipId = `c${Math.random().toString(36).slice(2, 8)}`;
  const clip = el('clipPath', { id: clipId });
  clip.appendChild(el('rect', { x: PAD_L, y: PAD_T, width: plotW, height: plotH }));
  defs.appendChild(clip);

  const hatchId = `h${clipId}`;
  const pat = el('pattern', { id: hatchId, patternUnits: 'userSpaceOnUse', width: 6, height: 6, patternTransform: 'rotate(45)' });
  pat.appendChild(el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'oklch(0.55 0.14 255 / 0.22)', 'stroke-width': 1 }));
  defs.appendChild(pat);

  const sunGradId = `sg${clipId}`;
  const sg = el('radialGradient', { id: sunGradId });
  sg.appendChild(el('stop', { offset: '0%',  'stop-color': 'oklch(0.96 0.10 90)' }));
  sg.appendChild(el('stop', { offset: '55%', 'stop-color': 'oklch(0.84 0.17 78)' }));
  sg.appendChild(el('stop', { offset: '100%','stop-color': 'oklch(0.66 0.18 52)' }));
  defs.appendChild(sg);

  const earthGradId = `eg${clipId}`;
  const eg = el('radialGradient', { id: earthGradId, cx: '32%', cy: '30%' });
  eg.appendChild(el('stop', { offset: '0%',  'stop-color': 'oklch(0.78 0.14 230)' }));
  eg.appendChild(el('stop', { offset: '55%', 'stop-color': 'oklch(0.55 0.17 245)' }));
  eg.appendChild(el('stop', { offset: '100%','stop-color': 'oklch(0.34 0.16 250)' }));
  defs.appendChild(eg);

  svg.appendChild(defs);

  // --- Plot frame
  svg.appendChild(el('rect', {
    x: PAD_L, y: PAD_T, width: plotW, height: plotH,
    fill: theme.plotBg,
    stroke: theme.axis, 'stroke-width': 1.3,
  }));

  // --- Ticks
  const xStep = niceTicks(xMinU, xMaxU, 8);
  const yStep = niceTicks(yMinU, yMaxU, 8);
  const stepXVal = xStep.length > 1 ? xStep[1] - xStep[0] : 1;
  const stepYVal = yStep.length > 1 ? yStep[1] - yStep[0] : 1;

  const gridG = el('g', { stroke: theme.grid, 'stroke-width': 0.7 });
  for (const tx of xStep) {
    if (tx <= xMinU || tx >= xMaxU) continue;
    const px = PAD_L + ((tx - xMinU) / (xMaxU - xMinU)) * plotW;
    gridG.appendChild(el('line', { x1: px, y1: PAD_T, x2: px, y2: PAD_T + plotH }));
  }
  for (const ty of yStep) {
    if (ty <= yMinU || ty >= yMaxU) continue;
    const py = PAD_T + plotH - ((ty - yMinU) / (yMaxU - yMinU)) * plotH;
    gridG.appendChild(el('line', { x1: PAD_L, y1: py, x2: PAD_L + plotW, y2: py }));
  }
  svg.appendChild(gridG);

  const zeroG = el('g', { stroke: theme.zero, 'stroke-width': 1.2, 'stroke-dasharray': '5 5' });
  if (xMinU <= 0 && xMaxU >= 0) {
    const zx = PAD_L + ((0 - xMinU) / (xMaxU - xMinU)) * plotW;
    zeroG.appendChild(el('line', { x1: zx, y1: PAD_T, x2: zx, y2: PAD_T + plotH }));
  }
  if (yMinU <= 0 && yMaxU >= 0) {
    const zy = PAD_T + plotH - ((0 - yMinU) / (yMaxU - yMinU)) * plotH;
    zeroG.appendChild(el('line', { x1: PAD_L, y1: zy, x2: PAD_L + plotW, y2: zy }));
  }
  svg.appendChild(zeroG);

  const tickG = el('g', {
    'font-family': "'JetBrains Mono', ui-monospace, monospace",
    'font-size': tickSize,
    'font-weight': 500,
    fill: theme.ink2,
  });
  for (const tx of xStep) {
    if (tx < xMinU - 1e-9 || tx > xMaxU + 1e-9) continue;
    const px = PAD_L + ((tx - xMinU) / (xMaxU - xMinU)) * plotW;
    tickG.appendChild(el('line', { x1: px, y1: PAD_T + plotH, x2: px, y2: PAD_T + plotH + 7, stroke: theme.axis, 'stroke-width': 1.3 }));
    tickG.appendChild(el('text', { x: px, y: PAD_T + plotH + tickSize + 10, 'text-anchor': 'middle' }, fmtTick(tx, stepXVal)));
  }
  for (const ty of yStep) {
    if (ty < yMinU - 1e-9 || ty > yMaxU + 1e-9) continue;
    const py = PAD_T + plotH - ((ty - yMinU) / (yMaxU - yMinU)) * plotH;
    tickG.appendChild(el('line', { x1: PAD_L - 7, y1: py, x2: PAD_L, y2: py, stroke: theme.axis, 'stroke-width': 1.3 }));
    tickG.appendChild(el('text', { x: PAD_L - 11, y: py + tickSize * 0.36, 'text-anchor': 'end' }, fmtTick(ty, stepYVal)));
  }
  svg.appendChild(tickG);

  // axis labels (spelled out clearly — NO superscript exponent glyphs)
  const frameLabel = (ctx.frame || 'GSE').toUpperCase();
  const axG = el('g', { fill: theme.ink, 'font-size': axisLabelSize, 'font-weight': 700 });
  axG.appendChild(el('text', { x: PAD_L + plotW / 2, y: H - 22, 'text-anchor': 'middle' },
    `X ${frameLabel} (${unitLabel})`));
  axG.appendChild(el('text', {
    transform: `translate(${24 * fs} ${PAD_T + plotH / 2}) rotate(-90)`,
    'text-anchor': 'middle',
  }, `${scale.plane === 'xy' ? 'Y' : 'Z'} ${frameLabel} (${unitLabel})`));
  svg.appendChild(axG);

  // --- Clipped content
  const content = el('g', { 'clip-path': `url(#${clipId})` });
  svg.appendChild(content);

  const isSystem = scale.id === 'system';
  const isNearEarth = scale.unit === 'Re';

  // Always show Earth's ecliptic orbit ring on the Sun-Earth system XY subplot.
  if (isSystem && scale.plane === 'xy') {
    const [scX, scY] = worldToScreen({ x: AU_KM, y: 0, z: 0 });
    const r = AU_KM * pxPerKmX;
    content.appendChild(el('circle', {
      cx: scX, cy: scY, r, fill: 'none',
      stroke: 'oklch(0.55 0.17 245 / 0.45)',
      'stroke-width': 1.2, 'stroke-dasharray': '6 5',
    }));
  }

  // Moon marker/orbit overlay from real static/API ephemeris data.
  const earthRadiusPx = RE_KM * pxPerKmX;
  const showMoonTrack = scale.id === 'moonmag' && ctx.showMoon && Array.isArray(ctx.moonTrack) && ctx.moonTrack.length > 0;
  if (showMoonTrack) {
    const moonColor = 'oklch(0.52 0.02 260)';
    if (ctx.moonTrack.length > 1) {
      const d = ctx.moonTrack
        .map((p, i) => {
          const [x, y] = worldToScreen(p);
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
      content.appendChild(el('path', {
        d,
        fill: 'none',
        stroke: 'oklch(0.52 0.02 260 / 0.75)',
        'stroke-width': 1.5,
        'stroke-dasharray': '5 4',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }));
    }
    const moon = ctx.moonTrack[ctx.moonTrack.length - 1];
    const [mx, my] = worldToScreen(moon);
    const visible = mx > PAD_L - 20 && mx < PAD_L + plotW + 20 && my > PAD_T - 20 && my < PAD_T + plotH + 20;
    if (visible) {
      const gMoon = el('g', { class: 'moon-dot', 'data-hover-id': 'body:MOON' });
      addSvgTitle(gMoon, 'Moon');
      gMoon.appendChild(el('circle', {
        cx: mx,
        cy: my,
        r: 5.5 * fs,
        fill: theme.paper,
        stroke: moonColor,
        'stroke-width': 2,
      }));
      gMoon.appendChild(el('circle', { cx: mx - 1.5 * fs, cy: my - 1.5 * fs, r: 1.4 * fs, fill: moonColor, opacity: 0.65 }));
      content.appendChild(gMoon);
      content.appendChild(el('text', {
        x: mx + 9 * fs,
        y: my - 7 * fs,
        'font-size': bodyLabelSize * 0.92,
        'font-weight': 700,
        fill: theme.ink,
        'paint-order': 'stroke',
        stroke: theme.halo,
        'stroke-width': 3.5,
        'stroke-linejoin': 'round',
      }, 'Moon'));
    }
  }

  // --- BS / MP
  if (isNearEarth && scale.halfWidth * unitKm < 0.01 * AU_KM) {
    const drawCurve = (pts, { fill, stroke, dashed }) => {
      if (!pts || !pts.length) return;
      const mapPts = (sign) => pts.map(p => worldToScreen({
        x: p.x * RE_KM,
        y: sign * p.rho * RE_KM,
        z: sign * p.rho * RE_KM,
      }));
      const top = mapPts(1), bot = mapPts(-1);
      if (fill) {
        const closed = [...top, ...bot.reverse()];
        const d = closed.map(([x, y], i) => (i === 0 ? 'M' : 'L') + ` ${x} ${y}`).join(' ') + ' Z';
        content.appendChild(el('path', { d, fill, stroke: 'none' }));
      }
      for (const side of [top, bot]) {
        const d = side.map(([x, y], i) => (i === 0 ? 'M' : 'L') + ` ${x} ${y}`).join(' ');
        const p = el('path', { d, fill: 'none', stroke, 'stroke-width': 1.6 });
        if (dashed) p.setAttribute('stroke-dasharray', '6 4');
        content.appendChild(p);
      }
    };
    if (ctx.showBS) drawCurve(window.SC_MODELS.bowshock(),     { fill: `url(#${hatchId})`, stroke: 'oklch(0.50 0.14 255 / 0.85)', dashed: true });
    if (ctx.showMP) drawCurve(window.SC_MODELS.magnetopause(), { fill: null,              stroke: 'oklch(0.35 0.12 255)',       dashed: false });
  }

  // --- Sun
  const [sunX, sunY] = worldToScreen({ x: AU_KM, y: 0, z: 0 });
  const sunRadiusPx = SUN_RADIUS_KM * pxPerKmX;
  const sunVisualPx = isSystem ? SYSTEM_SUN_RADIUS_AU * AU_KM * pxPerKmX : sunRadiusPx;
  const sunVisible = sunX > PAD_L - 60 && sunX < PAD_L + plotW + 60 &&
                     sunY > PAD_T - 60 && sunY < PAD_T + plotH + 60;
  if (sunVisible) {
    const iconR = 7.0 * fs;
    const rDraw = Math.max(sunVisualPx, iconR);
    if (rDraw > 6) {
      content.appendChild(el('circle', { cx: sunX, cy: sunY, r: rDraw * 1.55, fill: 'oklch(0.94 0.12 80 / 0.22)' }));
      content.appendChild(el('circle', { cx: sunX, cy: sunY, r: rDraw * 1.18, fill: 'oklch(0.92 0.14 78 / 0.28)' }));
    }
    content.appendChild(el('circle', { cx: sunX, cy: sunY, r: rDraw, fill: `url(#${sunGradId})`, stroke: 'oklch(0.52 0.17 50)', 'stroke-width': 1.3 }));
    content.appendChild(el('text', {
      x: sunX, y: sunY + rDraw + refLabelSize + 4,
      'text-anchor': 'middle',
      'font-size': refLabelSize, 'font-weight': 800, fill: 'oklch(0.38 0.15 58)',
      'paint-order': 'stroke', stroke: theme.halo, 'stroke-width': 4, 'stroke-linejoin': 'round',
    }, 'Sun'));
  }

  // --- Earth
  const [eX, eY] = worldToScreen({ x: 0, y: 0, z: 0 });
  const earthVisible = eX > PAD_L - 60 && eX < PAD_L + plotW + 60 &&
                       eY > PAD_T - 60 && eY < PAD_T + plotH + 60;
  if (earthVisible) {
    const earthVisualPx = isSystem
      ? SYSTEM_EARTH_RADIUS_AU * AU_KM * pxPerKmX
      : (scale.id === 'moonmag' ? earthRadiusPx * 1.45 : earthRadiusPx * 1.2);
    const iconR = isSystem ? 2.8 * fs : 2.5 * fs;
    const rDraw = Math.max(earthVisualPx, iconR);
    content.appendChild(el('circle', { cx: eX, cy: eY, r: rDraw, fill: `url(#${earthGradId})`, stroke: 'oklch(0.22 0.15 250)', 'stroke-width': 1.3 }));
    content.appendChild(el('text', {
      x: eX, y: eY + rDraw + refLabelSize + 4,
      'text-anchor': 'middle',
      'font-size': refLabelSize, 'font-weight': 800, fill: 'oklch(0.28 0.16 250)',
      'paint-order': 'stroke', stroke: theme.halo, 'stroke-width': 4, 'stroke-linejoin': 'round',
    }, 'Earth'));
  }

  // --- L1 / L2
  if (ctx.showL1L2 && !isSystem) {
    for (const [label, xKm] of [['L1', L1_KM], ['L2', L2_KM]]) {
      const [lx, ly] = worldToScreen({ x: xKm, y: 0, z: 0 });
      if (lx < PAD_L - 30 || lx > PAD_L + plotW + 30 || ly < PAD_T - 30 || ly > PAD_T + plotH + 30) continue;
      const s = 8 * fs;
      content.appendChild(el('path', {
        d: `M ${lx - s} ${ly} L ${lx} ${ly - s} L ${lx + s} ${ly} L ${lx} ${ly + s} Z`,
        fill: theme.paper, stroke: theme.ink, 'stroke-width': 1.6,
      }));
      content.appendChild(el('text', {
        x: lx, y: ly - s - 5,
        'text-anchor': 'middle',
        'font-family': "'JetBrains Mono', ui-monospace, monospace",
        'font-size': refLabelSize * 0.9, 'font-weight': 700, fill: theme.ink,
        'paint-order': 'stroke', stroke: theme.halo, 'stroke-width': 3.5, 'stroke-linejoin': 'round',
      }, label));
    }
  }

  // --- Planet markers (marker-only overlay)
  if (ctx.showPlanets && Array.isArray(ctx.planets)) {
    for (const planet of ctx.planets) {
      const track = ctx.planetTracks?.[planet.id];
      if (!Array.isArray(track) || track.length === 0) continue;
      const color = planet.color || '#888';
      if (track.length > 1) {
        for (let i = 1; i < track.length; i++) {
          const [ax, ay] = worldToScreen(track[i - 1]);
          const [bx, by] = worldToScreen(track[i]);
          if (!isFinite(ax) || !isFinite(ay) || !isFinite(bx) || !isFinite(by)) continue;
          content.appendChild(el('line', {
            x1: ax,
            y1: ay,
            x2: bx,
            y2: by,
            stroke: color,
            'stroke-width': 1.2 * fs,
            'stroke-opacity': 0.5,
            'stroke-linecap': 'round',
          }));
        }
      }
      const last = track[track.length - 1];
      const [px, py] = worldToScreen(last);
      const visible = px > PAD_L - 20 && px < PAD_L + plotW + 20 && py > PAD_T - 20 && py < PAD_T + plotH + 20;
      if (!visible) continue;
      const glyph = drawSymbol('diamond', px, py, 7.2 * fs, {
        fill: theme.paper,
        stroke: color,
        strokeWidth: 2.2,
      });
      const markerGroup = el('g', {
        class: 'planet-dot',
        'data-hover-id': `planet:${planet.id}`,
      });
      addSvgTitle(markerGroup, planet.name);
      markerGroup.appendChild(glyph);
      markerGroup.appendChild(el('circle', { cx: px, cy: py, r: 2.5 * fs, fill: color, stroke: theme.paper, 'stroke-width': 1.0 }));
      content.appendChild(markerGroup);
      content.appendChild(el('text', {
        x: px + 9 * fs,
        y: py - 7 * fs,
        'font-size': bodyLabelSize * 0.92,
        'font-weight': 700,
        fill: theme.ink,
        'paint-order': 'stroke',
        stroke: theme.halo,
        'stroke-width': 3.5,
        'stroke-linejoin': 'round',
      }, planet.name));
    }
  }

  // --- Spacecraft
  const hideOnSystem = new Set(['magnetospheric', 'inner_magnetosphere', 'solar_l1']);
  const ordered = [...ctx.selected].sort((a, b) => {
    if (a.id === ctx.selectedScId) return 1;
    if (b.id === ctx.selectedScId) return -1;
    return 0;
  });

  const renderedLegend = []; // { sc, color }

  for (const sc of ordered) {
    if (isSystem && hideOnSystem.has(sc.group)) continue;
    if (scale.id === 'l1' && sc.group === 'inner_magnetosphere') continue;

    const track = ctx.tracks.get(sc.id);
    if (!track || track.length === 0) continue;
    const hue = sc.hue ?? GROUPS[sc.group].hue;
    const color = `hsl(${Math.round(hue)},70%,45%)`;
    const isSelected = sc.id === ctx.selectedScId;
    const isHovered = sc.id === ctx.hoveredId;

    if (track.length > 1) {
      for (let i = 1; i < track.length; i++) {
        const [ax, ay] = worldToScreen(track[i - 1]);
        const [bx, by] = worldToScreen(track[i]);
        if (!isFinite(ax) || !isFinite(bx)) continue;
        content.appendChild(el('line', {
          x1: ax, y1: ay, x2: bx, y2: by,
          stroke: color,
          'stroke-width': isSelected ? 2.4 * fs : 1.4 * fs,
          'stroke-opacity': (isSelected ? 0.4 : 0.18) + (isSelected ? 0.55 : 0.55) * (i / track.length),
          'stroke-linecap': 'round',
        }));
      }
    }

    const last = track[track.length - 1];
    const [lx, ly] = worldToScreen(last);
    const visible = lx > PAD_L - 40 && lx < PAD_L + plotW + 40 && ly > PAD_T - 40 && ly < PAD_T + plotH + 40;

    if (!visible) continue;

    // Only sc actually rendered inside this subplot show up in the legend.
    renderedLegend.push({ sc, color });

    const baseS = (isSelected ? 7.5 : (isHovered ? 7 : 5.8)) * fs;
    if (isSelected) {
      content.appendChild(el('circle', { cx: lx, cy: ly, r: baseS * 2.4, fill: color, 'fill-opacity': 0.18 }));
      content.appendChild(el('circle', { cx: lx, cy: ly, r: baseS * 1.55, fill: 'none', stroke: color, 'stroke-width': 2 }));
    }
    const sym = drawSymbol(sc.symbol || 'circle', lx, ly, baseS, {
      fill: color,
      stroke: theme.paper,
      strokeWidth: 1.6 * fs,
      dataAttrs: { 'data-sc': sc.id, 'data-hover-id': sc.id, class: 'sc-dot' },
    });
    // ensure the `class` attr applies even on <g> cross
    sym.classList.add('sc-dot');
    sym.setAttribute('data-sc', sc.id);
    sym.setAttribute('data-hover-id', sc.id);
    addSvgTitle(sym, sc.name);
    content.appendChild(sym);

    if (ctx.showLabels || isHovered) {
      content.appendChild(el('text', {
        x: lx + 11 * fs, y: ly - 8 * fs,
        'font-size': isSelected ? bodyLabelSize + 1 : bodyLabelSize,
        'font-weight': isSelected ? 700 : 600,
        fill: theme.ink,
        'paint-order': 'stroke',
        stroke: theme.halo, 'stroke-width': 4, 'stroke-linejoin': 'round',
      }, sc.name));
    }
  }

  // --- Title bar
  svg.appendChild(el('text', {
    x: PAD_L, y: titleSize + 12,
    'font-size': titleSize, 'font-weight': 800, fill: theme.ink,
    'letter-spacing': '-0.01em',
  }, scale.name));

  svg.appendChild(el('text', {
    x: PAD_L, y: titleSize + planeSize + 18,
    'font-family': "'JetBrains Mono', ui-monospace, monospace",
    'font-size': planeSize, 'font-weight': 700,
    'letter-spacing': '0.12em', fill: theme.ink3,
  }, `${scale.plane.toUpperCase()} PLANE`));

  svg.appendChild(el('text', {
    x: W - PAD_R, y: titleSize + 12,
    'font-family': "'JetBrains Mono', ui-monospace, monospace",
    'font-size': badgeSize, 'font-weight': 700, 'text-anchor': 'end', fill: theme.ink2,
  }, `± ${scale.halfWidth} ${unitLabel}`));

  // Date range annotation (same mono styling family as subplot meta labels).
  if (ctx.startDate && ctx.endDate) {
    const fmtDate = (iso) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    };
    const startLabel = fmtDate(ctx.startDate);
    const endLabel = fmtDate(ctx.endDate);
    if (startLabel && endLabel) {
      svg.appendChild(el('text', {
        x: W - PAD_R, y: titleSize + planeSize + 18,
        'font-family': "'JetBrains Mono', ui-monospace, monospace",
        'font-size': planeSize * 0.92, 'font-weight': 700, 'text-anchor': 'end',
        'letter-spacing': '0.03em', fill: theme.ink3,
      }, `${startLabel} → ${endLabel} UTC`));
    }
  }

  // Scale bar
  {
    const barLen = plotW * 0.18;
    const barVal = (barLen / pxPerKmX) / unitKm;
    const niceBarVal = (() => {
      const p = Math.pow(10, Math.floor(Math.log10(barVal)));
      for (const m of [1, 2, 5, 10]) if (m * p >= barVal * 0.7) return m * p;
      return barVal;
    })();
    const niceBarLen = niceBarVal * unitKm * pxPerKmX;
    const bx = PAD_L + 14, by = PAD_T + plotH - 16;
    const bg = el('g');
    bg.appendChild(el('line', { x1: bx, y1: by, x2: bx + niceBarLen, y2: by, stroke: theme.ink, 'stroke-width': 2.6 }));
    bg.appendChild(el('line', { x1: bx, y1: by - 4, x2: bx, y2: by + 4, stroke: theme.ink, 'stroke-width': 2.6 }));
    bg.appendChild(el('line', { x1: bx + niceBarLen, y1: by - 4, x2: bx + niceBarLen, y2: by + 4, stroke: theme.ink, 'stroke-width': 2.6 }));
    bg.appendChild(el('text', {
      x: bx + niceBarLen / 2, y: by - 9,
      'text-anchor': 'middle',
      'font-family': "'JetBrains Mono', ui-monospace, monospace",
      'font-size': tickSize, 'font-weight': 700, fill: theme.ink,
      'paint-order': 'stroke', stroke: theme.halo, 'stroke-width': 3.5, 'stroke-linejoin': 'round',
    }, `${niceBarVal < 1 ? niceBarVal.toFixed(2) : niceBarVal} ${unitLabel}`));
    svg.appendChild(bg);
  }

  // --- Legend (optional)
  if (showLegend && renderedLegend.length) {
    const lx0 = W + 10;
    const rowH = Math.max(22, legendTextSize + 10);
    // Background panel
    svg.appendChild(el('rect', {
      x: W + 4, y: PAD_T,
      width: legendW - 10,
      height: plotH,
      fill: theme.paper,
      stroke: theme.rule,
      'stroke-width': 1,
      rx: 4,
    }));
    svg.appendChild(el('text', {
      x: lx0 + 6, y: PAD_T + legendTextSize + 4,
      'font-size': legendTextSize * 0.85, 'font-weight': 700,
      'letter-spacing': '0.08em', fill: theme.ink3,
    }, 'SPACECRAFT'));
    // Items
    const maxRows = Math.floor((plotH - legendTextSize * 2 - 16) / rowH);
    const shown = renderedLegend.slice(0, maxRows);
    const startY = PAD_T + legendTextSize * 2 + 8;
    shown.forEach((r, i) => {
      const y = startY + i * rowH;
      const sym = drawSymbol(r.sc.symbol || 'circle', lx0 + 18, y, 6.5 * fs, {
        fill: r.color, stroke: theme.paper, strokeWidth: 1.4,
      });
      svg.appendChild(sym);
      svg.appendChild(el('text', {
        x: lx0 + 36, y: y + legendTextSize * 0.36,
        'font-size': legendTextSize, 'font-weight': 600, fill: theme.ink,
      }, r.sc.name));
    });
    if (renderedLegend.length > shown.length) {
      svg.appendChild(el('text', {
        x: lx0 + 6, y: startY + shown.length * rowH + legendTextSize,
        'font-size': legendTextSize * 0.85, 'font-style': 'italic', fill: theme.ink3,
      }, `+${renderedLegend.length - shown.length} more…`));
    }
  }

  return svg;
}

function build3DTraces(scale, ctx) {
  const unitKm = scale.unit === 'AU' ? AU_KM : RE_KM;
  const traces = [];

  for (const sc of ctx.selected || []) {
    const track = ctx.tracks?.get(sc.id);
    if (!Array.isArray(track) || track.length === 0) continue;
    const hue = sc.hue ?? GROUPS[sc.group].hue;
    const color = `hsl(${Math.round(hue)},70%,45%)`;
    traces.push({
      type: 'scatter3d',
      mode: 'lines+markers',
      name: sc.name,
      x: track.map((p) => (p.x - scale.center.x) / unitKm),
      y: track.map((p) => (p.y - scale.center.y) / unitKm),
      z: track.map((p) => (p.z - scale.center.z) / unitKm),
      line: { color, width: sc.id === ctx.selectedScId ? 5 : 2 },
      marker: { color, size: sc.id === ctx.selectedScId ? 4 : 2 },
    });
  }

  if (ctx.showPlanets && Array.isArray(ctx.planets)) {
    for (const planet of ctx.planets) {
      const track = ctx.planetTracks?.[planet.id];
      if (!Array.isArray(track) || track.length === 0) continue;
      const p = track[track.length - 1];
      const xs = track.map((pt) => (pt.x - scale.center.x) / unitKm);
      const ys = track.map((pt) => (pt.y - scale.center.y) / unitKm);
      const zs = track.map((pt) => (pt.z - scale.center.z) / unitKm);
      if (track.length > 1) {
        traces.push({
          type: 'scatter3d',
          mode: 'lines',
          name: `${planet.name} trail`,
          showlegend: false,
          hoverinfo: 'skip',
          x: xs,
          y: ys,
          z: zs,
          line: { color: planet.color || '#777', width: 2 },
          opacity: 0.55,
        });
      }
      traces.push({
        type: 'scatter3d',
        mode: 'markers+text',
        name: planet.name,
        x: [xs[xs.length - 1]],
        y: [ys[ys.length - 1]],
        z: [zs[zs.length - 1]],
        marker: {
          size: 7,
          color: planet.color || '#777',
          symbol: 'diamond',
          line: { color: '#ffffff', width: 1.2 },
        },
        text: [planet.name],
        textposition: 'top center',
      });
    }
  }

  traces.push({
    type: 'scatter3d',
    mode: 'markers+text',
    name: 'Earth',
    x: [(-scale.center.x) / unitKm],
    y: [(-scale.center.y) / unitKm],
    z: [(-scale.center.z) / unitKm],
    marker: { size: 8, color: '#2b62cc' },
    text: ['Earth'],
    textposition: 'bottom center',
  });

  return { traces, unitKm };
}

function build3DFallbackCanvas(host, scale, ctx) {
  const theme = plotTheme();
  host.innerHTML = '';
  const canvas = document.createElement('canvas');
  const rect = host.getBoundingClientRect();
  const w = Math.max(500, Math.floor(rect.width || host.clientWidth || 900));
  const h = Math.max(360, Math.floor(rect.height || host.clientHeight || 560));
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';
  canvas.style.background = theme.plotBg;
  host.appendChild(canvas);
  const g = canvas.getContext('2d');
  if (!g) return () => {};
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const unitKm = scale.unit === 'AU' ? AU_KM : RE_KM;
  const half = scale.halfWidth;
  const series = [];
  for (const sc of ctx.selected || []) {
    const track = ctx.tracks?.get(sc.id);
    if (!Array.isArray(track) || track.length === 0) continue;
    const hue = sc.hue ?? GROUPS[sc.group].hue;
    const color = `hsl(${Math.round(hue)},70%,45%)`;
    series.push({
      id: sc.id,
      name: sc.name,
      color,
      selected: sc.id === ctx.selectedScId,
      points: track.map((p) => ({
        x: (p.x - scale.center.x) / unitKm,
        y: (p.y - scale.center.y) / unitKm,
        z: (p.z - scale.center.z) / unitKm,
      })),
    });
  }

  const planets = [];
  if (ctx.showPlanets && Array.isArray(ctx.planets)) {
    for (const planet of ctx.planets) {
      const track = ctx.planetTracks?.[planet.id];
      if (!Array.isArray(track) || track.length === 0) continue;
      const p = track[track.length - 1];
      planets.push({
        name: planet.name,
        color: planet.color || '#777',
        point: {
          x: (p.x - scale.center.x) / unitKm,
          y: (p.y - scale.center.y) / unitKm,
          z: (p.z - scale.center.z) / unitKm,
        },
      });
    }
  }
  const moonSeries = (ctx.showMoon && Array.isArray(ctx.moonTrack) && ctx.moonTrack.length)
    ? {
        name: 'Moon',
        color: '#7b8190',
        points: ctx.moonTrack.map((p) => ({
          x: (p.x - scale.center.x) / unitKm,
          y: (p.y - scale.center.y) / unitKm,
          z: (p.z - scale.center.z) / unitKm,
        })),
      }
    : null;

  let yaw = 0.9;
  let pitch = 0.45;
  let zoom = 1.0;
  let isDown = false;
  let lastX = 0;
  let lastY = 0;
  const scalePxBase = 0.42 * Math.min(w, h) / Math.max(half, 1);

  const rot = (p) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = cy * p.x + sy * p.z;
    const z1 = -sy * p.x + cy * p.z;
    const y2 = cp * p.y - sp * z1;
    const z2 = sp * p.y + cp * z1;
    return { x: x1, y: y2, z: z2 };
  };
  const proj = (p) => {
    const d = 2.6 * half;
    const f = d / (d - p.z);
    const scalePx = scalePxBase * zoom;
    return {
      sx: w / 2 + p.x * scalePx * f,
      sy: h / 2 - p.y * scalePx * f,
      depth: p.z,
      f,
    };
  };

  const pointFromKm = (xKm, yKm = 0, zKm = 0) => ({
    x: (xKm - scale.center.x) / unitKm,
    y: (yKm - scale.center.y) / unitKm,
    z: (zKm - scale.center.z) / unitKm,
  });

  const isOnScreen = (pp, pad = 24) =>
    pp.sx > -pad && pp.sx < w + pad && pp.sy > -pad && pp.sy < h + pad;

  const drawCube = () => {
    const c = [
      { x: -half, y: -half, z: -half }, { x: half, y: -half, z: -half },
      { x: half, y: half, z: -half }, { x: -half, y: half, z: -half },
      { x: -half, y: -half, z: half }, { x: half, y: -half, z: half },
      { x: half, y: half, z: half }, { x: -half, y: half, z: half },
    ].map((p) => proj(rot(p)));
    const edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],
    ];
    g.strokeStyle = theme.dark ? 'rgba(145,160,185,0.24)' : 'rgba(120,130,145,0.28)';
    g.lineWidth = 1;
    for (const [a, b] of edges) {
      g.beginPath();
      g.moveTo(c[a].sx, c[a].sy);
      g.lineTo(c[b].sx, c[b].sy);
      g.stroke();
    }
  };

  const drawGrid = () => {
    const steps = [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75].map((m) => m * half);
    g.strokeStyle = theme.dark ? 'rgba(145,160,185,0.16)' : 'rgba(140,150,165,0.16)';
    g.lineWidth = 1;
    for (const v of steps) {
      const x1 = proj(rot({ x: -half, y: v, z: 0 }));
      const x2 = proj(rot({ x: half, y: v, z: 0 }));
      const y1 = proj(rot({ x: v, y: -half, z: 0 }));
      const y2 = proj(rot({ x: v, y: half, z: 0 }));
      g.beginPath(); g.moveTo(x1.sx, x1.sy); g.lineTo(x2.sx, x2.sy); g.stroke();
      g.beginPath(); g.moveTo(y1.sx, y1.sy); g.lineTo(y2.sx, y2.sy); g.stroke();
    }
  };

  const draw = () => {
    g.clearRect(0, 0, w, h);
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, theme.dark ? '#111827' : '#fcfcfd');
    bg.addColorStop(1, theme.dark ? '#0f1420' : '#f3f5f8');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    g.strokeStyle = theme.rule;
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, w - 1, h - 1);

    drawGrid();
    drawCube();

    const unitLabel = scale.unit === 'Re' ? 'Rₑ' : scale.unit;
    const axes = [
      { key: `X (${unitLabel})`, a: { x: -half, y: 0, z: 0 }, b: { x: half, y: 0, z: 0 }, c: '#d1495b' },
      { key: `Y (${unitLabel})`, a: { x: 0, y: -half, z: 0 }, b: { x: 0, y: half, z: 0 }, c: '#2a9d8f' },
      { key: `Z (${unitLabel})`, a: { x: 0, y: 0, z: -half }, b: { x: 0, y: 0, z: half }, c: '#3a86ff' },
    ];
    for (const ax of axes) {
      const p1 = proj(rot(ax.a));
      const p2 = proj(rot(ax.b));
      const vx = p2.sx - p1.sx;
      const vy = p2.sy - p1.sy;
      const vlen = Math.hypot(vx, vy) || 1;
      const ux = vx / vlen;
      const uy = vy / vlen;
      const px = -uy;
      const py = ux;
      g.strokeStyle = ax.c;
      g.lineWidth = 1.7;
      g.beginPath();
      g.moveTo(p1.sx, p1.sy);
      g.lineTo(p2.sx, p2.sy);
      g.stroke();

      // Positive direction arrowhead.
      const ah = 10;
      const aw = 4.2;
      g.fillStyle = ax.c;
      g.beginPath();
      g.moveTo(p2.sx, p2.sy);
      g.lineTo(p2.sx - ux * ah + px * aw, p2.sy - uy * ah + py * aw);
      g.lineTo(p2.sx - ux * ah - px * aw, p2.sy - uy * ah - py * aw);
      g.closePath();
      g.fill();

      // Smart ticks and labels.
      const tickVals = [-half, -half * 0.5, 0, half * 0.5, half];
      for (const tv of tickVals) {
        const p = ax.key[0] === 'X'
          ? proj(rot({ x: tv, y: 0, z: 0 }))
          : ax.key[0] === 'Y'
            ? proj(rot({ x: 0, y: tv, z: 0 }))
            : proj(rot({ x: 0, y: 0, z: tv }));
        const tl = 4.5;
        g.strokeStyle = 'rgba(50,60,75,0.55)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(p.sx - px * tl, p.sy - py * tl);
        g.lineTo(p.sx + px * tl, p.sy + py * tl);
        g.stroke();
        if (tv !== 0) {
          g.fillStyle = 'rgba(31,41,55,0.75)';
          g.font = '600 9px Inter Tight, sans-serif';
          const tvTxt = Math.abs(tv) >= 100 ? tv.toFixed(0) : (Math.abs(tv) >= 10 ? tv.toFixed(1) : tv.toFixed(2));
          g.fillText(tvTxt, p.sx + px * 7, p.sy + py * 7);
        }
      }
      g.fillStyle = ax.c;
      g.font = '700 11px Inter Tight, sans-serif';
      g.fillText(ax.key, p2.sx + 6, p2.sy - 4);
    }

    // 3D Bow-shock / Magnetopause wireframes (Earth-centered context only).
    const canDrawGeoSurfaces = scale.unit === 'Re' && Math.abs(scale.center.x) < 3 * RE_KM;
    const drawSurface = (curvePts, stroke, dashed) => {
      if (!Array.isArray(curvePts) || !curvePts.length) return;
      const lonCount = 12;
      const lons = [];
      for (let i = 0; i < lonCount; i++) lons.push((i / lonCount) * Math.PI * 2);
      g.save();
      g.strokeStyle = stroke;
      g.lineWidth = 1.1;
      g.setLineDash(dashed ? [5, 4] : []);
      for (const lon of lons) {
        let started = false;
        g.beginPath();
        for (const p of curvePts) {
          const world = {
            x: p.x * RE_KM,
            y: p.rho * Math.cos(lon) * RE_KM,
            z: p.rho * Math.sin(lon) * RE_KM,
          };
          const q = proj(rot(pointFromKm(world.x, world.y, world.z)));
          if (!started) {
            g.moveTo(q.sx, q.sy);
            started = true;
          } else {
            g.lineTo(q.sx, q.sy);
          }
        }
        g.stroke();
      }
      g.restore();
    };
    if (canDrawGeoSurfaces) {
      if (ctx.showBS) drawSurface(window.SC_MODELS.bowshock(), 'rgba(72,115,185,0.7)', true);
      if (ctx.showMP) drawSurface(window.SC_MODELS.magnetopause(), 'rgba(35,75,155,0.85)', false);
    }

    const drawSeries = [...series].sort((a, b) => {
      const az = a.points.length ? a.points[a.points.length - 1].z : 0;
      const bz = b.points.length ? b.points[b.points.length - 1].z : 0;
      return az - bz;
    });
    for (const s of drawSeries) {
      if (!s.points.length) continue;
      g.strokeStyle = s.color;
      g.lineWidth = s.selected ? 2.8 : 1.7;
      g.globalAlpha = s.selected ? 0.95 : 0.7;
      g.beginPath();
      s.points.forEach((p, i) => {
        const pp = proj(rot(p));
        if (i === 0) g.moveTo(pp.sx, pp.sy);
        else g.lineTo(pp.sx, pp.sy);
      });
      g.stroke();
      const lp = s.points[s.points.length - 1];
      if (lp) {
        const pp = proj(rot(lp));
        if (s.selected) {
          g.globalAlpha = 0.2;
          g.fillStyle = s.color;
          g.beginPath();
          g.arc(pp.sx, pp.sy, 10, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        g.fillStyle = s.color;
        g.beginPath();
        g.arc(pp.sx, pp.sy, s.selected ? 5 : 3.4, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = theme.paper;
        g.lineWidth = 1.3;
        g.stroke();
        if (ctx.showLabels || s.selected) {
          g.fillStyle = theme.ink;
          g.font = s.selected ? '700 12px Inter Tight, sans-serif' : '600 11px Inter Tight, sans-serif';
          g.fillText(s.name, pp.sx + 8, pp.sy - 8);
        }
      }
    }
    g.globalAlpha = 1;

    // Reference bodies/points based on the actual centered frame.
    const earth = proj(rot(pointFromKm(0, 0, 0)));
    if (isOnScreen(earth)) {
      g.fillStyle = '#2b62cc';
      g.beginPath();
      g.arc(earth.sx, earth.sy, 6, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = theme.paper;
      g.lineWidth = 1.5;
      g.stroke();
      g.fillStyle = '#183a7a';
      g.font = '700 11px Inter Tight, sans-serif';
      g.fillText('Earth', earth.sx + 8, earth.sy + 12);
    }

    const sun = proj(rot(pointFromKm(AU_KM, 0, 0)));
    if (isOnScreen(sun)) {
      g.fillStyle = '#f59e0b';
      g.beginPath();
      g.arc(sun.sx, sun.sy, 7, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = theme.paper;
      g.lineWidth = 1.5;
      g.stroke();
      g.fillStyle = '#92400e';
      g.font = '700 11px Inter Tight, sans-serif';
      g.fillText('Sun', sun.sx + 9, sun.sy + 11);
    }

    if (scale.id === 'l1' || ctx.showL1L2) {
      const l1 = proj(rot(pointFromKm(L1_KM, 0, 0)));
      if (isOnScreen(l1)) {
        g.fillStyle = theme.paper;
        g.strokeStyle = theme.ink;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(l1.sx, l1.sy - 7);
        g.lineTo(l1.sx + 7, l1.sy);
        g.lineTo(l1.sx, l1.sy + 7);
        g.lineTo(l1.sx - 7, l1.sy);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = theme.ink;
        g.font = '700 10px Inter Tight, sans-serif';
        g.fillText('L1', l1.sx + 9, l1.sy - 8);
      }
    }

    for (const pl of planets) {
      const pp = proj(rot(pl.point));
      g.fillStyle = pl.color;
      g.beginPath();
      g.arc(pp.sx, pp.sy, 4.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = theme.paper;
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = theme.ink2;
      g.font = '600 10px Inter Tight, sans-serif';
      g.fillText(pl.name, pp.sx + 7, pp.sy - 6);
    }

    if (moonSeries?.points?.length) {
      g.save();
      g.strokeStyle = 'rgba(115,124,140,0.78)';
      g.lineWidth = 1.7;
      g.setLineDash([5, 4]);
      g.beginPath();
      moonSeries.points.forEach((p, i) => {
        const pp = proj(rot(p));
        if (i === 0) g.moveTo(pp.sx, pp.sy);
        else g.lineTo(pp.sx, pp.sy);
      });
      g.stroke();
      g.setLineDash([]);
      const moon = moonSeries.points[moonSeries.points.length - 1];
      const mp = proj(rot(moon));
      if (isOnScreen(mp)) {
        g.fillStyle = theme.paper;
        g.beginPath();
        g.arc(mp.sx, mp.sy, 5.5, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#7b8190';
        g.lineWidth = 1.6;
        g.stroke();
        g.fillStyle = theme.ink2;
        g.font = '700 10px Inter Tight, sans-serif';
        g.fillText('Moon', mp.sx + 8, mp.sy - 7);
      }
      g.restore();
    }

    g.fillStyle = theme.ink;
    g.font = '700 13px Inter Tight, sans-serif';
    g.fillText(`${scale.name} · XYZ`, 12, 20);
    g.font = '500 11px Inter Tight, sans-serif';
    g.fillStyle = theme.ink3;
    g.fillText('Drag to rotate · Wheel to zoom · Double-click to reset', 12, 38);
    g.fillText(`Axes in ${unitLabel} · centered on ${scale.id === 'l1' ? 'L1' : scale.id === 'system' ? 'Sun–Earth midpoint' : 'Earth'}`, 12, 54);

    // lightweight legend
    const legend = series.slice(0, 10);
    if (legend.length) {
      const lx = w - 220;
      const geoRows = (canDrawGeoSurfaces && (ctx.showBS || ctx.showMP)) ? 1 : 0;
      const lh = 20 + legend.length * 16 + (geoRows ? 18 : 0);
      g.fillStyle = theme.legendBg;
      g.strokeStyle = theme.rule;
      g.lineWidth = 1;
      g.beginPath();
      if (typeof g.roundRect === 'function') g.roundRect(lx, 10, 205, lh, 6);
      else g.rect(lx, 10, 205, lh);
      g.fill();
      g.stroke();
      g.fillStyle = theme.ink3;
      g.font = '700 10px Inter Tight, sans-serif';
      g.fillText('SPACECRAFT', lx + 10, 24);
      legend.forEach((s, i) => {
        const y = 37 + i * 15;
        g.fillStyle = s.color;
        g.beginPath();
        g.arc(lx + 12, y, 3.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = theme.ink;
        g.font = s.selected ? '700 10px Inter Tight, sans-serif' : '500 10px Inter Tight, sans-serif';
        g.fillText(s.name, lx + 22, y + 3.5);
      });
      if (geoRows) {
        const y = 37 + legend.length * 15 + 8;
        g.strokeStyle = 'rgba(35,75,155,0.85)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(lx + 8, y);
        g.lineTo(lx + 18, y);
        g.stroke();
        if (ctx.showBS) {
          g.strokeStyle = 'rgba(72,115,185,0.7)';
          g.setLineDash([4, 3]);
          g.beginPath();
          g.moveTo(lx + 30, y);
          g.lineTo(lx + 40, y);
          g.stroke();
          g.setLineDash([]);
          g.fillStyle = theme.ink;
          g.font = '500 10px Inter Tight, sans-serif';
          g.fillText('MP / BS', lx + 48, y + 3.5);
        } else {
          g.fillStyle = theme.ink;
          g.font = '500 10px Inter Tight, sans-serif';
          g.fillText('Magnetopause', lx + 24, y + 3.5);
        }
      }
    }
  };
  draw();

  const onDown = (e) => { isDown = true; lastX = e.clientX; lastY = e.clientY; canvas.style.cursor = 'grabbing'; };
  const onUp = () => { isDown = false; canvas.style.cursor = 'grab'; };
  const onMove = (e) => {
    if (!isDown) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    yaw += dx * 0.008;
    pitch = Math.max(-1.4, Math.min(1.4, pitch + dy * 0.008));
    draw();
  };
  const onWheel = (e) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    zoom = Math.max(0.45, Math.min(3.2, zoom * (dir > 0 ? 1.08 : 0.92)));
    draw();
  };
  const onDouble = () => {
    yaw = 0.9;
    pitch = 0.45;
    zoom = 1.0;
    draw();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.style.cursor = 'grab';
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointermove', onMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', onDouble);

  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('dblclick', onDouble);
  };
}

function build3DPlot(host, scale, ctx) {
  // Use a deterministic canvas renderer for reliability in this static dashboard context.
  // Plotly can still be used later, but this guarantees 3D visibility everywhere.
  return build3DFallbackCanvas(host, scale, ctx);
}

window.SC_PLOT = { buildPlot, drawSymbol, build3DPlot };
})();
