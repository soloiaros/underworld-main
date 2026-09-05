import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { TextParams } from "@/debug/params";
import { createChromeMaterial } from "./chrome";

const FONT_URL = "/fonts/brotheric-regular.typeface.json";

let fontPromise: Promise<Font> | null = null;

export function loadFont(): Promise<Font> {
  fontPromise ??= new FontLoader().loadAsync(FONT_URL);
  return fontPromise;
}

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

export async function createTextMesh(
  text: string,
  p: TextParams
): Promise<THREE.Mesh> {
  const font = await loadFont();
  return new THREE.Mesh(
    createTextGeometry(font, text, p),
    createChromeMaterial()
  );
}
