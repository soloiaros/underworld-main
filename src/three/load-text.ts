import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { TextParams } from "@/debug/params";

const FONT_URL = "/fonts/brotheric-regular.typeface.json";

let fontPromise: Promise<Font> | null = null;

/** Loads the Brotheric typeface once and caches the promise. */
export function loadFont(): Promise<Font> {
  fontPromise ??= new FontLoader().loadAsync(FONT_URL);
  return fontPromise;
}

/**
 * Builds the extruded wordmark geometry from the given params, centred on the
 * origin. Split out from the mesh so geometry-only tweaks (size, bevel) can
 * rebuild just the geometry without touching material or scene.
 */
export function createTextGeometry(
  font: Font,
  text: string,
  p: TextParams
): TextGeometry {
  const geometry = new TextGeometry(text, {
    font,
    size: p.size,
    depth: p.depth,
    curveSegments: 8,
    bevelEnabled: p.bevelEnabled,
    bevelThickness: p.bevelThickness,
    bevelSize: p.bevelSize,
    bevelSegments: Math.round(p.bevelSegments),
  });
  geometry.center();
  return geometry;
}

/**
 * Builds the chrome wordmark mesh. Colour is driven by the theme and updated
 * from the component.
 */
export async function createTextMesh(
  text: string,
  p: TextParams
): Promise<THREE.Mesh> {
  const font = await loadFont();
  const geometry = createTextGeometry(font, text, p);

  const material = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    metalness: p.metalness,
    roughness: p.roughness,
    envMapIntensity: p.envMapIntensity,
  });

  return new THREE.Mesh(geometry, material);
}
