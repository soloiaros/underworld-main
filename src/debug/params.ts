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

/**
 * Scale and motion knobs for the chrome stars in the manifesto's top-right
 * corner. The chrome material itself is shared with the wordmark — tweak it
 * via `textParams` (Text > Chrome in the debug panel).
 */
export const starsParams = {
  "scale": 3.2,
  "floatSpeed": 0.8,
  "floatAmplitude": 0.15,
  "rotateSpeed": 0.3,
  "tiltAmount": 0.06
}

export type StarsParams = typeof starsParams;

/**
 * The instanced star field surrounding the hero wordmark: layout, motion and
 * pointer reactivity. The chrome is shared with `textParams`.
 */


export const starFieldParams = {
  "count": 19,
  "size": 0.6,
  "spinSpeed": 1.02,
  "bobAmount": 0.09,
  "parallax": 0.18,
  "repelRadius": 2.6,
  "repelStrength": 0.7
}

export type StarFieldParams = typeof starFieldParams;



/**
 * Webcam-driven reflection environment ("living chrome"). Read every frame by
 * `webcam-env.ts`, so sliders reshape the reflections live while the camera
 * is on.
 */

export const webcamParams = {
  "mix": 0.27,
  "contrast": 1.54,
  "brightness": -0.12,
  "monochrome": 0.47,
  "mirror": true,
  "roomGlow": 0.87,
  "barIntensity": 0,
  "maxFps": 30,
  "motionGate": true,
  "motionThreshold": 0.005,
  "cubeResolution": 64
}

export type WebcamParams = typeof webcamParams;

export const params = {
  mist: mistParams,
  text: textParams,
  webcam: webcamParams,
  stars: starsParams,
  starField: starFieldParams,
};
