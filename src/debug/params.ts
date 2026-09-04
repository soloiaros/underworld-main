/**
 * Mutable debug params. Add a group here, then a folder in `debug-gui.tsx`.
 * The mist shader reads `params.mist` every frame, so sliders take effect live.
 */

export const mistParams = {
  "speed": 0.255,
  "noiseScale": 2.03,
  "warpScale": 1.56,
  "warpAmount": 1.6,
  "driftX": 0.6,
  "driftY": 0.15,
  "amplitude": 0.15,
  "smoothMin": 0.25,
  "smoothMax": 1,
  "modulation": 0.4,
  "baseDark": 0.035,
  "baseLight": 0.965,
  "invertLerp": 0.07,
  "resolution": 0.25
}

export type MistParams = typeof mistParams;

/** Geometry, chrome material and motion knobs for the 3D "Underworld" wordmark. */
export const textParams = {
  "size": 3.74,
  "depth": 0.54,
  "bevelEnabled": true,
  "bevelThickness": 0.062,
  "bevelSize": 0.15,
  "bevelSegments": 6,
  "metalness": 1,
  "roughness": 0,
  "envMapIntensity": 3,
  "floatSpeed": 0.9,
  "floatAmplitude": 0.18,
  "rotateSpeed": 0,
  "tiltAmount": 0.08
}

export type TextParams = typeof textParams;

export const params = {
  mist: mistParams,
  text: textParams,
};
