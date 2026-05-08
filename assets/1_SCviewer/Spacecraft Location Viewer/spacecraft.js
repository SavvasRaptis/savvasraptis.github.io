// Spacecraft catalog + API/static data layer for real GSE positions.
// Backend contract:
//   GET /positions?ids=DSCOVR,ACE&start=...&end=...&step=1h
//   GET /positions/year?ids=DSCOVR&year=2025&step=1h
//   GET /catalog

const AU_KM = 149597870.7;
const RE_KM = 6378.137;
const L1_KM = 1_500_000;
const L2_KM = -1_500_000;
const MOON_KM = 384_400;

// Set these from HTML before loading this file:
//   <script>
//     window.SC_API_BASE = "https://your-backend.example.com";
//     window.SC_DATA_BASE = "https://cdn.jsdelivr.net/gh/<user>/scviewer-data@main";
//   </script>
const API_BASE = (window.SC_API_BASE || 'http://localhost:8000').replace(/\/+$/, '');
const DATA_BASE = (window.SC_DATA_BASE || '').replace(/\/+$/, '');
const DATA_MANIFEST_PATH = window.SC_DATA_MANIFEST_PATH || '/scdata/manifest.json';
const STATIC_PATH_TEMPLATE = '/scdata/{step}/{id}/{yyyy}/{mm}.json.gz';

const GROUPS = {
  magnetospheric: { label: 'Magnetospheric', hue: 25, short: 'MAG' },
  solar_l1: { label: 'L1', hue: 255, short: 'L1' },
  inner_heli: { label: 'Inner Heliosphere', hue: 145, short: 'HELI' },
  deep_space: { label: 'Planetary', hue: 300, short: 'PLAN' },
};

const SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross', 'triangleDown', 'pentagon'];
const PLANET_IDS = ['MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE'];
const PLANETS = [
  { id: 'MERCURY', name: 'Mercury', color: '#8a7d72' },
  { id: 'VENUS', name: 'Venus', color: '#c89648' },
  { id: 'MARS', name: 'Mars', color: '#b85f4e' },
  { id: 'JUPITER', name: 'Jupiter', color: '#b99572' },
  { id: 'SATURN', name: 'Saturn', color: '#c7ad76' },
  { id: 'URANUS', name: 'Uranus', color: '#6cb5c7' },
  { id: 'NEPTUNE', name: 'Neptune', color: '#4d79c9' },
];

// id = frontend selector key and backend API key in /positions response
const CATALOG = [
  { id: 'MMS1', name: 'MMS-1', group: 'magnetospheric' },
  { id: 'MMS2', name: 'MMS-2', group: 'magnetospheric' },
  { id: 'MMS3', name: 'MMS-3', group: 'magnetospheric' },
  { id: 'MMS4', name: 'MMS-4', group: 'magnetospheric' },
  { id: 'THA', name: 'THEMIS-A', group: 'magnetospheric' },
  { id: 'THD', name: 'THEMIS-D', group: 'magnetospheric' },
  { id: 'THE', name: 'THEMIS-E', group: 'magnetospheric' },
  { id: 'ARTP1', name: 'ARTEMIS-P1', group: 'magnetospheric' },
  { id: 'ARTP2', name: 'ARTEMIS-P2', group: 'magnetospheric' },
  { id: 'CL1', name: 'Cluster-1', group: 'magnetospheric' },
  { id: 'CL2', name: 'Cluster-2', group: 'magnetospheric' },
  { id: 'CL3', name: 'Cluster-3', group: 'magnetospheric' },
  { id: 'CL4', name: 'Cluster-4', group: 'magnetospheric' },
  { id: 'GEOTAIL', name: 'Geotail', group: 'magnetospheric' },

  { id: 'WIND', name: 'Wind', group: 'solar_l1' },
  { id: 'ACE', name: 'ACE', group: 'solar_l1' },
  { id: 'SOHO', name: 'SOHO', group: 'solar_l1' },
  { id: 'DSCOVR', name: 'DSCOVR', group: 'solar_l1' },
  { id: 'ADITYA', name: 'Aditya-L1', group: 'solar_l1' },
  { id: 'IMAP', name: 'IMAP', group: 'solar_l1' },
  { id: 'SOLAR1', name: 'SOLAR-1', group: 'solar_l1' },

  { id: 'PSP', name: 'Parker Solar Probe', group: 'inner_heli' },
  { id: 'SOLO', name: 'Solar Orbiter', group: 'inner_heli' },
  { id: 'STEREOA', name: 'STEREO-A', group: 'inner_heli' },

  { id: 'JUICE', name: 'JUICE', group: 'deep_space' },
  { id: 'EURC', name: 'Europa Clipper', group: 'deep_space' },
  { id: 'JUNO', name: 'Juno', group: 'deep_space' },
  { id: 'BEPI', name: 'BepiColombo', group: 'deep_space' },
  { id: 'MAVEN', name: 'MAVEN', group: 'deep_space' },
  { id: 'VOYAGER1', name: 'Voyager-1', group: 'deep_space' },
  { id: 'VOYAGER2', name: 'Voyager-2', group: 'deep_space' },
];

let _manifestPromise = null;

function buildApiUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  return url.toString();
}

function buildDataUrl(path) {
  if (!DATA_BASE) return null;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${DATA_BASE}${clean}`;
}

function normalizePoint(p) {
  return {
    t: p.t,
    x: Number(p.x),
    y: Number(p.y),
    z: Number(p.z),
  };
}

function monthKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthKeysInRange(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const out = [];

  while (cursor <= last) {
    out.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

function monthParts(key) {
  const [yyyy, mm] = key.split('-');
  return { yyyy, mm };
}

function chunkPath(step, id, ym, template) {
  const { yyyy, mm } = monthParts(ym);
  return template
    .replaceAll('{step}', step)
    .replaceAll('{id}', id)
    .replaceAll('{yyyy}', yyyy)
    .replaceAll('{mm}', mm);
}

function normalizeRows(rawRows) {
  if (!Array.isArray(rawRows)) return [];
  return rawRows.map(normalizePoint).filter((row) => row.t && Number.isFinite(row.x) && Number.isFinite(row.y) && Number.isFinite(row.z));
}

function rowsForIdFromChunk(payload, id) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload[id])) return payload[id];
  if (Array.isArray(payload.rows)) return payload.rows;
  if (payload.data && Array.isArray(payload.data[id])) return payload.data[id];
  return [];
}

function mergeByEpoch(seriesA, seriesB) {
  const byEpoch = new Map();
  for (const row of seriesA || []) byEpoch.set(row.t, row);
  for (const row of seriesB || []) byEpoch.set(row.t, row);
  return Array.from(byEpoch.values()).sort((a, b) => a.t.localeCompare(b.t));
}

function clipRowsToWindow(rows, startISO, endISO) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const startMs = Date.parse(startISO);
  const endMs = Date.parse(endISO);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];
  return rows.filter((row) => {
    const tMs = Date.parse(row.t);
    return Number.isFinite(tMs) && tMs >= startMs && tMs <= endMs;
  });
}

function extractMonths(entry) {
  if (!entry) return null;
  if (Array.isArray(entry)) return entry;
  if (entry && Array.isArray(entry.months)) return entry.months;
  return null;
}

function availableMonthsFromManifest(manifest, step, id) {
  const v1 = extractMonths(manifest?.steps?.[step]?.[id]);
  if (v1) return new Set(v1);

  const v2 = extractMonths(manifest?.missions?.[id]?.steps?.[step]);
  if (v2) return new Set(v2);

  const v3 = extractMonths(manifest?.availability?.[step]?.[id]);
  if (v3) return new Set(v3);

  return null;
}

async function parseMaybeGzipJson(response, url) {
  if (!url.endsWith('.gz')) return response.json();
  const buf = await response.arrayBuffer();
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Gzip chunk encountered but DecompressionStream is unavailable in this browser.');
  }
  const ds = new DecompressionStream('gzip');
  const decompressed = new Blob([buf]).stream().pipeThrough(ds);
  const text = await new Response(decompressed).text();
  return JSON.parse(text);
}

async function fetchManifest(signal) {
  if (!DATA_BASE) return null;
  if (_manifestPromise) return _manifestPromise;

  const url = buildDataUrl(DATA_MANIFEST_PATH);
  _manifestPromise = (async () => {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Static manifest fetch failed (${response.status}).`);
    }
    return response.json();
  })();

  try {
    return await _manifestPromise;
  } catch (error) {
    _manifestPromise = null;
    throw error;
  }
}

async function loadStaticPositions(ids, startISO, endISO, step, signal) {
  if (!DATA_BASE) return { payload: {}, completeIds: new Set(), usedStatic: false };

  const manifest = await fetchManifest(signal);
  if (!manifest) return { payload: {}, completeIds: new Set(), usedStatic: false };

  const template = manifest.path_template || STATIC_PATH_TEMPLATE;
  const months = monthKeysInRange(startISO, endISO);
  const payload = {};
  const completeIds = new Set();

  await Promise.all(
    ids.map(async (id) => {
      const available = availableMonthsFromManifest(manifest, step, id);
      if (!available) {
        payload[id] = [];
        return;
      }

      const required = months.filter((ym) => available.has(ym));
      const missing = months.filter((ym) => !available.has(ym));
      const chunks = await Promise.all(
        required.map(async (ym) => {
          const path = chunkPath(step, id, ym, template);
          const url = buildDataUrl(path);
          const response = await fetch(url, { signal });
          if (!response.ok) throw new Error(`Static chunk fetch failed for ${id} ${ym}: ${response.status}`);
          const decoded = await parseMaybeGzipJson(response, url);
          return normalizeRows(rowsForIdFromChunk(decoded, id));
        })
      );

      const merged = chunks.reduce((acc, rows) => mergeByEpoch(acc, rows), []);
      payload[id] = merged;
      if (missing.length === 0) completeIds.add(id);
    })
  );

  return { payload, completeIds, usedStatic: true };
}

async function fetchApiPositions(ids, startISO, endISO, step = '1h', signal) {
  const idsValue = Array.isArray(ids) ? ids.join(',') : ids;
  const url = buildApiUrl('/positions', {
    ids: idsValue,
    start: startISO,
    end: endISO,
    step,
  });
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Positions fetch failed (${response.status}): ${body || 'no response body'}`);
  }
  const payload = await response.json();
  const normalized = {};
  for (const [key, value] of Object.entries(payload)) {
    normalized[key] = Array.isArray(value) ? value.map(normalizePoint) : [];
  }
  return normalized;
}

async function fetchPositions(ids, startISO, endISO, step = '1h', signal) {
  const idList = Array.isArray(ids) ? ids : String(ids).split(',').map((s) => s.trim()).filter(Boolean);
  const uniqueIds = Array.from(new Set(idList));

  let staticResult = { payload: {}, completeIds: new Set(), usedStatic: false };
  try {
    staticResult = await loadStaticPositions(uniqueIds, startISO, endISO, step, signal);
  } catch (error) {
    console.warn('[SC Viewer] Static data load failed; falling back to API.', error);
  }

  const missingIds = uniqueIds.filter((id) => !staticResult.completeIds.has(id));
  let apiPayload = {};
  if (missingIds.length) {
    apiPayload = await fetchApiPositions(missingIds, startISO, endISO, step, signal);
  }

  const merged = {};
  for (const id of uniqueIds) {
    const fromStatic = staticResult.payload[id] || [];
    const fromApi = apiPayload[id] || [];
    const combined = mergeByEpoch(fromStatic, fromApi);
    merged[id] = clipRowsToWindow(combined, startISO, endISO);
  }

  return merged;
}

async function fetchPlanetPositions(ids, startISO, endISO, step = '1h', signal) {
  const idsList = Array.isArray(ids) ? ids : String(ids).split(',').map((s) => s.trim()).filter(Boolean);
  const cleanIds = idsList.map((id) => String(id).toUpperCase()).filter((id) => PLANET_IDS.includes(id));
  if (!cleanIds.length) return {};
  const url = buildApiUrl('/planets', {
    ids: cleanIds.join(','),
    start: startISO,
    end: endISO,
    step,
  });
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Planet positions fetch failed (${response.status}): ${body || 'no response body'}`);
  }
  const payload = await response.json();
  const normalized = {};
  for (const [key, value] of Object.entries(payload)) {
    normalized[key] = Array.isArray(value) ? value.map(normalizePoint) : [];
  }
  return normalized;
}

async function generatePositions(sc, startISO, endISO, step = '1h', signal) {
  const payload = await fetchPositions([sc.id], startISO, endISO, step, signal);
  return payload[sc.id] || [];
}

async function generateYear(ids, year, step = '1h', signal) {
  const idsValue = Array.isArray(ids) ? ids.join(',') : ids;
  const url = buildApiUrl('/positions/year', { ids: idsValue, year, step });
  return fetch(url, { signal });
}

async function fetchCatalog(signal) {
  const url = buildApiUrl('/catalog', {});
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Catalog fetch failed (${response.status})`);
  return response.json();
}

// Assign stable symbols + hue spread per group.
(function annotate() {
  const byGroup = {};
  for (const sc of CATALOG) (byGroup[sc.group] ||= []).push(sc);
  for (const [gk, list] of Object.entries(byGroup)) {
    list.forEach((sc, i) => {
      sc.symbol = SYMBOLS[i % SYMBOLS.length];
      const spread = Math.min(45, 12 * list.length);
      const step = list.length > 1 ? spread / (list.length - 1) : 0;
      sc.hue = GROUPS[gk].hue - spread / 2 + i * step;
    });
  }
})();

window.SC_DATA = {
  API_BASE,
  DATA_BASE,
  DATA_MANIFEST_PATH,
  AU_KM,
  RE_KM,
  L1_KM,
  L2_KM,
  MOON_KM,
  GROUPS,
  SYMBOLS,
  CATALOG,
  PLANETS,
  fetchPositions,
  fetchPlanetPositions,
  generatePositions,
  generateYear,
  fetchCatalog,
};
