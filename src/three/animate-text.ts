import type * as THREE from "three";

export interface AnimationParams {
  floatSpeed: number;
  floatAmplitude: number;
  rotateSpeed: number;
  tiltAmount: number;
}

export function animateText(
  mesh: THREE.Object3D,
  elapsed: number,
  { floatSpeed, floatAmplitude, rotateSpeed, tiltAmount }: AnimationParams
) {
  mesh.position.y = Math.sin(elapsed * floatSpeed) * floatAmplitude;
  mesh.rotation.y = elapsed * rotateSpeed;
  mesh.rotation.x = Math.sin(elapsed * floatSpeed * 0.6) * tiltAmount;
}
