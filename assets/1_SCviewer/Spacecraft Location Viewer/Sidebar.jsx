// Sidebar: time window (datetime + presets), spacecraft checklist, overlays, downloads.

const { GROUPS: SB_GROUPS, CATALOG: SB_CATALOG } = window.SC_DATA;

function Sidebar({
  startISO, endISO, onDateChange,
  cadence, setCadence,
  durationDays, rangeWarn,
  onPresetMonth, onPreset,

  selectedIds, onToggle, onToggleGroup,
  expandedGroups, onToggleExpand,
  showBS, showMP, showOrbits, showLabels, showL1L2, showMoon,
  onFlag,
  showLegend, setShowLegend,
  selectedScId, onFocusSc,

  downloadUnit, setDownloadUnit,
  onDownloadTrajectory, onDownloadYear,
}) {
  const grouped = {};
  for (const sc of SB_CATALOG) (grouped[sc.group] ||= []).push(sc);
  const { toInputDT, MAX_WINDOW_DAYS } = window.SCV_DT;

  // Preserve a stable visual order for groups
  const groupOrder = ['magnetospheric', 'solar_l1', 'inner_heli', 'deep_space'];

  return (
    <aside className="sidebar">
      <section className="sb-section">
        <h3 className="sb-h">Time window <span className="count">{durationDays.toFixed(1)}d / {MAX_WINDOW_DAYS}d max</span></h3>

        <div className="date-row">
          <label>
            <span>Start (UTC)</span>
            <input type="datetime-local"
              step="600"
              value={toInputDT(startISO)}
              onChange={e => onDateChange('start', e.target.value)} />
          </label>
        </div>
        <div className="date-row">
          <label>
            <span>End (UTC)</span>
            <input type="datetime-local"
              step="600"
              value={toInputDT(endISO)}
              onChange={e => onDateChange('end', e.target.value)} />
          </label>
        </div>

        <div className="presets">
          <button className="preset" onClick={() => onPreset(1)}>24 h</button>
          <button className="preset" onClick={() => onPreset(7)}>7 d</button>
          <button className="preset" onClick={() => onPresetMonth(0)}>This month</button>
          <button className="preset" onClick={() => onPresetMonth(-1)}>Prev</button>
          <button className="preset" onClick={() => onPresetMonth(1)}>Next</button>
        </div>

        <div className="seg">
          <span className="seg-label">Cadence</span>
          <div className="seg-group">
            <button className={cadence==='ten_min'?'on':''} onClick={() => setCadence('ten_min')}>10-min</button>
            <button className={cadence==='hourly'?'on':''} onClick={() => setCadence('hourly')}>Hourly</button>
          </div>
        </div>

        {rangeWarn && <div className="warn">{rangeWarn}</div>}
        <p className="sb-note">Snapshot reads <strong>start</strong> epoch. Trails span the full window. Cap: {MAX_WINDOW_DAYS} days.</p>
      </section>

      <section className="sb-section">
        <h3 className="sb-h">Download trajectory</h3>
        <div className="seg">
          <span className="seg-label">Units</span>
          <div className="seg-group">
            {['AU', 'Re', 'km'].map(u =>
              <button key={u} className={downloadUnit===u?'on':''} onClick={() => setDownloadUnit(u)}>{u === 'Re' ? 'Rₑ' : u}</button>
            )}
          </div>
        </div>
        <button className="dl-btn wide" onClick={onDownloadTrajectory} title="Full trajectory at chosen cadence">
          <span>Download CSV · selected window</span>
          <span className="dl-sub">{cadence === 'ten_min' ? '10-minute' : 'hourly'} samples</span>
        </button>
        <button className="dl-btn wide year" onClick={onDownloadYear} title={`Download all positions for ${new Date(startISO).getUTCFullYear()} at chosen cadence`}>
          <span>Download CSV · whole year ({new Date(startISO).getUTCFullYear()}) · km</span>
          <span className="dl-sub">{cadence === 'ten_min' ? '~52,560' : '~8,760'} samples per spacecraft (server stream)</span>
        </button>
      </section>

      <section className="sb-section">
        <h3 className="sb-h">Spacecraft <span className="count">{selectedIds.size}/{SB_CATALOG.length}</span></h3>
        {groupOrder.map(gk => {
          const list = grouped[gk] || [];
          if (!list.length) return null;
          const allOn = list.every(s => selectedIds.has(s.id));
          const someOn = list.some(s => selectedIds.has(s.id));
          const isOpen = expandedGroups.has(gk);
          return (
            <div key={gk} className="group">
              <div className="group-head">
                <button className="group-toggle" onClick={() => onToggleExpand(gk)}>
                  <span className={`chev ${isOpen ? 'open' : ''}`}>›</span>
                  <span className="dot" style={{background: `oklch(0.55 0.14 ${SB_GROUPS[gk].hue})`}} />
                  <span className="gname">{SB_GROUPS[gk].label}</span>
                  <span className="gcount">{list.filter(s => selectedIds.has(s.id)).length}/{list.length}</span>
                </button>
                <button
                  className="group-all"
                  onClick={() => onToggleGroup(gk, !allOn)}
                  title={allOn ? 'Hide all' : 'Show all'}
                >{allOn ? '−' : (someOn ? '±' : '+')}</button>
              </div>
              {isOpen && (
                <ul className="sc-list">
                  {list.map(sc => (
                    <li key={sc.id} className={sc.id === selectedScId ? 'focused' : ''}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(sc.id)}
                          onChange={() => onToggle(sc.id)}
                        />
                        <SymbolSwatch sc={sc} />
                        <span
                          className="sc-name"
                          onClick={(e) => { e.preventDefault(); onFocusSc(sc.id); }}
                          title="Focus in inspector"
                        >{sc.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <section className="sb-section">
        <h3 className="sb-h">Reference overlays</h3>
        <div className="flags">
          <SbFlag label="Legend panel (right of each plot)" checked={showLegend} onChange={setShowLegend} />
          <SbFlag label="Spacecraft names in plot" checked={showLabels} onChange={v => onFlag('showLabels', v)} />
          <SbFlag label="Magnetopause (Shue 1997)" checked={showMP} onChange={v => onFlag('showMP', v)} />
          <SbFlag label="Bow shock" checked={showBS} onChange={v => onFlag('showBS', v)} />
          <SbFlag label="Earth orbit" checked={showOrbits} onChange={v => onFlag('showOrbits', v)} />
          <SbFlag label="L1 / L2 markers" checked={showL1L2} onChange={v => onFlag('showL1L2', v)} />
          <SbFlag label="Moon + lunar orbit" checked={showMoon} onChange={v => onFlag('showMoon', v)} />
        </div>
      </section>
    </aside>
  );
}

// Small inline legend symbol (uses SC_PLOT.drawSymbol into a tiny SVG)
function SymbolSwatch({ sc }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 18 18');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    const hue = sc.hue ?? SB_GROUPS[sc.group].hue;
    const color = `oklch(0.55 0.17 ${hue})`;
    svg.appendChild(window.SC_PLOT.drawSymbol(sc.symbol || 'circle', 9, 9, 5.5, { fill: color, stroke: '#fff', strokeWidth: 1.4 }));
    ref.current.innerHTML = '';
    ref.current.appendChild(svg);
  }, [sc]);
  return <span className="sym-swatch" ref={ref} />;
}

function SbFlag({ label, checked, onChange }) {
  return (
    <label className="flag">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

window.Sidebar = Sidebar;
