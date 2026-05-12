// Magnetopause (MP) + bow shock (BS) overlays in GSE coordinates.
// Units: Earth radii (Re).
//
// MP: Shue et al. (1998) functional form, using fixed quiet-time upstream defaults.
// BS: pressure-coupled proxy from MP size/flare (for visual realism without live SW input).
//
// Note: these remain static overlays unless we wire live solar-wind drivers (Pdyn, Bz).

function shueSurface(r0, alpha, nPts = 96) {
  // returns points {x, rho} where rho is sqrt(y^2+z^2) in Re, theta in [0, ~140deg]
  const pts = [];
  const thetaMax = Math.PI * 0.78;
  for (let i = 0; i < nPts; i++) {
    const th = (i / (nPts - 1)) * thetaMax;
    const r = r0 * Math.pow(2 / (1 + Math.cos(th)), alpha);
    pts.push({ x: r * Math.cos(th), rho: r * Math.sin(th) });
  }
  return pts;
}

function mpShue1998Params({ bznT = 0, pdynnPa = 2 } = {}) {
  // Shue et al. (1998) empirical parameterization.
  // r0 in Re, alpha dimensionless; inputs: IMF Bz [nT], dynamic pressure [nPa].
  const p = Math.max(0.05, Number(pdynnPa) || 2);
  const bz = Number.isFinite(Number(bznT)) ? Number(bznT) : 0;
  const r0 = (10.22 + 1.29 * Math.tanh(0.184 * (bz + 8.14))) * Math.pow(p, -1 / 6.6);
  const alpha = (0.58 - 0.007 * bz) * (1 + 0.024 * Math.log(p));
  return { r0, alpha };
}

function magnetopause(options) {
  const { r0, alpha } = mpShue1998Params(options);
  return shueSurface(r0, alpha);
}

function bowshock(options) {
  // Proxy relation that keeps BS outside MP with realistic flaring.
  const { r0: r0Mp, alpha: alphaMp } = mpShue1998Params(options);
  const r0Bs = r0Mp + 3.4;
  const alphaBs = Math.min(0.95, alphaMp + 0.20);
  return shueSurface(r0Bs, alphaBs);
}

window.SC_MODELS = { magnetopause, bowshock };
