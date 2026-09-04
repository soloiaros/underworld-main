import * as THREE from "three";

export interface AnimationParams {
  floatSpeed: number;
  floatAmplitude: number;
  rotateSpeed: number;
  tiltAmount: number;
}

/**
 * Per-frame animation for the wordmark: a slow bob on Y, a gentle continuous
 * rotation, and a subtle rocking tilt. Pure motion — no Three.js setup here.
 */
export function animateText(
  mesh: THREE.Object3D,
  elapsed: number,
  { floatSpeed, floatAmplitude, rotateSpeed, tiltAmount }: AnimationParams
) {
  mesh.position.y = Math.sin(elapsed * floatSpeed) * floatAmplitude;
  mesh.rotation.y = elapsed * rotateSpeed;
  mesh.rotation.x = Math.sin(elapsed * floatSpeed * 0.6) * tiltAmount;
}
