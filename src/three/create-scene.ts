import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

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
 * `cameraZ` pulls the camera back when a canvas shows more world than logo.
 */
export function createScene(
  canvas: HTMLCanvasElement,
  { cameraZ = 8 }: { cameraZ?: number } = {}
): SceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true, // let the mist background show through
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, cameraZ);

  // Image-based lighting — chrome is pure reflection, so without an
  // environment map a fully metallic material renders almost black.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  const environment = pmrem.fromScene(roomEnvironment, 0.04).texture;
  scene.environment = environment;

  // Directional key/rim on top of the IBL, for crisp bevel highlights.
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
    scene.environment = null;
    environment.dispose();
    pmrem.dispose();
    roomEnvironment.dispose();
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
