// Main App — orchestrates state, fetches tracks, renders layout.

const {
  CATALOG: APP_CATALOG,
  fetchPositions,
  generateYear,
  AU_KM: APP_AU_KM,
  RE_KM: APP_RE_KM,
  L1_KM: APP_L1_KM,
  MOON_KM: APP_MOON_KM,
  GROUPS: APP_GROUPS,
  API_BASE: APP_API_BASE,
} = window.SC_DATA;

const DEFAULT_SELECTION = new Set([
  'MMS1','MMS2','MMS3','MMS4',
  'IMAP',
  'PSP',
]);

// Scales + planes. Each gets a short nav label for the subplot quick-nav.
const SCALES = [
  { id: 'system',  name: 'Sun–Earth System',                short: 'Sun–Earth',   unit: 'AU', halfWidth: 1.15, center: { x: 0.5 * APP_AU_KM, y: 0, z: 0 } },
  { id: 'heli',    name: 'Inner Heliosphere',               short: 'Inner Helio', unit: 'AU', halfWidth: 0.5,  center: { x: APP_AU_KM, y: 0, z: 0 } },
  { id: 'l1',      name: 'L1 Region',                       short: 'L1',          unit: 'Re', halfWidth: 60,   center: { x: APP_L1_KM, y: 0, z: 0 } },
  { id: 'near',    name: 'Near-Earth Magnetosphere',        short: 'Near Earth',  unit: 'Re', halfWidth: 30,   center: { x: 0, y: 0, z: 0 } },
];
// Wide magnetosphere panel — big enough to show Moon (~60 Re) so users see relative distance
const MOON_SCALE = { id: 'moonmag', name: 'Broader Magnetosphere', short: 'Broader Magnetosphere',
                    unit: 'Re', halfWidth: 80, center: { x: 0, y: 0, z: 0 } };

const MAX_WINDOW_DAYS = 31;
const ONE_DAY_MS = 86400_000;

function toInputDT(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function fromInputDT(s) {
  return new Date(s + ':00Z').toISOString();
}
function fmtUTC(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function App() {
  const [startISO, setStartISO] = React.useState('2026-04-01T00:00:00.000Z');
  const [endISO, setEndISO]     = React.useState('2026-04-08T00:00:00.000Z');
  const [cadence, setCadence]   = React.useState('hourly'); // 'ten_min' | 'hourly'
  const [selectedIds, setSelectedIds] = React.useState(DEFAULT_SELECTION);
  const [expandedGroups, setExpandedGroups] = React.useState(
    new Set(['solar_l1', 'inner_heli', 'magnetospheric', 'deep_space'])
  );
  const [flags, setFlags] = React.useState({
    showBS: true, showMP: true, showOrbits: true,
    showLabels: true, showL1L2: true, showMoon: true,
  });
  const [showLegend, setShowLegend] = React.useState(true);
  const [hoveredId, setHoveredId] = React.useState(null);
  const [selectedScId, setSelectedScId] = React.useState(null);
  const [sortKey, setSortKey] = React.useState('rSun');
  const [sortDir, setSortDir] = React.useState('asc');
  const [focusScale, setFocusScale] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [downloadUnit, setDownloadUnit] = React.useState('AU');
  const [rangeWarn, setRangeWarn] = React.useState(null);
  const [tracks, setTracks] = React.useState(new Map());
  const [tracksLoading, setTracksLoading] = React.useState(false);
  const [tracksError, setTracksError] = React.useState(null);
  const [downloadingYear, setDownloadingYear] = React.useState(false);

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
        const payload = await fetchPositions(selectedList.map((sc) => sc.id), startISO, endISO, step, controller.signal);
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
  }, [selectedIdsKey, startISO, endISO, step]);

  const ctx = {
    selected: selectedList,
    tracks,
    ...flags,
    hoveredId,
    selectedScId,
    startDate: startISO,
    endDate: endISO,
  };

  // Inspector / table rows use the START epoch sample.
  const rows = selectedList.flatMap(sc => {
    const track = tracks.get(sc.id);
    if (!track || track.length === 0) return [];
    const p = track[0];
    const rEarth = Math.sqrt(p.x**2 + p.y**2 + p.z**2);
    const rSun = Math.sqrt((p.x - APP_AU_KM)**2 + p.y**2 + p.z**2);
    return [{
      id: sc.id, name: sc.name, group: sc.group,
      x_au: p.x / APP_AU_KM,
      y_re: p.y / APP_RE_KM,
      z_re: p.z / APP_RE_KM,
      rEarth, rSun: rSun / APP_AU_KM,
    }];
  });
  rows.sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
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
    setRangeWarn(null);
  };

  const setPreset = (days) => {
    const now = new Date(startISO);
    now.setUTCHours(0,0,0,0);
    const s = now.toISOString();
    const e = new Date(now.getTime() + days * ONE_DAY_MS).toISOString();
    setStartISO(s); setEndISO(e); setRangeWarn(null);
  };

  const toggleSc = (id) => setSelectedIds(s => {
    const ns = new Set(s); if (ns.has(id)) ns.delete(id); else ns.add(id); return ns;
  });
  const toggleGroup = (gk, on) => setSelectedIds(s => {
    const ns = new Set(s);
    for (const sc of APP_CATALOG) if (sc.group === gk) { if (on) ns.add(sc.id); else ns.delete(sc.id); }
    return ns;
  });
  const toggleExpand = (gk) => setExpandedGroups(s => {
    const ns = new Set(s); if (ns.has(gk)) ns.delete(gk); else ns.add(gk); return ns;
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

  // --- CSV download (trajectory only) ---
  const downloadTrajectory = () => {
    const unit = downloadUnit;
    const conv = unit === 'AU' ? APP_AU_KM : unit === 'Re' ? APP_RE_KM : 1;
    const uSuf = unit === 'km' ? 'km' : unit === 'AU' ? 'AU' : 'Re';
    const lines = [];
    lines.push(`# Spacecraft Location Viewer — trajectory export`);
    lines.push(`# Window: ${fmtUTC(startISO)} -> ${fmtUTC(endISO)}`);
    lines.push(`# Cadence: ${cadence === 'ten_min' ? '10 minutes' : 'hourly'}`);
    lines.push(`# Frame: GSE — X toward Sun, Z ecliptic north, Y = Z cross X`);
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
    download(`spacecraft-trajectory_${uSuf}_${isoForFile(startISO)}_${isoForFile(endISO)}.csv`, lines.join('\n'));
  };

  // --- Year-long CSV (whole calendar year of startISO) ---
  const downloadYear = async () => {
    const ref = new Date(startISO);
    const year = ref.getUTCFullYear();
    if (!selectedList.length) return;
    setDownloadingYear(true);
    setTracksError(null);
    try {
      const response = await generateYear(selectedList.map((sc) => sc.id), year, step);
      if (!response.ok) throw new Error(`Year export failed (${response.status})`);
      const blob = await response.blob();
      downloadBlob(`spacecraft-trajectory_km_${year}_full-year.csv`, blob);
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
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <circle cx="11" cy="11" r="3.2" fill="oklch(0.58 0.17 245)"/>
            <circle cx="18" cy="11" r="1.6" fill="oklch(0.82 0.15 85)"/>
            <line x1="3" y1="11" x2="20" y2="11" stroke="oklch(0.35 0.01 260)" strokeWidth="0.6" strokeDasharray="1.5 2"/>
          </svg>
          <h1>Spacecraft Location Viewer</h1>
          <span className="subtitle">GSE positions · multi-mission</span>
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
      </header>

      <div className={showInspector ? 'main with-inspector' : 'main'}>
          <Sidebar
            startISO={startISO} endISO={endISO}
            onDateChange={onDateChange}
            cadence={cadence} setCadence={setCadence}
            durationDays={durationDays}
            rangeWarn={rangeWarn}
            onPresetMonth={setPresetMonth}
            onPreset={setPreset}

            selectedIds={selectedIds}
            onToggle={toggleSc}
            onToggleGroup={toggleGroup}
            expandedGroups={expandedGroups}
            onToggleExpand={toggleExpand}
            {...flags}
            onFlag={onFlag}
            showLegend={showLegend} setShowLegend={setShowLegend}
            selectedScId={selectedScId}
            onFocusSc={setSelectedScId}

            downloadUnit={downloadUnit}
            setDownloadUnit={setDownloadUnit}
            onDownloadTrajectory={downloadTrajectory}
            onDownloadYear={downloadYear}
          />
          <div className="canvas">
            {(tracksLoading || tracksError || downloadingYear) && (
              <div className="warn" style={{ margin: '10px 0 8px' }}>
                {tracksLoading && 'Loading trajectories from backend...'}
                {downloadingYear && 'Preparing full-year CSV export...'}
                {tracksError && `Backend error: ${tracksError}`}
              </div>
            )}
            {/* Inspect-picker — choose which SC to open in the right panel */}
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
            </div>

            {/* Subplot quick-nav — one chip per scale row (XY+XZ pair) */}
            <div className="quicknav">
              <span className="qn-label">Jump to</span>
              {SCALES.map(sc => (
                <button key={sc.id} className="qn-btn" onClick={() => scrollToPanel(`${sc.id}-row`)}>
                  <span>{sc.short}</span>
                </button>
              ))}
              <button className="qn-btn" onClick={() => scrollToPanel('moonmag-row')}>
                <span>Broader Magnetosphere</span>
              </button>
            </div>

            {/* One row per scale, two cells (XY + XZ) */}
            {SCALES.map(sc => (
              <div key={sc.id} className="plot-row" ref={el => subplotRefs.current[`${sc.id}-row`] = el}>
                <PlotPanel scale={{ ...sc, plane: 'xy' }} ctx={ctx} showLegend={showLegend}
                  onHover={setHoveredId} onSelect={setSelectedScId} onFocus={(s) => setFocusScale(s)} />
                <PlotPanel scale={{ ...sc, plane: 'xz' }} ctx={ctx} showLegend={showLegend}
                  onHover={setHoveredId} onSelect={setSelectedScId} onFocus={(s) => setFocusScale(s)} />
              </div>
            ))}

            {/* Broader magnetosphere row — both planes */}
            <div className="plot-row" ref={el => subplotRefs.current['moonmag-row'] = el}>
              <PlotPanel scale={{ ...MOON_SCALE, plane: 'xy' }} ctx={ctx} showLegend={showLegend}
                onHover={setHoveredId} onSelect={setSelectedScId} onFocus={(s) => setFocusScale(s)} />
              <PlotPanel scale={{ ...MOON_SCALE, plane: 'xz' }} ctx={ctx} showLegend={showLegend}
                onHover={setHoveredId} onSelect={setSelectedScId} onFocus={(s) => setFocusScale(s)} />
            </div>

            <PositionsTable
              rows={rows}
              sortKey={sortKey} sortDir={sortDir}
              onSort={onSort}
              onSelect={setSelectedScId}
              selectedId={selectedScId}
            />
          </div>
          {showInspector && (
            <Inspector sc={selectedSc} snapshot={selectedSnapshot}
              epochLabel={fmtUTC(startISO)}
              onClose={() => setSelectedScId(null)} />
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

function isoForFile(iso) {
  return iso.slice(0, 16).replace(/[:]/g, '').replace('T', '_');
}
function download(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Inline spacecraft quick-picker ----------
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
        width: showLegend ? 1200 : 1000, height: 900, fontScale: 1.15, showLegend
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
    // Keep a console trace for debugging while showing a user-visible fallback.
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
