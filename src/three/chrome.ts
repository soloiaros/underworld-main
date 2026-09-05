import * as THREE from "three";
import { params } from "@/debug/params";

export function createChromeMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    metalness: params.text.metalness,
    roughness: params.text.roughness,
    envMapIntensity: params.text.envMapIntensity,
  });
}

export function applyChrome(
  material: THREE.MeshStandardMaterial,
  chrome: typeof params.text,
  envMap?: THREE.Texture | null
) {
  material.metalness = chrome.metalness;
  material.roughness = chrome.roughness;
  material.envMapIntensity = chrome.envMapIntensity;
  if (envMap !== undefined && material.envMap !== envMap) {
    material.envMap = envMap;
    material.needsUpdate = true;
  }
}
