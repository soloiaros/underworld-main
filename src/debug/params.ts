/**
 * Mutable debug params. Add a group here, then a folder in `debug-gui.tsx`.
 * The mist shader reads `params.mist` every frame, so sliders take effect live.
 */
export const mistParams = {
  speed: 0.05,
  noiseScale: 1.8,
  warpScale: 1.4,
  warpAmount: 1.6,
  driftX: 0.6,
  driftY: 0.15,
  amplitude: 0.16,
  smoothMin: 0.25,
  smoothMax: 1,
  modulation: 0.4,
  baseDark: 0.035,
  baseLight: 0.965,
  invertLerp: 0.08,
  resolution: 0.25,
};

export type MistParams = typeof mistParams;

export const params = {
  mist: mistParams,
};
