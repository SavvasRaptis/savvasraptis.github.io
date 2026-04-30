// Simplified bow shock (BS) and magnetopause (MP) models in GSE coordinates.
// Units: Earth radii (Re).
//
// Magnetopause: Shue et al. (1997) — r = r0 * (2 / (1 + cos(theta)))^alpha
// Bow shock: parabolic approximation r = r0_bs * (2 / (1 + cos(theta)))^alpha_bs
// These are illustrative curves for the design — not physics-accurate.

function shue(r0, alpha, nPts = 80) {
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

function magnetopause() { return shue(10.0, 0.58); }
function bowshock()     { return shue(13.5, 0.78); }

window.SC_MODELS = { magnetopause, bowshock };
