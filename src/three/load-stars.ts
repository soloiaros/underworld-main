import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createChromeMaterial } from "./chrome";

const MODEL_URL = "/models/chromed_stars.glb";

export interface ChromeStarsModel {
  group: THREE.Group;
  material: THREE.MeshStandardMaterial;
}

export async function loadChromeStars(): Promise<ChromeStarsModel> {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const model = gltf.scene;
  model.rotation.z = Math.PI * 0.5;
  model.rotation.x = Math.PI * 0.5;

  const material = createChromeMaterial();
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const old = object.material;
      for (const m of Array.isArray(old) ? old : [old]) m.dispose();
      object.material = material;
    }
  });

  /* Origin */
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

export function disposeChromeStars({ group, material }: ChromeStarsModel) {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
  material.dispose();
}
