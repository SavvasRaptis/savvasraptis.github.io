// Right inspector + bottom positions table.

const { GROUPS: INSP_GROUPS, AU_KM: INSP_AU_KM, RE_KM: INSP_RE_KM } = window.SC_DATA;

function Inspector({ sc, snapshot, epochLabel, onClose }) {
  if (!sc || !snapshot) return null;
  const { x, y, z } = snapshot;
  const rKm = Math.sqrt(x*x + y*y + z*z);
  const sunDistKm = Math.sqrt((x - INSP_AU_KM)**2 + y*y + z*z);

  // Human-readable km with thousand separators — no scientific notation for coords
  const fmtKm = (v) => {
    const abs = Math.abs(v);
    if (abs >= 1e6) return (v / 1e6).toFixed(abs >= 1e8 ? 1 : 3) + ' × 10⁶ km';
    if (abs >= 1e3) return v.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' km';
    return v.toFixed(1) + ' km';
  };
  const fmtRe = (v) => (v / INSP_RE_KM).toFixed(2);
  const fmtAu = (v) => (v / INSP_AU_KM).toFixed(4);

  const hue = sc.hue ?? INSP_GROUPS[sc.group].hue;
  const col = `oklch(0.55 0.17 ${hue})`;

  // inline SC symbol
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
        <h4>GSE position</h4>
        <table className="kv">
          <tbody>
            <tr><td>X</td><td className="num">{fmtAu(x)} AU</td><td className="num dim">{fmtKm(x)}</td></tr>
            <tr><td>Y</td><td className="num">{fmtRe(y)} Rₑ</td><td className="num dim">{fmtKm(y)}</td></tr>
            <tr><td>Z</td><td className="num">{fmtRe(z)} Rₑ</td><td className="num dim">{fmtKm(z)}</td></tr>
          </tbody>
        </table>
      </section>
      <section>
        <h4>Distances</h4>
        <table className="kv">
          <tbody>
            <tr><td>to Earth</td>
              <td className="num">{rKm > 1e7 ? `${fmtAu(rKm)} AU` : `${fmtRe(rKm)} Rₑ`}</td>
              <td className="num dim">{fmtKm(rKm)}</td></tr>
            <tr><td>to Sun</td>
              <td className="num">{fmtAu(sunDistKm)} AU</td>
              <td className="num dim">{fmtKm(sunDistKm)}</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

window.Inspector = Inspector;


function PositionsTable({ rows, sortKey, sortDir, onSort, onSelect, selectedId }) {
  const headers = [
    { k: 'name',     l: 'Spacecraft' },
    { k: 'group',    l: 'Group' },
    { k: 'x_au',     l: 'X (AU)' },
    { k: 'y_re',     l: 'Y (Rₑ)' },
    { k: 'z_re',     l: 'Z (Rₑ)' },
    { k: 'rEarth',   l: 'r to Earth (km)' },
    { k: 'rSun',     l: 'r to Sun (AU)' },
  ];
  const fmtKmShort = (v) => {
    const abs = Math.abs(v);
    if (abs >= 1e6) return (v / 1e6).toFixed(2) + ' M';
    if (abs >= 1e3) return Math.round(v).toLocaleString('en-US');
    return v.toFixed(0);
  };
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
                <td className="num">{r.x_au.toFixed(4)}</td>
                <td className="num">{r.y_re.toFixed(2)}</td>
                <td className="num">{r.z_re.toFixed(2)}</td>
                <td className="num">{fmtKmShort(r.rEarth)}</td>
                <td className="num">{r.rSun.toFixed(4)}</td>
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
