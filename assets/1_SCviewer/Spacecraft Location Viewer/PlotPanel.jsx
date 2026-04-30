// Panel wrapper that renders a single plot + export controls.

function PlotPanel({ scale, ctx, onHover, onSelect, onFocus, wide, showLegend }) {
  const hostRef = React.useRef(null);
  React.useEffect(() => {
    try {
      const dims = wide
        ? { width: showLegend ? 1440 : 1200, height: 700, fontScale: 1.2, showLegend }
        : { width: showLegend ? 780 : 620, height: 620, fontScale: 1.05, showLegend };
      const svg = window.SC_PLOT.buildPlot(scale, ctx, dims);
      svg.classList.add('plot-svg');
      // attach event listeners to dots
      svg.addEventListener('mousemove', (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains('sc-dot')) {
          onHover(t.getAttribute('data-sc'));
        } else {
          onHover(null);
        }
      });
      svg.addEventListener('click', (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains('sc-dot')) {
          onSelect(t.getAttribute('data-sc'));
        }
      });
      hostRef.current.innerHTML = '';
      hostRef.current.appendChild(svg);
      hostRef.current._svg = svg;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      hostRef.current.innerHTML =
        `<div style="padding:12px;font:13px ui-monospace,Menlo,monospace;color:#8b0000;background:#fff6f6;border:1px solid #f0b6b6;border-radius:8px">` +
        `<strong>Plot render error</strong><br/>${msg}</div>`;
    }
  });

  const exportSVG = (e) => {
    e.stopPropagation();
    const svg = hostRef.current._svg;
    if (!svg) return;
    const clone = svg.cloneNode(true);
    const ser = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${ser}`], { type: 'image/svg+xml' });
    triggerDownload(blob, `${slug(scale.name)}-${scale.plane}.svg`);
  };
  const exportPNG = async (e) => {
    e.stopPropagation();
    const svg = hostRef.current._svg;
    if (!svg) return;
    const ser = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([ser], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale2 = 2;
      const c = document.createElement('canvas');
      c.width = svg.width.baseVal.value * scale2;
      c.height = svg.height.baseVal.value * scale2;
      const ctx2 = c.getContext('2d');
      ctx2.fillStyle = '#fafaf7';
      ctx2.fillRect(0, 0, c.width, c.height);
      ctx2.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(blob => {
        triggerDownload(blob, `${slug(scale.name)}-${scale.plane}.png`);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = url;
  };

  return (
    <div className={'panel' + (wide ? ' panel-wide' : '')}>
      <div className="panel-head">
        <div className="panel-title">
          <span className="plane-chip">{scale.plane.toUpperCase()}</span>
          <span className="panel-name">{scale.name}</span>
          <span className="panel-unit">±{scale.halfWidth} {scale.unit === 'Re' ? 'Rₑ' : scale.unit}</span>
        </div>
        <div className="panel-actions">
          <button onClick={() => onFocus(scale)} title="Focus this panel">⤢</button>
          <button onClick={exportSVG} title="Export SVG">SVG</button>
          <button onClick={exportPNG} title="Export PNG">PNG</button>
        </div>
      </div>
      <div ref={hostRef} className="plot-host" />
    </div>
  );
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

window.PlotPanel = PlotPanel;
