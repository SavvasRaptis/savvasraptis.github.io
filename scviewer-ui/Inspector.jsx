// Right inspector + bottom positions table.

const { GROUPS: INSP_GROUPS, AU_KM: INSP_AU_KM, RE_KM: INSP_RE_KM } = window.SC_DATA;

function formatAdaptive(kmValue) {
  const reValue = kmValue / INSP_RE_KM;
  if (Math.abs(reValue) < 500) {
    return `${reValue.toFixed(2)} Rₑ`;
  }
  return `${(kmValue / INSP_AU_KM).toFixed(4)} AU`;
}

function formatKmPretty(v) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v / 1e6).toFixed(abs >= 1e8 ? 1 : 3) + ' × 10⁶ km';
  if (abs >= 1e3) return v.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' km';
  return v.toFixed(1) + ' km';
}

function Inspector({ sc, snapshot, rows, epochLabel, frame = 'GSE', onSelectSc, onClose }) {
  if (!sc || !snapshot) return null;
  const { x, y, z } = snapshot;
  const rKm = Math.sqrt(x*x + y*y + z*z);
  const sunDistKm = Math.sqrt((x - INSP_AU_KM)**2 + y*y + z*z);
  const fmtAdaptiveAxis = (v) => formatAdaptive(v);

  const hue = sc.hue ?? INSP_GROUPS[sc.group].hue;
  const col = `oklch(0.55 0.17 ${hue})`;

  const symRef = React.useRef(null);
  React.useEffect(() => {
    if (!symRef.current) return;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 28 28');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '28');
    svg.appendChild(window.SC_PLOT.drawSymbol(sc.symbol || 'circle', 14, 14, 9, { fill: col, stroke: '#fff', strokeWidth: 2 }));
    symRef.current.innerHTML = '';
    symRef.current.appendChild(svg);
  }, [sc]);

  return (
    <div className="inspector">
      <header>
        <span className="insp-sym" ref={symRef} />
        <div className="insp-title-block">
          <div className="sc-title">{sc.name}</div>
          <div className="sc-sub">{INSP_GROUPS[sc.group].label}</div>
        </div>
        {onClose && (
          <button className="insp-close" onClick={onClose} aria-label="Close inspector" title="Close">×</button>
        )}
      </header>
      <section className="epoch-row">
        <span className="epoch-key">Epoch:</span>
        <span className="epoch-val mono">{epochLabel}</span>
      </section>
      <section>
        <h4>{frame} position</h4>
        <table className="kv">
          <tbody>
            <tr><td>X</td><td className="num">{fmtAdaptiveAxis(x)}</td><td className="num dim">{formatKmPretty(x)}</td></tr>
            <tr><td>Y</td><td className="num">{fmtAdaptiveAxis(y)}</td><td className="num dim">{formatKmPretty(y)}</td></tr>
            <tr><td>Z</td><td className="num">{fmtAdaptiveAxis(z)}</td><td className="num dim">{formatKmPretty(z)}</td></tr>
          </tbody>
        </table>
      </section>
      <section>
        <h4>Distances</h4>
        <table className="kv">
          <tbody>
            <tr><td>to Earth</td>
              <td className="num">{formatAdaptive(rKm)}</td>
              <td className="num dim">{formatKmPretty(rKm)}</td></tr>
            <tr><td>to Sun</td>
              <td className="num">{formatAdaptive(sunDistKm)}</td>
              <td className="num dim">{formatKmPretty(sunDistKm)}</td></tr>
          </tbody>
        </table>
      </section>
      <section>
        <h4>Selected Spacecrafts</h4>
        <CompactRowsTable rows={rows} selectedId={sc.id} onSelect={onSelectSc} />
      </section>
    </div>
  );
}

function CompactRowsTable({ rows, selectedId, onSelect }) {
  return (
    <div className="table-wrap compact">
      <table className="ptable ptable-compact">
        <thead>
          <tr>
            <th>Spacecraft</th>
            <th>Group</th>
            <th>X</th>
            <th>Y</th>
            <th>Z</th>
            <th>R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={selectedId === r.id ? 'sel' : ''} onClick={() => onSelect?.(r.id)}>
              <td>{r.name}</td>
              <td className="dim">{INSP_GROUPS[r.group].label}</td>
              <td className="num">{formatAdaptive(r.x_km)}</td>
              <td className="num">{formatAdaptive(r.y_km)}</td>
              <td className="num">{formatAdaptive(r.z_km)}</td>
              <td className="num">{formatAdaptive(r.rEarth_km)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

window.Inspector = Inspector;

function PositionsTable({ rows, sortKey, sortDir, onSort, onSelect, selectedId }) {
  const headers = [
    { k: 'name',      l: 'Spacecraft' },
    { k: 'group',     l: 'Group' },
    { k: 'x_km',      l: 'X' },
    { k: 'y_km',      l: 'Y' },
    { k: 'z_km',      l: 'Z' },
    { k: 'rEarth_km', l: 'r to Earth' },
    { k: 'rSun_au',   l: 'r to Sun (AU)' },
  ];

  return (
    <div className="table-wrap">
      <table className="ptable">
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h.k} onClick={() => onSort(h.k)}
                className={sortKey === h.k ? `sorted ${sortDir}` : ''}>
                {h.l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const sc = window.SC_DATA.CATALOG.find(x => x.id === r.id);
            const hue = sc?.hue ?? INSP_GROUPS[r.group].hue;
            return (
              <tr key={r.id}
                className={selectedId === r.id ? 'sel' : ''}
                onClick={() => onSelect(r.id)}>
                <td>
                  <RowSym sc={sc} hue={hue} />
                  {r.name}
                </td>
                <td className="dim">{INSP_GROUPS[r.group].label}</td>
                <td className="num">{formatAdaptive(r.x_km)}</td>
                <td className="num">{formatAdaptive(r.y_km)}</td>
                <td className="num">{formatAdaptive(r.z_km)}</td>
                <td className="num">{formatAdaptive(r.rEarth_km)}</td>
                <td className="num">{r.rSun_au.toFixed(4)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowSym({ sc, hue }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current || !sc) return;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 18 18');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.appendChild(window.SC_PLOT.drawSymbol(sc.symbol || 'circle', 9, 9, 5, { fill: `oklch(0.55 0.17 ${hue})`, stroke: '#fff', strokeWidth: 1.2 }));
    ref.current.innerHTML = '';
    ref.current.appendChild(svg);
  }, [sc, hue]);
  return <span className="row-sym" ref={ref} />;
}

window.PositionsTable = PositionsTable;
