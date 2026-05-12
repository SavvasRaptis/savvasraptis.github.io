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
const STATIC_PATH_TEMPLATE = '/scdata/{step}/{frame}/{id}/{yyyy}/{mm}.json.gz';
const BODY_STATIC_PATH_TEMPLATE = '/scdata/bodies/{step}/{frame}/{id}/{yyyy}/{mm}.json.gz';
const STATIC_FETCH_TIMEOUT_MS = Number(window.SC_STATIC_FETCH_TIMEOUT_MS || 12_000);
const API_FALLBACK_TIMEOUT_MS = Number(window.SC_API_FALLBACK_TIMEOUT_MS || 45_000);
const DATA_BASE_CANDIDATES = deriveDataBaseCandidates(DATA_BASE);

const GROUPS = {
  magnetospheric: { label: 'Magnetospheric', hue: 25, short: 'MAG' },
  inner_magnetosphere: { label: 'Inner Magnetosphere', hue: 5, short: 'iMAG' },
  solar_l1: { label: 'L1', hue: 255, short: 'L1' },
  inner_heli: { label: 'Inner Heliosphere', hue: 145, short: 'HELI' },
  deep_space: { label: 'Planetary', hue: 300, short: 'PLAN' },
};

const SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross', 'triangleDown', 'pentagon'];
const PLANET_IDS = ['MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE'];
const MOON_ID = 'MOON';
const BODY_IDS = [...PLANET_IDS, MOON_ID];
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
  { id: 'GOES12', name: 'GOES-12', group: 'inner_magnetosphere' },
  { id: 'GOES13', name: 'GOES-13', group: 'inner_magnetosphere' },
  { id: 'GOES14', name: 'GOES-14', group: 'inner_magnetosphere' },
  { id: 'GOES15', name: 'GOES-15', group: 'inner_magnetosphere' },
  { id: 'GOES16', name: 'GOES-16', group: 'inner_magnetosphere' },
  { id: 'GOES17', name: 'GOES-17', group: 'inner_magnetosphere' },
  { id: 'GOES18', name: 'GOES-18', group: 'inner_magnetosphere' },
  { id: 'GOES19', name: 'GOES-19', group: 'inner_magnetosphere' },
  { id: 'ARASE', name: 'Arase (ERG)', group: 'inner_magnetosphere' },
  { id: 'RBSPA', name: 'Van Allen Probe A', group: 'inner_magnetosphere' },
  { id: 'RBSPB', name: 'Van Allen Probe B', group: 'inner_magnetosphere' },

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
const _chunkPromiseCache = new Map();
let _pakoLoadPromise = null;

function isAbortError(error) {
  return error?.name === 'AbortError' || String(error?.message || '').includes('aborted');
}

function buildSignalWithTimeout(signal, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) return { signal, cleanup: () => {} };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason || new DOMException('Aborted', 'AbortError'));
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    },
  };
}

function buildApiUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  return url.toString();
}

function deriveDataBaseCandidates(primaryBase) {
  if (!primaryBase) return [];
  const out = [];
  const pushUnique = (value) => {
    if (!value) return;
    const normalized = String(value).replace(/\/+$/, '');
    if (!normalized) return;
    if (!out.includes(normalized)) out.push(normalized);
  };
  pushUnique(primaryBase);

  const m = String(primaryBase).match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^@/]+)@(.+)$/i);
  if (m) {
    const owner = m[1];
    const repo = m[2];
    const ref = m[3];
    pushUnique(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}`);
    pushUnique(`https://fastly.jsdelivr.net/gh/${owner}/${repo}@${ref}`);
  }
  const rawMatch = String(primaryBase).match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(.+)$/i);
  if (rawMatch) {
    const owner = rawMatch[1];
    const repo = rawMatch[2];
    const ref = rawMatch[3];
    pushUnique(`https://cdn.jsdelivr.net/gh/${owner}/${repo}@${ref}`);
    pushUnique(`https://fastly.jsdelivr.net/gh/${owner}/${repo}@${ref}`);
  }
  return out;
}

function buildDataUrls(path) {
  if (!DATA_BASE_CANDIDATES.length) return [];
  const clean = path.startsWith('/') ? path : `/${path}`;
  return DATA_BASE_CANDIDATES.map((base) => `${base}${clean}`);
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

function chunkPath(step, frame, id, ym, template) {
  const { yyyy, mm } = monthParts(ym);
  return template
    .replaceAll('{step}', step)
    .replaceAll('{frame}', String(frame || 'gse').toLowerCase())
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

function availableMonthsFromManifest(manifest, step, frame, id) {
  const frameKey = String(frame || 'GSE').toUpperCase();
  const v1 = extractMonths(manifest?.steps?.[step]?.[frameKey]?.[id]);
  if (v1) return new Set(v1);

  const v1Legacy = extractMonths(manifest?.steps?.[step]?.[id]);
  if (v1Legacy) return new Set(v1Legacy);

  const v2 = extractMonths(manifest?.missions?.[id]?.steps?.[step]?.[frameKey]);
  if (v2) return new Set(v2);

  const v2Legacy = extractMonths(manifest?.missions?.[id]?.steps?.[step]);
  if (v2Legacy) return new Set(v2Legacy);

  const v3 = extractMonths(manifest?.availability?.[step]?.[frameKey]?.[id]);
  if (v3) return new Set(v3);

  const v3Legacy = extractMonths(manifest?.availability?.[step]?.[id]);
  if (v3Legacy) return new Set(v3Legacy);

  return null;
}

function availableBodyMonthsFromManifest(manifest, step, frame, id) {
  const frameKey = String(frame || 'GSE').toUpperCase();
  const bodySteps = manifest?.bodies?.steps;
  const v1 = extractMonths(bodySteps?.[step]?.[frameKey]?.[id]);
  if (v1) return new Set(v1);

  const v1Legacy = extractMonths(bodySteps?.[step]?.[id]);
  if (v1Legacy) return new Set(v1Legacy);

  return null;
}

async function parseMaybeGzipJson(response, url) {
  if (!url.endsWith('.gz')) return response.json();
  const buf = await response.arrayBuffer();
  if (typeof DecompressionStream === 'undefined') {
    if (!_pakoLoadPromise) {
      _pakoLoadPromise = new Promise((resolve, reject) => {
        if (window.pako?.inflate) {
          resolve(window.pako);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          if (window.pako?.inflate) resolve(window.pako);
          else reject(new Error('pako loaded but inflate() is unavailable.'));
        };
        script.onerror = () => reject(new Error('Failed to load pako gzip fallback library.'));
        document.head.appendChild(script);
      });
    }
    const pako = await _pakoLoadPromise;
    const inflated = pako.inflate(new Uint8Array(buf), { to: 'string' });
    return JSON.parse(inflated);
  }
  const ds = new DecompressionStream('gzip');
  const decompressed = new Blob([buf]).stream().pipeThrough(ds);
  const text = await new Response(decompressed).text();
  return JSON.parse(text);
}

async function fetchManifest(signal) {
  if (!DATA_BASE) return null;
  if (_manifestPromise) return _manifestPromise;

  const urls = buildDataUrls(DATA_MANIFEST_PATH);
  _manifestPromise = (async () => {
    let lastError = null;
    for (const url of urls) {
      const { signal: combinedSignal, cleanup } = buildSignalWithTimeout(signal, STATIC_FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(url, { signal: combinedSignal });
        if (!response.ok) {
          lastError = new Error(`Static manifest fetch failed (${response.status}) at ${url}.`);
          continue;
        }
        return response.json();
      } catch (error) {
        lastError = error;
      } finally {
        cleanup();
      }
    }
    throw lastError || new Error('Static manifest fetch failed from all data origins.');
  })();

  try {
    return await _manifestPromise;
  } catch (error) {
    _manifestPromise = null;
    throw error;
  }
}

async function loadStaticPositions(ids, startISO, endISO, step, frame, signal) {
  const frameValue = String(frame || 'GSE').toUpperCase();
  if (!DATA_BASE) return { payload: {}, completeIds: new Set(), usedStatic: false };

  const manifest = await fetchManifest(signal);
  if (!manifest) return { payload: {}, completeIds: new Set(), usedStatic: false };

  const manifestTemplate = manifest.path_template || STATIC_PATH_TEMPLATE;
  const template = (typeof manifestTemplate === 'string' && manifestTemplate.includes('{frame}'))
    ? manifestTemplate
    : STATIC_PATH_TEMPLATE;
  const supportsFramedChunks = typeof template === 'string' && template.includes('{frame}');
  if (frameValue !== 'GSE' && !supportsFramedChunks) {
    return { payload: {}, completeIds: new Set(), usedStatic: false };
  }
  const months = monthKeysInRange(startISO, endISO);
  const payload = {};
  const completeIds = new Set();

  await Promise.all(
    ids.map(async (id) => {
      const available = availableMonthsFromManifest(manifest, step, frameValue, id);
      if (!available) {
        payload[id] = [];
        return;
      }

      const required = months.filter((ym) => available.has(ym));
      const missing = months.filter((ym) => !available.has(ym));
      let hadChunkError = false;
      const chunkRows = await Promise.all(required.map(async (ym) => {
        const path = chunkPath(step, frameValue, id, ym, template);
        const urls = buildDataUrls(path);
        const cacheKey = urls[0] || path;
        let promise = _chunkPromiseCache.get(cacheKey);
        if (!promise) {
          promise = (async () => {
            let lastError = null;
            for (const url of urls) {
              const { signal: combinedSignal, cleanup } = buildSignalWithTimeout(signal, STATIC_FETCH_TIMEOUT_MS);
              try {
                const response = await fetch(url, { signal: combinedSignal });
                if (!response.ok) {
                  lastError = new Error(`HTTP ${response.status}`);
                  continue;
                }
                const decoded = await parseMaybeGzipJson(response, url);
                return normalizeRows(rowsForIdFromChunk(decoded, id));
              } catch (error) {
                lastError = error;
              } finally {
                cleanup();
              }
            }
            throw lastError || new Error('Static chunk fetch failed from all data origins.');
          })();
          _chunkPromiseCache.set(cacheKey, promise);
        }

        try {
          return await promise;
        } catch (error) {
          hadChunkError = true;
          _chunkPromiseCache.delete(cacheKey);
          if (!isAbortError(error)) {
            console.warn(`[SC Viewer] Static chunk fetch/decode failed for ${id} ${ym}.`, error);
          }
          return [];
        }
      }));

      const merged = chunkRows.reduce((acc, rows) => mergeByEpoch(acc, rows), []);
      payload[id] = merged;
      if (missing.length === 0 && !hadChunkError) completeIds.add(id);
    })
  );

  return { payload, completeIds, usedStatic: true };
}

async function loadStaticBodyPositions(ids, startISO, endISO, step, frame, signal) {
  const frameValue = String(frame || 'GSE').toUpperCase();
  if (!DATA_BASE) return { payload: {}, completeIds: new Set(), usedStatic: false };

  const manifest = await fetchManifest(signal);
  if (!manifest) return { payload: {}, completeIds: new Set(), usedStatic: false };

  const manifestTemplate = manifest?.bodies?.path_template || BODY_STATIC_PATH_TEMPLATE;
  const template = (typeof manifestTemplate === 'string' && manifestTemplate.includes('{frame}'))
    ? manifestTemplate
    : BODY_STATIC_PATH_TEMPLATE;
  const months = monthKeysInRange(startISO, endISO);
  const payload = {};
  const completeIds = new Set();

  await Promise.all(
    ids.map(async (id) => {
      const available = availableBodyMonthsFromManifest(manifest, step, frameValue, id);
      if (!available) {
        payload[id] = [];
        return;
      }

      const required = months.filter((ym) => available.has(ym));
      const missing = months.filter((ym) => !available.has(ym));
      let hadChunkError = false;
      const chunkRows = await Promise.all(required.map(async (ym) => {
        const path = chunkPath(step, frameValue, id, ym, template);
        const urls = buildDataUrls(path);
        const cacheKey = urls[0] || path;
        let promise = _chunkPromiseCache.get(cacheKey);
        if (!promise) {
          promise = (async () => {
            let lastError = null;
            for (const url of urls) {
              const { signal: combinedSignal, cleanup } = buildSignalWithTimeout(signal, STATIC_FETCH_TIMEOUT_MS);
              try {
                const response = await fetch(url, { signal: combinedSignal });
                if (!response.ok) {
                  lastError = new Error(`HTTP ${response.status}`);
                  continue;
                }
                const decoded = await parseMaybeGzipJson(response, url);
                return normalizeRows(rowsForIdFromChunk(decoded, id));
              } catch (error) {
                lastError = error;
              } finally {
                cleanup();
              }
            }
            throw lastError || new Error('Static body chunk fetch failed from all data origins.');
          })();
          _chunkPromiseCache.set(cacheKey, promise);
        }

        try {
          return await promise;
        } catch (error) {
          hadChunkError = true;
          _chunkPromiseCache.delete(cacheKey);
          if (!isAbortError(error)) {
            console.warn(`[SC Viewer] Static body chunk fetch/decode failed for ${id} ${ym}.`, error);
          }
          return [];
        }
      }));

      const merged = chunkRows.reduce((acc, rows) => mergeByEpoch(acc, rows), []);
      payload[id] = merged;
      if (missing.length === 0 && !hadChunkError) completeIds.add(id);
    })
  );

  return { payload, completeIds, usedStatic: true };
}

async function fetchApiPositions(ids, startISO, endISO, step = '1h', frame = 'GSE', signal) {
  const idsValue = Array.isArray(ids) ? ids.join(',') : ids;
  const url = buildApiUrl('/positions', {
    ids: idsValue,
    start: startISO,
    end: endISO,
    step,
    frame,
  });
  const { signal: combinedSignal, cleanup } = buildSignalWithTimeout(signal, API_FALLBACK_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { signal: combinedSignal });
  } finally {
    cleanup();
  }
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

function shouldRetryPositionsError(error) {
  const msg = String(error?.message || '');
  return msg.includes('Positions fetch failed (502)') || msg.includes('Positions fetch failed (503)') || msg.includes('Positions fetch failed (504)');
}

async function fetchApiPositionsWithRetry(ids, startISO, endISO, step = '1h', frame = 'GSE', signal) {
  const attempts = [0, 400, 1200];
  let lastError = null;
  for (let i = 0; i < attempts.length; i += 1) {
    if (attempts[i] > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempts[i]));
    }
    try {
      return await fetchApiPositions(ids, startISO, endISO, step, frame, signal);
    } catch (error) {
      lastError = error;
      if (!shouldRetryPositionsError(error) || i === attempts.length - 1) throw error;
    }
  }
  throw lastError || new Error('Unknown positions fetch failure.');
}

async function transformTracksFrame(tracksById, frameIn, frameOut, signal) {
  const frameSource = String(frameIn || 'GSE').toUpperCase();
  const frameTarget = String(frameOut || 'GSE').toUpperCase();
  if (frameSource === frameTarget) return tracksById;
  const url = buildApiUrl('/transform', {});
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      frame_in: frameSource,
      frame_out: frameTarget,
      tracks: tracksById,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Frame transform failed (${response.status}): ${body || 'no response body'}`);
  }
  const payload = await response.json();
  const normalized = {};
  for (const [key, value] of Object.entries(payload)) {
    normalized[key] = Array.isArray(value) ? value.map(normalizePoint) : [];
  }
  return normalized;
}

async function fetchPositionsFrame(ids, startISO, endISO, step = '1h', frame = 'GSE', signal) {
  const idList = Array.isArray(ids) ? ids : String(ids).split(',').map((s) => s.trim()).filter(Boolean);
  const uniqueIds = Array.from(new Set(idList));
  const frameValue = String(frame || 'GSE').toUpperCase();

  let staticResult = { payload: {}, completeIds: new Set(), usedStatic: false };
  try {
    staticResult = await loadStaticPositions(uniqueIds, startISO, endISO, step, frameValue, signal);
  } catch (error) {
    console.warn('[SC Viewer] Static data load failed; falling back to API.', error);
  }

  const missingIds = uniqueIds.filter((id) => !staticResult.completeIds.has(id));
  const apiPayload = {};
  if (missingIds.length) {
    let firstError = null;
    try {
      const chunk = await fetchApiPositionsWithRetry(missingIds, startISO, endISO, step, frameValue, signal);
      for (const id of missingIds) {
        apiPayload[id] = Array.isArray(chunk[id]) ? chunk[id] : [];
      }
    } catch (error) {
      firstError = error;
      for (const id of missingIds) apiPayload[id] = [];
    }

    const hasStaticRows = Object.values(staticResult.payload || {}).some(
      (rows) => Array.isArray(rows) && rows.length > 0
    );
    const hasApiRows = Object.values(apiPayload || {}).some(
      (rows) => Array.isArray(rows) && rows.length > 0
    );
    if (firstError && !hasStaticRows && !hasApiRows) throw firstError;
    if (firstError && !isAbortError(firstError)) console.warn('[SC Viewer] API fallback failed; returning static-only data.', firstError);
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

async function fetchPositions(ids, startISO, endISO, step = '1h', frame = 'GSE', signal) {
  const frameValue = String(frame || 'GSE').toUpperCase();
  const idList = Array.isArray(ids) ? ids : String(ids).split(',').map((s) => s.trim()).filter(Boolean);
  const uniqueIds = Array.from(new Set(idList));

  if (frameValue === 'GSE') {
    return fetchPositionsFrame(uniqueIds, startISO, endISO, step, 'GSE', signal);
  }

  let shouldTryDirectFrame = true;
  if (DATA_BASE) {
    try {
      const manifest = await fetchManifest(signal);
      const template = manifest?.path_template || STATIC_PATH_TEMPLATE;
      const supportsFramedChunks = typeof template === 'string' && template.includes('{frame}');
      const manifestFrames = Array.isArray(manifest?.frames)
        ? manifest.frames.map((value) => String(value).toUpperCase())
        : [];
      if (!supportsFramedChunks || !manifestFrames.includes(frameValue)) {
        shouldTryDirectFrame = false;
      }
    } catch (_error) {
      // If manifest cannot be read here, keep existing behavior and let fetchPositionsFrame decide.
    }
  }

  let framePayload = {};
  if (shouldTryDirectFrame) {
    try {
      framePayload = await fetchPositionsFrame(uniqueIds, startISO, endISO, step, frameValue, signal);
    } catch (error) {
      console.warn(`[SC Viewer] ${frameValue} direct fetch failed; falling back to GSE+transform.`, error);
      framePayload = Object.fromEntries(uniqueIds.map((id) => [id, []]));
    }
  } else {
    framePayload = Object.fromEntries(uniqueIds.map((id) => [id, []]));
  }

  const missingIds = uniqueIds.filter((id) => !Array.isArray(framePayload[id]) || framePayload[id].length === 0);
  if (!missingIds.length) return framePayload;

  let gseFallback = {};
  try {
    gseFallback = await fetchPositionsFrame(missingIds, startISO, endISO, step, 'GSE', signal);
  } catch (error) {
    const hasFrameRows = Object.values(framePayload || {}).some((rows) => Array.isArray(rows) && rows.length > 0);
    if (hasFrameRows) {
      console.warn('[SC Viewer] GSE fallback failed; returning partial frame payload.', error);
      return framePayload;
    }
    throw error;
  }

  let transformedFallback = {};
  try {
    transformedFallback = await transformTracksFrame(gseFallback, 'GSE', frameValue, signal);
  } catch (error) {
    const hasFrameRows = Object.values(framePayload || {}).some((rows) => Array.isArray(rows) && rows.length > 0);
    if (hasFrameRows) {
      console.warn('[SC Viewer] Frame transform fallback failed; returning partial frame payload.', error);
      return framePayload;
    }
    throw error;
  }

  const merged = { ...framePayload };
  for (const id of missingIds) {
    const base = Array.isArray(framePayload[id]) ? framePayload[id] : [];
    const fallback = Array.isArray(transformedFallback[id]) ? transformedFallback[id] : [];
    merged[id] = mergeByEpoch(base, fallback);
  }
  return merged;
}

async function fetchPlanetPositions(ids, startISO, endISO, step = '1h', frame = 'GSE', signal) {
  const idsList = Array.isArray(ids) ? ids : String(ids).split(',').map((s) => s.trim()).filter(Boolean);
  const cleanIds = idsList.map((id) => String(id).toUpperCase()).filter((id) => PLANET_IDS.includes(id));
  if (!cleanIds.length) return {};
  return fetchBodyPositions(cleanIds, startISO, endISO, step, frame, signal);
}

async function fetchApiBodyPositions(ids, startISO, endISO, step = '1h', frame = 'GSE', signal) {
  const frameValue = String(frame || 'GSE').toUpperCase();
  const idsValue = Array.isArray(ids) ? ids.join(',') : ids;
  const url = buildApiUrl('/planets', { ids: idsValue, start: startISO, end: endISO, step, frame: frameValue });
  const { signal: combinedSignal, cleanup } = buildSignalWithTimeout(signal, API_FALLBACK_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { signal: combinedSignal });
  } finally {
    cleanup();
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Body positions fetch failed (${response.status}): ${body || 'no response body'}`);
  }
  const payload = await response.json();
  const normalized = {};
  for (const [key, value] of Object.entries(payload)) {
    normalized[key] = Array.isArray(value) ? value.map(normalizePoint) : [];
  }
  return normalized;
}

async function fetchBodyPositions(ids, startISO, endISO, step = '1h', frame = 'GSE', signal) {
  const idsList = Array.isArray(ids) ? ids : String(ids).split(',').map((s) => s.trim()).filter(Boolean);
  const cleanIds = Array.from(new Set(idsList.map((id) => String(id).toUpperCase()).filter((id) => BODY_IDS.includes(id))));
  if (!cleanIds.length) return {};
  const frameValue = String(frame || 'GSE').toUpperCase();

  let staticResult = { payload: {}, completeIds: new Set(), usedStatic: false };
  try {
    staticResult = await loadStaticBodyPositions(cleanIds, startISO, endISO, step, frameValue, signal);
  } catch (error) {
    if (!isAbortError(error)) console.warn('[SC Viewer] Static body data load failed; falling back to API.', error);
  }

  const missingIds = cleanIds.filter((id) => !staticResult.completeIds.has(id));
  const apiPayload = {};
  if (missingIds.length) {
    let firstError = null;
    try {
      const chunk = await fetchApiBodyPositions(missingIds, startISO, endISO, step, frameValue, signal);
      for (const id of missingIds) {
        apiPayload[id] = Array.isArray(chunk[id]) ? chunk[id] : [];
      }
    } catch (error) {
      firstError = error;
      for (const id of missingIds) apiPayload[id] = [];
    }

    const hasStaticRows = Object.values(staticResult.payload || {}).some((rows) => Array.isArray(rows) && rows.length > 0);
    const hasApiRows = Object.values(apiPayload || {}).some((rows) => Array.isArray(rows) && rows.length > 0);
    if (firstError && !hasStaticRows && !hasApiRows) throw firstError;
    if (firstError && !isAbortError(firstError)) console.warn('[SC Viewer] Body API fallback failed; returning static-only data.', firstError);
  }

  const merged = {};
  for (const id of cleanIds) {
    const fromStatic = staticResult.payload[id] || [];
    const fromApi = apiPayload[id] || [];
    merged[id] = clipRowsToWindow(mergeByEpoch(fromStatic, fromApi), startISO, endISO);
  }
  return merged;
}

async function fetchMoonPositions(startISO, endISO, step = '1h', frame = 'GSE', signal) {
  const payload = await fetchBodyPositions([MOON_ID], startISO, endISO, step, frame, signal);
  return payload[MOON_ID] || [];
}

async function generatePositions(sc, startISO, endISO, step = '1h', frame = 'GSE', signal) {
  const payload = await fetchPositions([sc.id], startISO, endISO, step, frame, signal);
  return payload[sc.id] || [];
}

async function generateYear(ids, year, step = '1h', frame = 'GSE', signal) {
  const idsValue = Array.isArray(ids) ? ids.join(',') : ids;
  const url = buildApiUrl('/positions/year', { ids: idsValue, year, step, frame: String(frame || 'GSE').toUpperCase() });
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
  MOON_ID,
  fetchPositions,
  fetchPlanetPositions,
  fetchMoonPositions,
  generatePositions,
  generateYear,
  fetchCatalog,
};
