import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

const FONT_URL = "/fonts/brotheric-regular.typeface.json";

let fontPromise: Promise<Font> | null = null;

/** Loads the Brotheric typeface once and caches the promise. */
export function loadFont(): Promise<Font> {
  fontPromise ??= new FontLoader().loadAsync(FONT_URL);
  return fontPromise;
}

/**
 * Builds the extruded "Underworld" wordmark mesh, centred on the origin.
 * Colour is driven by the theme and updated from the component.
 */
export async function createTextMesh(text: string): Promise<THREE.Mesh> {
  const font = await loadFont();

  const geometry = new TextGeometry(text, {
    font,
    size: 1.4,
    depth: 0.35,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 3,
  });
  geometry.center();

  const material = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    metalness: 0.25,
    roughness: 0.55,
  });

  return new THREE.Mesh(geometry, material);
}
