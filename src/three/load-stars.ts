import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { params } from "@/debug/params";

const MODEL_URL = "/models/chromed_stars.glb";

export interface ChromeStarsModel {
  group: THREE.Group;
  material: THREE.MeshStandardMaterial;
}

/**
 * Loads the chromed stars GLB and swaps whatever materials it ships with for
 * the wordmark's chrome (Text > Chrome in the debug panel drives both). The
 * model is centred on the origin and normalized to 1 unit across, so
 * `params.stars.scale` is in plain world units.
 */
export async function loadChromeStars(): Promise<ChromeStarsModel> {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const model = gltf.scene;
  model.rotation.z = Math.PI * 0.5;
  model.rotation.x = Math.PI * 0.5;

  const material = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    metalness: params.text.metalness,
    roughness: params.text.roughness,
    envMapIntensity: params.text.envMapIntensity,
  });

  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const old = object.material;
      for (const m of Array.isArray(old) ? old : [old]) m.dispose();
      object.material = material;
    }
  });

  /* Centre the bounding box on the origin. Scale is applied to the subtree
     before the position offset, so the offset must be pre-scaled too. */
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar(1 / maxDim);
  model.position.copy(center).multiplyScalar(-1 / maxDim);

  const group = new THREE.Group();
  group.add(model);
  return { group, material };
}

/** Frees geometry and the shared chrome material (never added to a scene). */
export function disposeChromeStars({ group, material }: ChromeStarsModel) {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
  material.dispose();
}
