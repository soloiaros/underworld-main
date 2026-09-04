"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { params } from "@/debug/params";
import { createScene } from "@/three/create-scene";
import { createTextGeometry, createTextMesh, loadFont } from "@/three/load-text";
import { animateText } from "@/three/animate-text";
import {
  createWebcamEnv,
  type WebcamEnvHandle,
  type WebcamEnvState,
} from "@/three/webcam-env";
import { useTheme } from "./theme-provider";

const TEXT = "Underworld";
const STORAGE_KEY = "uw-webcam-reflections";

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
 * Brotheric gothic typeface. Sits above the mist background; colours follow
 * the theme. On opt-in, the chrome reflects the user's front camera.
 */
export default function UnderworldText() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamEnvRef = useRef<WebcamEnvHandle | null>(null);
  const [webcamState, setWebcamState] = useState<WebcamEnvState>("off");
  const { theme } = useTheme();
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const toggleWebcam = useCallback(() => {
    const env = webcamEnvRef.current;
    if (!env || env.state === "requesting") return;

    if (env.state === "live") {
      env.stop();
      setWebcamState("off");
      window.localStorage.setItem(STORAGE_KEY, "off");
      return;
    }

    setWebcamState("requesting");
    void env.start().then((ok) => {
      setWebcamState(ok ? "live" : "denied");
      window.localStorage.setItem(STORAGE_KEY, ok ? "on" : "off");
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { scene, camera, renderer, resize, dispose } = createScene(canvas);
    const webcamEnv = createWebcamEnv();
    webcamEnvRef.current = webcamEnv;

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

    // Re-enable reflections automatically if the user opted in before.
    if (window.localStorage.getItem(STORAGE_KEY) === "on") {
      void webcamEnv.start().then((ok) => {
        if (cancelled) return;
        setWebcamState(ok ? "live" : "denied");
        if (!ok) window.localStorage.setItem(STORAGE_KEY, "off");
      });
    }

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
        material.color.setHex(themeRef.current === "light" ? 0x09090b : 0xfafafa);

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
      webcamEnv.dispose();
      webcamEnvRef.current = null;
      dispose();
    };
  }, []);

  const webcamLabel = {
    off: "✦ See yourself in the chrome",
    requesting: "Summoning your reflection…",
    live: "● Living chrome — stop camera",
    denied: "Camera unavailable — try again",
  }[webcamState];

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        aria-label="Underworld"
        role="img"
        className="h-full w-full"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-1">
        <button
          type="button"
          onClick={toggleWebcam}
          disabled={webcamState === "requesting"}
          className="pointer-events-auto rounded-full border border-zinc-400/30 bg-zinc-950/50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-300 backdrop-blur-md transition-colors hover:border-zinc-200/50 hover:text-white disabled:cursor-wait disabled:opacity-60"
        >
          {webcamLabel}
        </button>
      </div>
    </div>
  );
}
