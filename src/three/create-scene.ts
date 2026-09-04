import * as THREE from "three";

export interface SceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  resize: () => void;
  dispose: () => void;
}

/**
 * Creates the renderer, scene, camera and lights for the 3D wordmark.
 * Owns all Three.js boilerplate so the component stays declarative.
 */
export function createScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true, // let the mist background show through
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  // Simple, moody lighting — key light plus a cool rim so the extrusion reads.
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2, 3, 4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8fa3ff, 1.1);
  rim.position.set(-3, -1, -2);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();

  const dispose = () => {
    renderer.dispose();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const material = object.material;
        for (const m of Array.isArray(material) ? material : [material]) {
          m.dispose();
        }
      }
    });
  };

  return { scene, camera, renderer, resize, dispose };
}
