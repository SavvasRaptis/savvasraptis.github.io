// Professional 2D plot builder. Returns an <svg>.
// scale: { name, plane, unit, halfWidth, center, id? }
// ctx:   { selected, tracks, showBS, showMP, showOrbits, showLabels, showL1L2, showMoon,
//          selectedScId, hoveredId, endDate }
// opts:  { width, height, fontScale, showLegend }

(function(){
const { AU_KM, RE_KM, L1_KM, L2_KM, MOON_KM, GROUPS } = window.SC_DATA;
const SVG_NS = 'http://www.w3.org/2000/svg';
const SUN_RADIUS_KM = 696_340;

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

  // white bg for export
  svg.appendChild(el('rect', { x: 0, y: 0, width: W_total, height: H, fill: '#ffffff' }));

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
    fill: '#ffffff',
    stroke: 'oklch(0.28 0.01 260)', 'stroke-width': 1.3,
  }));

  // --- Ticks
  const xStep = niceTicks(xMinU, xMaxU, 8);
  const yStep = niceTicks(yMinU, yMaxU, 8);
  const stepXVal = xStep.length > 1 ? xStep[1] - xStep[0] : 1;
  const stepYVal = yStep.length > 1 ? yStep[1] - yStep[0] : 1;

  const gridG = el('g', { stroke: 'oklch(0.92 0.004 260)', 'stroke-width': 0.7 });
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

  const zeroG = el('g', { stroke: 'oklch(0.65 0.01 260)', 'stroke-width': 1.2, 'stroke-dasharray': '5 5' });
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
    fill: 'oklch(0.22 0.01 260)',
  });
  for (const tx of xStep) {
    if (tx < xMinU - 1e-9 || tx > xMaxU + 1e-9) continue;
    const px = PAD_L + ((tx - xMinU) / (xMaxU - xMinU)) * plotW;
    tickG.appendChild(el('line', { x1: px, y1: PAD_T + plotH, x2: px, y2: PAD_T + plotH + 7, stroke: 'oklch(0.28 0.01 260)', 'stroke-width': 1.3 }));
    tickG.appendChild(el('text', { x: px, y: PAD_T + plotH + tickSize + 10, 'text-anchor': 'middle' }, fmtTick(tx, stepXVal)));
  }
  for (const ty of yStep) {
    if (ty < yMinU - 1e-9 || ty > yMaxU + 1e-9) continue;
    const py = PAD_T + plotH - ((ty - yMinU) / (yMaxU - yMinU)) * plotH;
    tickG.appendChild(el('line', { x1: PAD_L - 7, y1: py, x2: PAD_L, y2: py, stroke: 'oklch(0.28 0.01 260)', 'stroke-width': 1.3 }));
    tickG.appendChild(el('text', { x: PAD_L - 11, y: py + tickSize * 0.36, 'text-anchor': 'end' }, fmtTick(ty, stepYVal)));
  }
  svg.appendChild(tickG);

  // axis labels (spelled out clearly — NO superscript exponent glyphs)
  const axG = el('g', { fill: 'oklch(0.14 0.01 260)', 'font-size': axisLabelSize, 'font-weight': 700 });
  axG.appendChild(el('text', { x: PAD_L + plotW / 2, y: H - 22, 'text-anchor': 'middle' },
    `X GSE (${unitLabel})`));
  axG.appendChild(el('text', {
    transform: `translate(${24 * fs} ${PAD_T + plotH / 2}) rotate(-90)`,
    'text-anchor': 'middle',
  }, `${scale.plane === 'xy' ? 'Y' : 'Z'} GSE (${unitLabel})`));
  svg.appendChild(axG);

  // --- Clipped content
  const content = el('g', { 'clip-path': `url(#${clipId})` });
  svg.appendChild(content);

  const isSystem = scale.id === 'system';
  const isNearEarth = scale.unit === 'Re';

  // Earth's orbit
  if (ctx.showOrbits && scale.halfWidth * unitKm > 0.5 * AU_KM) {
    const [scX, scY] = worldToScreen({ x: AU_KM, y: 0, z: 0 });
    const r = AU_KM * pxPerKmX;
    content.appendChild(el('circle', {
      cx: scX, cy: scY, r, fill: 'none',
      stroke: 'oklch(0.55 0.17 245 / 0.45)',
      'stroke-width': 1.2, 'stroke-dasharray': '6 5',
    }));
  }

  // Moon orbit
  const earthRadiusPx = RE_KM * pxPerKmX;
  const moonOrbitPx = MOON_KM * pxPerKmX;
  // Always show on moonmag scale; otherwise gated by toggle + size.
  const isMoonMag = scale.id === 'moonmag';
  const showMoonOrbit = isMoonMag || (ctx.showMoon && moonOrbitPx > 18 && moonOrbitPx < Math.min(plotW, plotH) * 0.55);
  if (showMoonOrbit) {
    const [ex, ey] = worldToScreen({ x: 0, y: 0, z: 0 });
    content.appendChild(el('circle', {
      cx: ex, cy: ey, r: moonOrbitPx, fill: 'none',
      stroke: 'oklch(0.55 0.01 260 / 0.65)',
      'stroke-width': 1.2, 'stroke-dasharray': '4 4',
    }));
    // Moon body — pos depends on plane (XY: y component, XZ: z component)
    const moonPos = scale.plane === 'xz'
      ? { x: MOON_KM * 0.7071, y: 0, z: MOON_KM * 0.7071 }
      : { x: MOON_KM * 0.7071, y: MOON_KM * 0.7071, z: 0 };
    const [mx, my] = worldToScreen(moonPos);
    const moonR = Math.max(8 * fs, Math.min(14 * fs, moonOrbitPx * 0.05));
    // crater shading
    const moonGrad = `moon-grad-${Math.random().toString(36).slice(2,8)}`;
    const defs2 = el('defs');
    const rg = el('radialGradient', { id: moonGrad, cx: '35%', cy: '35%', r: '70%' });
    rg.appendChild(el('stop', { offset: '0%', 'stop-color': 'oklch(0.92 0.005 260)' }));
    rg.appendChild(el('stop', { offset: '60%', 'stop-color': 'oklch(0.78 0.01 260)' }));
    rg.appendChild(el('stop', { offset: '100%', 'stop-color': 'oklch(0.55 0.01 260)' }));
    defs2.appendChild(rg);
    content.appendChild(defs2);
    content.appendChild(el('circle', { cx: mx, cy: my, r: moonR, fill: `url(#${moonGrad})`, stroke: 'oklch(0.42 0.01 260)', 'stroke-width': 1.1 }));
    // craters
    content.appendChild(el('circle', { cx: mx - moonR * 0.25, cy: my - moonR * 0.15, r: moonR * 0.18, fill: 'oklch(0.62 0.01 260 / 0.5)' }));
    content.appendChild(el('circle', { cx: mx + moonR * 0.25, cy: my + moonR * 0.2, r: moonR * 0.13, fill: 'oklch(0.62 0.01 260 / 0.5)' }));
    content.appendChild(el('circle', { cx: mx - moonR * 0.05, cy: my + moonR * 0.32, r: moonR * 0.09, fill: 'oklch(0.62 0.01 260 / 0.5)' }));
    content.appendChild(el('text', {
      x: mx + moonR + 4 * fs, y: my + 5 * fs,
      'font-size': refLabelSize, 'font-weight': 700, fill: 'oklch(0.28 0.01 260)',
      'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3.5, 'stroke-linejoin': 'round',
    }, 'Moon'));
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
  const sunVisible = sunX > PAD_L - 60 && sunX < PAD_L + plotW + 60 &&
                     sunY > PAD_T - 60 && sunY < PAD_T + plotH + 60;
  if (sunVisible) {
    const iconR = 12 * fs;
    const rDraw = Math.max(sunRadiusPx, iconR);
    if (rDraw > 6) {
      content.appendChild(el('circle', { cx: sunX, cy: sunY, r: rDraw * 2.0, fill: 'oklch(0.94 0.12 80 / 0.30)' }));
      content.appendChild(el('circle', { cx: sunX, cy: sunY, r: rDraw * 1.4, fill: 'oklch(0.92 0.14 78 / 0.35)' }));
    }
    content.appendChild(el('circle', { cx: sunX, cy: sunY, r: rDraw, fill: `url(#${sunGradId})`, stroke: 'oklch(0.52 0.17 50)', 'stroke-width': 1.3 }));
    content.appendChild(el('text', {
      x: sunX, y: sunY + rDraw + refLabelSize + 4,
      'text-anchor': 'middle',
      'font-size': refLabelSize, 'font-weight': 800, fill: 'oklch(0.38 0.15 58)',
      'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round',
    }, 'Sun'));
  }

  // --- Earth
  const [eX, eY] = worldToScreen({ x: 0, y: 0, z: 0 });
  const earthVisible = eX > PAD_L - 60 && eX < PAD_L + plotW + 60 &&
                       eY > PAD_T - 60 && eY < PAD_T + plotH + 60;
  if (earthVisible) {
    const iconR = 11 * fs;
    const rDraw = Math.max(earthRadiusPx, iconR);
    content.appendChild(el('circle', { cx: eX, cy: eY, r: rDraw, fill: `url(#${earthGradId})`, stroke: 'oklch(0.22 0.15 250)', 'stroke-width': 1.3 }));
    content.appendChild(el('text', {
      x: eX, y: eY + rDraw + refLabelSize + 4,
      'text-anchor': 'middle',
      'font-size': refLabelSize, 'font-weight': 800, fill: 'oklch(0.28 0.16 250)',
      'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round',
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
        fill: '#fff', stroke: 'oklch(0.22 0.01 260)', 'stroke-width': 1.6,
      }));
      content.appendChild(el('text', {
        x: lx, y: ly - s - 5,
        'text-anchor': 'middle',
        'font-family': "'JetBrains Mono', ui-monospace, monospace",
        'font-size': refLabelSize * 0.9, 'font-weight': 700, fill: 'oklch(0.18 0.01 260)',
        'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3.5, 'stroke-linejoin': 'round',
      }, label));
    }
  }

  // --- Spacecraft
  const hideOnSystem = new Set(['magnetospheric', 'solar_l1']);
  const ordered = [...ctx.selected].sort((a, b) => {
    if (a.id === ctx.selectedScId) return 1;
    if (b.id === ctx.selectedScId) return -1;
    return 0;
  });

  const renderedLegend = []; // { sc, color }

  for (const sc of ordered) {
    if (isSystem && hideOnSystem.has(sc.group)) continue;

    const track = ctx.tracks.get(sc.id);
    if (!track || track.length === 0) continue;
    const hue = sc.hue ?? GROUPS[sc.group].hue;
    const color = `oklch(0.52 0.17 ${hue})`;
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
      stroke: '#fff',
      strokeWidth: 1.6 * fs,
      dataAttrs: { 'data-sc': sc.id, class: 'sc-dot' },
    });
    // ensure the `class` attr applies even on <g> cross
    sym.classList.add('sc-dot');
    sym.setAttribute('data-sc', sc.id);
    content.appendChild(sym);

    if (ctx.showLabels) {
      content.appendChild(el('text', {
        x: lx + 11 * fs, y: ly - 8 * fs,
        'font-size': isSelected ? bodyLabelSize + 1 : bodyLabelSize,
        'font-weight': isSelected ? 700 : 600,
        fill: 'oklch(0.14 0.01 260)',
        'paint-order': 'stroke',
        stroke: '#ffffff', 'stroke-width': 4, 'stroke-linejoin': 'round',
      }, sc.name));
    }
  }

  // --- Title bar
  svg.appendChild(el('text', {
    x: PAD_L, y: titleSize + 12,
    'font-size': titleSize, 'font-weight': 800, fill: 'oklch(0.12 0.01 260)',
    'letter-spacing': '-0.01em',
  }, scale.name));

  svg.appendChild(el('text', {
    x: PAD_L, y: titleSize + planeSize + 18,
    'font-family': "'JetBrains Mono', ui-monospace, monospace",
    'font-size': planeSize, 'font-weight': 700,
    'letter-spacing': '0.12em', fill: 'oklch(0.40 0.01 260)',
  }, `${scale.plane.toUpperCase()} PLANE`));

  svg.appendChild(el('text', {
    x: W - PAD_R, y: titleSize + 12,
    'font-family': "'JetBrains Mono', ui-monospace, monospace",
    'font-size': badgeSize, 'font-weight': 700, 'text-anchor': 'end', fill: 'oklch(0.26 0.01 260)',
  }, `± ${scale.halfWidth} ${unitLabel}`));

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
    bg.appendChild(el('line', { x1: bx, y1: by, x2: bx + niceBarLen, y2: by, stroke: 'oklch(0.12 0.01 260)', 'stroke-width': 2.6 }));
    bg.appendChild(el('line', { x1: bx, y1: by - 4, x2: bx, y2: by + 4, stroke: 'oklch(0.12 0.01 260)', 'stroke-width': 2.6 }));
    bg.appendChild(el('line', { x1: bx + niceBarLen, y1: by - 4, x2: bx + niceBarLen, y2: by + 4, stroke: 'oklch(0.12 0.01 260)', 'stroke-width': 2.6 }));
    bg.appendChild(el('text', {
      x: bx + niceBarLen / 2, y: by - 9,
      'text-anchor': 'middle',
      'font-family': "'JetBrains Mono', ui-monospace, monospace",
      'font-size': tickSize, 'font-weight': 700, fill: 'oklch(0.12 0.01 260)',
      'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3.5, 'stroke-linejoin': 'round',
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
      fill: '#ffffff',
      stroke: 'oklch(0.88 0.005 260)',
      'stroke-width': 1,
      rx: 4,
    }));
    svg.appendChild(el('text', {
      x: lx0 + 6, y: PAD_T + legendTextSize + 4,
      'font-size': legendTextSize * 0.85, 'font-weight': 700,
      'letter-spacing': '0.08em', fill: 'oklch(0.35 0.01 260)',
    }, 'SPACECRAFT'));
    // Items
    const maxRows = Math.floor((plotH - legendTextSize * 2 - 16) / rowH);
    const shown = renderedLegend.slice(0, maxRows);
    const startY = PAD_T + legendTextSize * 2 + 8;
    shown.forEach((r, i) => {
      const y = startY + i * rowH;
      const sym = drawSymbol(r.sc.symbol || 'circle', lx0 + 18, y, 6.5 * fs, {
        fill: r.color, stroke: '#fff', strokeWidth: 1.4,
      });
      svg.appendChild(sym);
      svg.appendChild(el('text', {
        x: lx0 + 36, y: y + legendTextSize * 0.36,
        'font-size': legendTextSize, 'font-weight': 600, fill: 'oklch(0.16 0.01 260)',
      }, r.sc.name));
    });
    if (renderedLegend.length > shown.length) {
      svg.appendChild(el('text', {
        x: lx0 + 6, y: startY + shown.length * rowH + legendTextSize,
        'font-size': legendTextSize * 0.85, 'font-style': 'italic', fill: 'oklch(0.45 0.01 260)',
      }, `+${renderedLegend.length - shown.length} more…`));
    }
  }

  return svg;
}

window.SC_PLOT = { buildPlot, drawSymbol };
})();
