// Main App — orchestrates state, fetches tracks, renders layout.

const {
  CATALOG: APP_CATALOG,
  PLANETS: APP_PLANETS,
  fetchPositions,
  fetchPlanetPositions,
  fetchMoonPositions,
  generateYear,
  AU_KM: APP_AU_KM,
  RE_KM: APP_RE_KM,
  L1_KM: APP_L1_KM,
  GROUPS: APP_GROUPS,
  API_BASE: APP_API_BASE,
} = window.SC_DATA;

const DEFAULT_SELECTION = new Set([
  'MMS1',
  'IMAP',
  'PSP',
]);

const SCALES = [
  { id: 'system',  name: 'Sun–Earth System', short: 'Sun–Earth', unit: 'AU', halfWidth: 1.15, center: { x: 0.5 * APP_AU_KM, y: 0, z: 0 } },
  { id: 'l1',      name: 'L1 Region',        short: 'L1',        unit: 'Re', halfWidth: 80, center: { x: APP_L1_KM, y: 0, z: 0 } },
];
const MOON_SCALE = {
  id: 'moonmag', name: 'Earth Magnetosphere', short: 'Earth Magnetosphere',
  unit: 'Re', halfWidth: 80, center: { x: 0, y: 0, z: 0 },
};

const MAX_WINDOW_DAYS = 31;
const ONE_DAY_MS = 86400_000;

function toInputDT(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function fromInputDT(s) {
  const parsed = new Date(`${s}:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}
function fmtUTC(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function getInitialTheme() {
  try {
    const saved = window.localStorage?.getItem('scviewer-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (_) {}
  return 'light';
}

function applyThemeToDocument(nextTheme) {
  document.documentElement.setAttribute('data-scviewer-theme', nextTheme);
  try {
    window.localStorage?.setItem('scviewer-theme', nextTheme);
  } catch (_) {}
}

function App() {
  const [theme, setTheme] = React.useState(getInitialTheme);
  const [startISO, setStartISO] = React.useState('2025-12-01T00:00:00.000Z');
  const [endISO, setEndISO]     = React.useState('2025-12-08T00:00:00.000Z');
  const [cadence, setCadence]   = React.useState('hourly');
  const [frame, setFrame] = React.useState('GSE');
  const [presetMode, setPresetMode] = React.useState('7d');
  const [selectedIds, setSelectedIds] = React.useState(DEFAULT_SELECTION);
  const [expandedGroups, setExpandedGroups] = React.useState(
    new Set(['solar_l1', 'inner_heli', 'magnetospheric', 'inner_magnetosphere', 'deep_space'])
  );
  const [flags, setFlags] = React.useState({
    showBS: true,
    showMP: true,
    showOrbits: false,
    showLabels: false,
    showL1L2: true,
    showMoon: false,
    showPlanets: false,
  });
  const [showLegend, setShowLegend] = React.useState(false);
  const [hoveredId, setHoveredId] = React.useState(null);
  const [selectedScId, setSelectedScId] = React.useState(null);
  const [sortKey, setSortKey] = React.useState('rSun_au');
  const [sortDir, setSortDir] = React.useState('asc');
  const [focusScale, setFocusScale] = React.useState(null);
  const [show3D, setShow3D] = React.useState(false);
  const [threeDScaleId, setThreeDScaleId] = React.useState('system');
  const [autoFitPairs, setAutoFitPairs] = React.useState(false);
  const [manualHalfWidths, setManualHalfWidths] = React.useState({});
  const [query, setQuery] = React.useState('');
  const [downloadUnit, setDownloadUnit] = React.useState('AU');
  const [rangeWarn, setRangeWarn] = React.useState(null);
  const [tracks, setTracks] = React.useState(new Map());
  const [planetTracks, setPlanetTracks] = React.useState({});
  const [moonTrack, setMoonTrack] = React.useState([]);
  const [tracksLoading, setTracksLoading] = React.useState(false);
  const [planetLoading, setPlanetLoading] = React.useState(false);
  const [moonLoading, setMoonLoading] = React.useState(false);
  const [tracksError, setTracksError] = React.useState(null);
  const [downloadingYear, setDownloadingYear] = React.useState(false);

  React.useLayoutEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((value) => {
      const next = value === 'dark' ? 'light' : 'dark';
      // Plot SVG/canvas renderers read the theme from documentElement.
      // Apply it synchronously so the same React render produces fresh plot colors.
      applyThemeToDocument(next);
      return next;
    });
  }, []);

  const durationDays = (new Date(endISO).getTime() - new Date(startISO).getTime()) / ONE_DAY_MS;
  const selectedList = React.useMemo(() => APP_CATALOG.filter(s => selectedIds.has(s.id)), [selectedIds]);
  const selectedIdsKey = React.useMemo(() => selectedList.map((sc) => sc.id).join(','), [selectedList]);
  const step = cadence === 'ten_min' ? '10m' : '1h';

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadTracks() {
      if (!selectedList.length) {
        setTracks(new Map());
        setTracksError(null);
        return;
      }

      setTracksLoading(true);
      setTracksError(null);

      try {
        const payload = await fetchPositions(
          selectedList.map((sc) => sc.id),
          startISO,
          endISO,
          step,
          frame,
          controller.signal
        );
        const next = new Map();
        for (const sc of selectedList) {
          const series = Array.isArray(payload[sc.id]) ? payload[sc.id] : [];
          next.set(sc.id, series);
        }
        setTracks(next);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        setTracksError(error?.message || 'Failed to load spacecraft positions from backend.');
        setTracks(new Map());
      } finally {
        if (!controller.signal.aborted) setTracksLoading(false);
      }
    }

    loadTracks();
    return () => controller.abort();
  }, [selectedIdsKey, startISO, endISO, step, frame]);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadPlanets() {
      if (!flags.showPlanets) {
        setPlanetTracks({});
        setPlanetLoading(false);
        return;
      }
      setPlanetLoading(true);
      try {
        const payload = await fetchPlanetPositions(
          APP_PLANETS.map((p) => p.id),
          startISO,
          endISO,
          step,
          frame,
          controller.signal
        );
        setPlanetTracks(payload);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        setTracksError(error?.message || 'Failed to load planet positions from backend.');
        setPlanetTracks({});
      } finally {
        if (!controller.signal.aborted) setPlanetLoading(false);
      }
    }

    loadPlanets();
    return () => controller.abort();
  }, [flags.showPlanets, startISO, endISO, step, frame]);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadMoon() {
      if (!flags.showMoon) {
        setMoonTrack([]);
        setMoonLoading(false);
        return;
      }
      setMoonLoading(true);
      try {
        const payload = await fetchMoonPositions(startISO, endISO, step, frame, controller.signal);
        setMoonTrack(Array.isArray(payload) ? payload : []);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        setTracksError(error?.message || 'Failed to load Moon positions from backend.');
        setMoonTrack([]);
      } finally {
        if (!controller.signal.aborted) setMoonLoading(false);
      }
    }

    loadMoon();
    return () => controller.abort();
  }, [flags.showMoon, startISO, endISO, step, frame]);

  const getAutoHalfWidth = React.useCallback((baseScale) => {
    if (!autoFitPairs) return baseScale.halfWidth;
    const allowedGroups =
      baseScale.id === 'system'
        ? new Set(['inner_heli'])
        : baseScale.id === 'l1'
          ? new Set(['solar_l1'])
          : baseScale.id === 'moonmag'
            ? new Set(['magnetospheric', 'inner_magnetosphere'])
            : null;
    if (!allowedGroups) return baseScale.halfWidth;
    const unitKm = baseScale.unit === 'AU' ? APP_AU_KM : APP_RE_KM;
    let maxAbs = 0;
    for (const sc of selectedList) {
      if (!allowedGroups.has(sc.group)) continue;
      const track = tracks.get(sc.id);
      if (!track || !track.length) continue;
      for (const p of track) {
        const dx = Math.abs((p.x - baseScale.center.x) / unitKm);
        const dy = Math.abs((p.y - baseScale.center.y) / unitKm);
        const dz = Math.abs((p.z - baseScale.center.z) / unitKm);
        maxAbs = Math.max(maxAbs, dx, dy, dz);
      }
    }
    if (maxAbs === 0) return baseScale.halfWidth;
    const padded = Math.max(baseScale.halfWidth, maxAbs * 1.08);
    if (baseScale.unit === 'Re') {
      return Math.ceil(padded * 2) / 2;
    }
    return padded;
  }, [autoFitPairs, selectedList, tracks]);

  const getRangeConfig = React.useCallback((scaleId) => {
    if (scaleId === 'system') return { min: 1, max: 5, step: 0.05, unit: 'AU' };
    if (scaleId === 'l1') return { min: 50, max: 150, step: 0.5, unit: 'Re' };
    if (scaleId === 'moonmag') return { min: 10, max: 100, step: 0.5, unit: 'Re' };
    return { min: 1, max: 200, step: 1, unit: '' };
  }, []);

  const getEffectiveHalfWidth = React.useCallback((baseScale) => {
    // Auto-fit has priority while enabled; manual ranges apply only when auto-fit is off.
    if (autoFitPairs) return getAutoHalfWidth(baseScale);
    const manual = manualHalfWidths[baseScale.id];
    if (Number.isFinite(manual)) return manual;
    return getAutoHalfWidth(baseScale);
  }, [autoFitPairs, manualHalfWidths, getAutoHalfWidth]);

  const setManualHalfWidth = React.useCallback((scaleId, nextValue) => {
    const cfg = getRangeConfig(scaleId);
    const n = Number(nextValue);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(cfg.max, Math.max(cfg.min, n));
    const snapped = Math.round(clamped / cfg.step) * cfg.step;
    setManualHalfWidths((prev) => ({
      ...prev,
      [scaleId]: Number(snapped.toFixed(cfg.step < 1 ? 2 : 1)),
    }));
  }, [getRangeConfig]);

  const clearManualHalfWidth = React.useCallback((scaleId) => {
    setManualHalfWidths((prev) => {
      if (!(scaleId in prev)) return prev;
      const next = { ...prev };
      delete next[scaleId];
      return next;
    });
  }, []);

  const ctx = {
    selected: selectedList,
    tracks,
    planets: APP_PLANETS,
    planetTracks,
    moonTrack,
    theme,
    frame,
    ...flags,
    hoveredId,
    selectedScId,
    startDate: startISO,
    endDate: endISO,
  };

  const rows = selectedList.flatMap(sc => {
    const track = tracks.get(sc.id);
    if (!track || track.length === 0) return [];
    const p = track[0];
    const rEarth = Math.sqrt(p.x**2 + p.y**2 + p.z**2);
    const rSun = Math.sqrt((p.x - APP_AU_KM)**2 + p.y**2 + p.z**2);
    return [{
      id: sc.id,
      name: sc.name,
      group: sc.group,
      x_km: p.x,
      y_km: p.y,
      z_km: p.z,
      rEarth_km: rEarth,
      rSun_au: rSun / APP_AU_KM,
    }];
  });

  rows.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const selectedSc = APP_CATALOG.find(s => s.id === selectedScId);
  const selectedSnapshot = selectedSc && tracks.get(selectedScId)
    ? tracks.get(selectedScId)[0]
    : null;
  const showInspector = Boolean(selectedSc && selectedSnapshot);

  const clampEnd = (startStr, endStr) => {
    const s = new Date(startStr).getTime();
    const e = new Date(endStr).getTime();
    if (e <= s) {
      setRangeWarn('End must be after start. Clamped to +1 day.');
      return new Date(s + ONE_DAY_MS).toISOString();
    }
    if ((e - s) / ONE_DAY_MS > MAX_WINDOW_DAYS) {
      setRangeWarn(`Window capped at ${MAX_WINDOW_DAYS} days. Use monthly presets for longer views.`);
      return new Date(s + MAX_WINDOW_DAYS * ONE_DAY_MS).toISOString();
    }
    setRangeWarn(null);
    return endStr;
  };

  const onDateChange = (k, v) => {
    const iso = fromInputDT(v);
    if (!iso) return;
    setPresetMode('custom');
    if (k === 'start') {
      setStartISO(iso);
      setEndISO(prev => clampEnd(iso, prev));
    } else {
      setEndISO(clampEnd(startISO, iso));
    }
  };

  const setPresetMonth = (offset) => {
    const ref = new Date(startISO);
    const y = ref.getUTCFullYear();
    const m = ref.getUTCMonth() + offset;
    const first = new Date(Date.UTC(y, m, 1));
    const next = new Date(Date.UTC(y, m + 1, 1));
    const end = new Date(Math.min(next.getTime(), first.getTime() + MAX_WINDOW_DAYS * ONE_DAY_MS));
    setStartISO(first.toISOString());
    setEndISO(end.toISOString());
    setPresetMode('month');
    setRangeWarn(null);
  };

  const shiftWindow = (offset) => {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const durMs = e.getTime() - s.getTime();
    if (presetMode === '24h' || presetMode === '7d') {
      setStartISO(new Date(s.getTime() + offset * durMs).toISOString());
      setEndISO(new Date(e.getTime() + offset * durMs).toISOString());
      setRangeWarn(null);
      return;
    }

    const y = s.getUTCFullYear();
    const m = s.getUTCMonth() + offset;
    const first = new Date(Date.UTC(y, m, 1));
    const next = new Date(Date.UTC(y, m + 1, 1));
    const monthEnd = new Date(Math.min(next.getTime(), first.getTime() + MAX_WINDOW_DAYS * ONE_DAY_MS));
    setStartISO(first.toISOString());
    setEndISO(monthEnd.toISOString());
    if (presetMode !== 'month') setPresetMode('month');
    setRangeWarn(null);
  };

  const setPreset = (days) => {
    const now = new Date(startISO);
    now.setUTCHours(0,0,0,0);
    const s = now.toISOString();
    const e = new Date(now.getTime() + days * ONE_DAY_MS).toISOString();
    setStartISO(s);
    setEndISO(e);
    setPresetMode(days === 1 ? '24h' : '7d');
    setRangeWarn(null);
  };

  const toggleSc = (id) => setSelectedIds(s => {
    const ns = new Set(s);
    if (ns.has(id)) ns.delete(id);
    else ns.add(id);
    return ns;
  });

  const toggleGroup = (gk, on) => setSelectedIds(s => {
    const ns = new Set(s);
    for (const sc of APP_CATALOG) if (sc.group === gk) { if (on) ns.add(sc.id); else ns.delete(sc.id); }
    return ns;
  });

  const toggleExpand = (gk) => setExpandedGroups(s => {
    const ns = new Set(s);
    if (ns.has(gk)) ns.delete(gk);
    else ns.add(gk);
    return ns;
  });

  const onFlag = (k, v) => setFlags(f => ({ ...f, [k]: v }));

  const onSort = (k) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  React.useEffect(() => {
    if (!selectedIds.has(selectedScId) && selectedList.length) {
      setSelectedScId(selectedList[0].id);
    }
  }, [selectedIdsKey]);

  const downloadTrajectory = () => {
    const unit = downloadUnit;
    const conv = unit === 'AU' ? APP_AU_KM : unit === 'Re' ? APP_RE_KM : 1;
    const uSuf = unit === 'km' ? 'km' : unit === 'AU' ? 'AU' : 'Re';
    const lines = [];
    lines.push(`# Spacecraft Location Viewer — trajectory export`);
    lines.push(`# Window: ${fmtUTC(startISO)} -> ${fmtUTC(endISO)}`);
    lines.push(`# Cadence: ${cadence === 'ten_min' ? '10 minutes' : 'hourly'}`);
    lines.push(`# Frame: ${frame}`);
    lines.push(`# Units: ${uSuf}`);
    lines.push(`# Source: ${APP_API_BASE}`);
    lines.push(`id,name,group,epoch_utc,x_${uSuf},y_${uSuf},z_${uSuf}`);
    for (const sc of selectedList) {
      const track = tracks.get(sc.id);
      if (!track || track.length === 0) continue;
      for (const p of track) {
        const epoch = typeof p.t === 'string' ? p.t : new Date(p.t).toISOString();
        lines.push([
          sc.id, JSON.stringify(sc.name), APP_GROUPS[sc.group].label, epoch,
          (p.x / conv).toExponential(6),
          (p.y / conv).toExponential(6),
          (p.z / conv).toExponential(6),
        ].join(','));
      }
    }
    download(
      `spacecraft-trajectory_${uSuf}_${frame.toLowerCase()}_${isoForFile(startISO)}_${isoForFile(endISO)}.csv`,
      lines.join('\n')
    );
  };

  const downloadYear = async () => {
    const ref = new Date(startISO);
    const year = ref.getUTCFullYear();
    if (!selectedList.length) return;
    setDownloadingYear(true);
    setTracksError(null);
    try {
      const response = await generateYear(selectedList.map((sc) => sc.id), year, step, frame);
      if (!response.ok) throw new Error(`Year export failed (${response.status})`);
      const raw = await response.text();
      const converted = convertYearCsvUnits(raw, downloadUnit);
      const suffix = downloadUnit === 'Re' ? 'Re' : downloadUnit;
      const blob = new Blob([converted], { type: 'text/csv;charset=utf-8' });
      downloadBlob(`spacecraft-trajectory_${suffix}_${frame.toLowerCase()}_${year}_full-year.csv`, blob);
    } catch (error) {
      setTracksError(error?.message || 'Year export failed.');
    } finally {
      setDownloadingYear(false);
    }
  };

  const subplotRefs = React.useRef({});
  const scrollToPanel = (key) => {
    const el = subplotRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 900);
  };

  return (
    <div className={`app theme-${theme}`}>
      <header className="topbar">
        <div className="brand">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <circle cx="11" cy="11" r="3.2" fill="oklch(0.58 0.17 245)"/>
            <circle cx="18" cy="11" r="1.6" fill="oklch(0.82 0.15 85)"/>
            <line x1="3" y1="11" x2="20" y2="11" stroke="oklch(0.35 0.01 260)" strokeWidth="0.6" strokeDasharray="1.5 2"/>
          </svg>
          <h1>Spacecraft Location Viewer</h1>
          <span className="subtitle">Spacecraft locations · multi-mission</span>
        </div>

        <ScPicker
          selectedScId={selectedScId}
          onSelect={(id) => {
            setSelectedScId(id);
            setSelectedIds(s => s.has(id) ? s : new Set([...s, id]));
          }}
          query={query}
          setQuery={setQuery}
        />

        <div className="mock-banner" title={`API source: ${APP_API_BASE}`}>
          <span className="pulse" /> LIVE API
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
        </button>
      </header>

      <div className={showInspector ? 'main with-inspector' : 'main'}>
        <Sidebar
          startISO={startISO}
          endISO={endISO}
          onDateChange={onDateChange}
          cadence={cadence}
          setCadence={setCadence}
          frame={frame}
          setFrame={setFrame}
          durationDays={durationDays}
          rangeWarn={rangeWarn}
          onPresetMonth={setPresetMonth}
          onShiftWindow={shiftWindow}
          onPreset={setPreset}
          activePreset={presetMode}
          selectedIds={selectedIds}
          onToggle={toggleSc}
          onToggleGroup={toggleGroup}
          expandedGroups={expandedGroups}
          onToggleExpand={toggleExpand}
          {...flags}
          onFlag={onFlag}
          showLegend={showLegend}
          setShowLegend={setShowLegend}
          autoFitPairs={autoFitPairs}
          setAutoFitPairs={setAutoFitPairs}
          selectedScId={selectedScId}
          onFocusSc={setSelectedScId}
          downloadUnit={downloadUnit}
          setDownloadUnit={setDownloadUnit}
          onDownloadTrajectory={downloadTrajectory}
          onDownloadYear={downloadYear}
        />

        <div className="canvas">
          {(tracksError || downloadingYear) && (
            <div className="warn" style={{ margin: '10px 0 8px' }}>
              {downloadingYear && 'Preparing full-year CSV export...'}
              {tracksError && `Backend error: ${tracksError}`}
            </div>
          )}
          {(tracksLoading || planetLoading || moonLoading) && (
            <div className="loading-overlay" role="status" aria-live="polite">
              <span className="loading-spinner" />
              <span>{(planetLoading || moonLoading) ? `Loading ${frame} trajectories and reference bodies...` : `Loading ${frame} trajectories...`}</span>
            </div>
          )}

          <div className="inspect-bar">
            <label className="inspect-label">Inspect spacecraft</label>
            <select className="inspect-select"
              value={selectedScId || ''}
              onChange={e => setSelectedScId(e.target.value || null)}>
              <option value="">— None (full-width plots) —</option>
              {selectedList.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name} · {APP_GROUPS[sc.group].label}</option>
              ))}
            </select>
            {selectedSc && (
              <button className="inspect-clear" onClick={() => setSelectedScId(null)} title="Hide inspector">Hide inspector ×</button>
            )}
            <button className={'inspect-3d-toggle' + (show3D ? ' on' : '')} onClick={() => setShow3D((v) => !v)} title="Toggle interactive 3D">
              {show3D ? 'Hide 3D' : 'Show 3D'}
            </button>
          </div>

          {show3D && (
            <ThreeDPanel
              scales={[...SCALES, MOON_SCALE]}
              selectedScaleId={threeDScaleId}
              onScaleChange={setThreeDScaleId}
              ctx={ctx}
            />
          )}

          <div className="quicknav">
            <span className="qn-label">Jump to</span>
            {SCALES.map(sc => (
              <button key={sc.id} className="qn-btn" onClick={() => scrollToPanel(`${sc.id}-row`)}>
                <span>{sc.short}</span>
              </button>
            ))}
            <button className="qn-btn" onClick={() => scrollToPanel('moonmag-row')}>
              <span>Earth Magnetosphere</span>
            </button>
          </div>

          {SCALES.map(sc => {
            const tuned = { ...sc, halfWidth: getEffectiveHalfWidth(sc) };
            const rangeConfig = getRangeConfig(sc.id);
            return (
              <div key={sc.id} className="plot-row" ref={el => subplotRefs.current[`${sc.id}-row`] = el}>
                <PlotPanel scale={{ ...tuned, plane: 'xy' }} ctx={ctx} showLegend={showLegend}
                  onHover={setHoveredId} onSelect={setSelectedScId} onFocus={(s) => setFocusScale(s)}
                  rangeConfig={rangeConfig}
                  onSetHalfWidth={setManualHalfWidth}
                  onResetHalfWidth={clearManualHalfWidth}
                  hasManualHalfWidth={Number.isFinite(manualHalfWidths[sc.id])}
                />
                <PlotPanel scale={{ ...tuned, plane: 'xz' }} ctx={ctx} showLegend={showLegend}
                  onHover={setHoveredId} onSelect={setSelectedScId} onFocus={(s) => setFocusScale(s)}
                  rangeConfig={rangeConfig}
                  onSetHalfWidth={setManualHalfWidth}
                  onResetHalfWidth={clearManualHalfWidth}
                  hasManualHalfWidth={Number.isFinite(manualHalfWidths[sc.id])}
                />
              </div>
            );
          })}

          <div className="plot-row" ref={el => subplotRefs.current['moonmag-row'] = el}>
            <PlotPanel scale={{ ...MOON_SCALE, halfWidth: getEffectiveHalfWidth(MOON_SCALE), plane: 'xy' }} ctx={ctx} showLegend={showLegend}
              onHover={setHoveredId} onSelect={setSelectedScId} onFocus={(s) => setFocusScale(s)}
              rangeConfig={getRangeConfig(MOON_SCALE.id)}
              onSetHalfWidth={setManualHalfWidth}
              onResetHalfWidth={clearManualHalfWidth}
              hasManualHalfWidth={Number.isFinite(manualHalfWidths[MOON_SCALE.id])}
            />
            <PlotPanel scale={{ ...MOON_SCALE, halfWidth: getEffectiveHalfWidth(MOON_SCALE), plane: 'xz' }} ctx={ctx} showLegend={showLegend}
              onHover={setHoveredId} onSelect={setSelectedScId} onFocus={(s) => setFocusScale(s)}
              rangeConfig={getRangeConfig(MOON_SCALE.id)}
              onSetHalfWidth={setManualHalfWidth}
              onResetHalfWidth={clearManualHalfWidth}
              hasManualHalfWidth={Number.isFinite(manualHalfWidths[MOON_SCALE.id])}
            />
          </div>

          <PositionsTable
            rows={rows}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            onSelect={setSelectedScId}
            selectedId={selectedScId}
          />
        </div>

        {showInspector && (
          <Inspector
            sc={selectedSc}
            snapshot={selectedSnapshot}
            rows={rows}
            frame={frame}
            onSelectSc={setSelectedScId}
            epochLabel={fmtUTC(startISO)}
            onClose={() => setSelectedScId(null)}
          />
        )}
      </div>

      {focusScale && (
        <div className="modal" onClick={() => setFocusScale(null)}>
          <div className="modal-inner" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setFocusScale(null)}>×</button>
            <FocusPanel scale={focusScale} ctx={ctx} showLegend={showLegend} />
          </div>
        </div>
      )}
    </div>
  );
}

function ThreeDPanel({ scales, selectedScaleId, onScaleChange, ctx }) {
  const scale = scales.find((s) => s.id === selectedScaleId) || scales[0];
  const shellRef = React.useRef(null);
  const hostRef = React.useRef(null);
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [copyState, setCopyState] = React.useState('');
  const copyStateTimerRef = React.useRef(null);

  React.useEffect(() => {
    if (!hostRef.current) return;
    if (!window.SC_PLOT?.build3DPlot) {
      hostRef.current.innerHTML = '<div style="padding:12px;font:12px ui-monospace,Menlo,monospace;color:#8b0000">3D renderer not available.</div>';
      return;
    }
    hostRef.current.innerHTML = '<div style="padding:12px;font:12px ui-monospace,Menlo,monospace;color:#374151">Rendering 3D view...</div>';
    const teardown = window.SC_PLOT.build3DPlot(hostRef.current, scale, ctx);
    return () => {
      if (typeof teardown === 'function') teardown();
    };
  }, [selectedScaleId, ctx.selected, ctx.tracks, ctx.planetTracks, ctx.moonTrack, ctx.theme, ctx.showPlanets, ctx.showMoon, ctx.showBS, ctx.showMP, ctx.showLabels, ctx.showL1L2, ctx.selectedScId]);

  React.useEffect(() => {
    const onFs = () => setIsMaximized(document.fullscreenElement === shellRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  React.useEffect(() => () => {
    if (copyStateTimerRef.current) clearTimeout(copyStateTimerRef.current);
  }, []);

  const setCopyFeedback = (text) => {
    setCopyState(text);
    if (copyStateTimerRef.current) clearTimeout(copyStateTimerRef.current);
    copyStateTimerRef.current = setTimeout(() => setCopyState(''), 1400);
  };

  const getThreeDPngBlob = async () => {
    if (!hostRef.current) return null;
    const canvas = hostRef.current.querySelector('canvas');
    if (!canvas) return null;
    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob || null), 'image/png');
    });
  };

  const savePng = () => {
    getThreeDPngBlob().then((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `spacecraft-3d-${scale.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };

  const copyPng = async () => {
    try {
      const blob = await getThreeDPngBlob();
      if (!blob) return;
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        setCopyFeedback('Copied');
        return;
      }
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `spacecraft-3d-${scale.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setCopyFeedback('Saved');
    } catch (err) {
      console.warn('3D copy failed', err);
      setCopyFeedback('Copy failed');
    }
  };

  const saveSvg = () => {
    if (!hostRef.current) return;
    const canvas = hostRef.current.querySelector('canvas');
    if (!canvas) return;
    const png = canvas.toDataURL('image/png');
    const w = canvas.width;
    const h = canvas.height;
    const svg = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
      `<image href="${png}" width="${w}" height="${h}" />`,
      `</svg>`,
    ].join('');
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(`spacecraft-3d-${scale.id}.svg`, blob);
  };

  const toggleMaximize = async () => {
    const node = shellRef.current;
    if (!node) return;
    if (document.fullscreenElement === node) {
      await document.exitFullscreen();
      return;
    }
    if (node.requestFullscreen) await node.requestFullscreen();
  };

  return (
    <section
      ref={shellRef}
      className="three3d-shell"
      style={{
        display: 'block',
        background: 'var(--paper)',
        border: '1px solid var(--rule)',
        borderRadius: '8px',
        overflow: 'hidden',
        minHeight: '612px',
      }}
    >
      <div
        className="three3d-head"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '10px 12px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div className="three3d-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
          <span className="plane-chip">3D</span>
          <span>Interactive XYZ View</span>
        </div>
        <div className="three3d-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <select className="panel-select" value={selectedScaleId} onChange={(e) => onScaleChange(e.target.value)}>
            {scales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={toggleMaximize} title="Maximize 3D">{isMaximized ? '⤡' : '⤢'}</button>
          <button onClick={saveSvg} title="Export 3D SVG">SVG</button>
          <button onClick={savePng} title="Export 3D PNG">PNG</button>
          <button onClick={copyPng} title="Copy 3D PNG to clipboard">{copyState === 'Copied' ? 'COPIED' : 'COPY'}</button>
        </div>
      </div>
      <div
        ref={hostRef}
        className="three3d-host"
        style={{
          display: 'block',
          minHeight: '560px',
          height: '560px',
          background: 'var(--plot-bg)',
          overflow: 'auto',
          padding: '0',
        }}
      />
    </section>
  );
}

function isoForFile(iso) {
  return iso.slice(0, 16).replace(/[:]/g, '').replace('T', '_');
}

function convertYearCsvUnits(csvText, unit) {
  if (!csvText || unit === 'km') return csvText;
  const conv = unit === 'AU' ? APP_AU_KM : APP_RE_KM;
  const suffix = unit === 'Re' ? 'Re' : unit;
  const lines = csvText.split(/\r?\n/);
  if (!lines.length) return csvText;
  const out = [];
  out.push(`epoch_utc,x_${suffix},y_${suffix},z_${suffix},id`);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const parts = line.split(',');
    if (parts.length < 5) continue;
    const x = Number(parts[1]);
    const y = Number(parts[2]);
    const z = Number(parts[3]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    out.push(`${parts[0]},${(x / conv).toExponential(6)},${(y / conv).toExponential(6)},${(z / conv).toExponential(6)},${parts[4]}`);
  }
  return out.join('\n') + '\n';
}

function download(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ScPicker({ selectedScId, onSelect, query, setQuery }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const sc = APP_CATALOG.find(s => s.id === selectedScId);

  React.useEffect(() => {
    const close = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = APP_CATALOG.filter(s =>
    !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || APP_GROUPS[s.group].label.toLowerCase().includes(q)
  );

  return (
    <div className="scpicker" ref={wrapRef}>
      <button className="scpicker-btn" onClick={() => setOpen(o => !o)} title="Focus a spacecraft">
        <span className="dot" style={{background: sc ? `oklch(0.55 0.14 ${sc.hue ?? APP_GROUPS[sc.group].hue})` : 'var(--ink-4)'}} />
        <span className="scpicker-name">{sc ? sc.name : 'Pick spacecraft…'}</span>
        <span className="scpicker-chev">▾</span>
      </button>
      {open && (
        <div className="scpicker-pop">
          <input
            autoFocus
            className="scpicker-search"
            placeholder="Search spacecraft…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="scpicker-list">
            {filtered.length === 0 && <div className="scpicker-empty">No match</div>}
            {filtered.map(s => (
              <button
                key={s.id}
                className={'scpicker-item' + (s.id === selectedScId ? ' on' : '')}
                onClick={() => { onSelect(s.id); setOpen(false); setQuery(''); }}
              >
                <span className="dot" style={{background: `oklch(0.55 0.14 ${s.hue ?? APP_GROUPS[s.group].hue})`}} />
                <span className="scpicker-item-name">{s.name}</span>
                <span className="scpicker-item-group">{APP_GROUPS[s.group].short}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FocusPanel({ scale, ctx, showLegend }) {
  const hostRef = React.useRef(null);
  React.useEffect(() => {
    try {
      const svg = window.SC_PLOT.buildPlot(scale, ctx, {
        width: showLegend ? 1200 : 1000,
        height: 900,
        fontScale: 1.15,
        showLegend,
      });
      hostRef.current.innerHTML = '';
      hostRef.current.appendChild(svg);
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      hostRef.current.innerHTML =
        `<div style="padding:12px;font:13px ui-monospace,Menlo,monospace;color:#8b0000;background:#fff6f6;border:1px solid #f0b6b6;border-radius:8px">` +
        `<strong>Focus render error</strong><br/>${msg}</div>`;
    }
  });
  return <div ref={hostRef} className="focus-host" />;
}

window.SCV_DT = { toInputDT, fromInputDT, fmtUTC, MAX_WINDOW_DAYS };

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('SC Viewer runtime error', error, info);
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.stack || this.state.error?.message || String(this.state.error);
      return (
        <div style={{
          margin: '24px',
          padding: '16px',
          border: '1px solid #f0b6b6',
          borderRadius: '10px',
          background: '#fff6f6',
          color: '#6d0f0f',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          whiteSpace: 'pre-wrap',
        }}>
          <strong>Viewer runtime error</strong>
          <div style={{ marginTop: '10px' }}>{message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
