// Spacecraft catalog + API data layer for real GSE positions.
// Backend contract:
//   GET /positions?ids=DSCOVR,ACE&start=...&end=...&step=1h
//   GET /positions/year?ids=DSCOVR&year=2025&step=1h
//   GET /catalog

const AU_KM = 149597870.7;
const RE_KM = 6378.137;
const L1_KM = 1_500_000;
const L2_KM = -1_500_000;
const MOON_KM = 384_400;

// Set this from HTML before loading this file:
//   <script>window.SC_API_BASE = "https://your-backend.example.com";</script>
const API_BASE = (window.SC_API_BASE || 'http://localhost:8000').replace(/\/+$/, '');

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

function buildUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  return url.toString();
}

function normalizePoint(p) {
  return {
    t: p.t,
    x: Number(p.x),
    y: Number(p.y),
    z: Number(p.z),
  };
}

async function fetchPositions(ids, startISO, endISO, step = '1h', signal) {
  const idsValue = Array.isArray(ids) ? ids.join(',') : ids;
  const url = buildUrl('/positions', {
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

async function fetchPlanetPositions(ids, startISO, endISO, step = '1h', signal) {
  const idsList = Array.isArray(ids) ? ids : String(ids).split(',').map((s) => s.trim()).filter(Boolean);
  const cleanIds = idsList.map((id) => String(id).toUpperCase()).filter((id) => PLANET_IDS.includes(id));
  if (!cleanIds.length) return {};
  const url = buildUrl('/planets', {
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
  const url = buildUrl('/positions/year', { ids: idsValue, year, step });
  return fetch(url, { signal });
}

async function fetchCatalog(signal) {
  const url = buildUrl('/catalog', {});
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
