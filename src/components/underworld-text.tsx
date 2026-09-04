"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { params } from "@/debug/params";
import { createScene } from "@/three/create-scene";
import { createTextGeometry, createTextMesh, loadFont } from "@/three/load-text";
import { animateText } from "@/three/animate-text";
import { createWebcamEnv } from "@/three/webcam-env";

const TEXT = "Underworld";

/** Geometry-affecting params — when these change, the mesh is rebuilt. */
function geometrySignature() {
  const p = params.text;
  return [
    p.size,
    p.depth,
    p.bevelEnabled,
    p.bevelThickness,
    p.bevelSize,
    p.bevelSegments,
  ].join("|");
}

/**
 * Renders the word "Underworld" as animated chrome 3D text using the
 * Brotheric gothic typeface. Sits above the mist background; the chrome is
 * identical in both themes. Asks for the front camera on load so the chrome
 * can reflect the user; falls back to the studio environment if denied.
 */
export default function UnderworldText() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { scene, camera, renderer, resize, dispose } = createScene(canvas);
    const webcamEnv = createWebcamEnv();

    // The camera only streams while the tab is visible and the wordmark is
    // on-screen — hidden tabs keep rendering paused but would otherwise keep
    // the camera hardware (and its battery cost) running.
    let cameraDenied = false;
    let pageVisible = !document.hidden;
    let inView = true;

    const syncWebcamActivity = () => {
      if (!pageVisible || !inView) {
        webcamEnv.stop();
      } else if (!cameraDenied && webcamEnv.state === "off") {
        void webcamEnv.start().then((ok) => {
          if (!ok && webcamEnv.state === "denied") cameraDenied = true;
          syncWebcamActivity(); // re-check in case things changed mid-prompt
        });
      }
    };

    // Ask for the camera up front — reflections go live as soon as the
    // permission prompt resolves; on denial the chrome keeps RoomEnvironment.
    void webcamEnv.start().then((ok) => {
      if (!ok && webcamEnv.state === "denied") cameraDenied = true;
      syncWebcamActivity();
    });

    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      syncWebcamActivity();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        syncWebcamActivity();
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(canvas);

    let mesh: THREE.Mesh | null = null;
    let cancelled = false;
    let raf = 0;
    let lastGeometrySignature = "";

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = performance.now();

    createTextMesh(TEXT, params.text).then((created) => {
      if (cancelled) {
        created.geometry.dispose();
        return;
      }
      mesh = created;
      lastGeometrySignature = geometrySignature();
      scene.add(mesh);
    });

    const render = () => {
      raf = requestAnimationFrame(render);
      resize();

      const elapsed = reducedMotion.matches
        ? 0
        : (performance.now() - start) / 1000;

      if (mesh) {
        const p = params.text;

        // Geometry tweaks: rebuild when size/bevel change (font is cached).
        const signature = geometrySignature();
        if (signature !== lastGeometrySignature) {
          lastGeometrySignature = signature;
          loadFont().then((font) => {
            if (!mesh) return;
            const oldGeometry = mesh.geometry;
            mesh.geometry = createTextGeometry(font, TEXT, params.text);
            oldGeometry.dispose();
          });
        }

        // Chrome material tweaks apply live.
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.metalness = p.metalness;
        material.roughness = p.roughness;
        material.envMapIntensity = p.envMapIntensity;

        // Swap between the live webcam cube map and the studio environment.
        const liveEnvMap = webcamEnv.envMap;
        if (material.envMap !== liveEnvMap) {
          material.envMap = liveEnvMap;
          material.needsUpdate = true;
        }

        animateText(mesh, elapsed, p);
      }

      webcamEnv.update(renderer);
      renderer.render(scene, camera);
    };
    render();

    window.addEventListener("resize", resize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      intersectionObserver.disconnect();
      webcamEnv.dispose();
      dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Underworld"
      role="img"
      className="h-full w-full"
    />
  );
}
