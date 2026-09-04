"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { params } from "@/debug/params";
import { createScene } from "@/three/create-scene";
import { createTextMesh } from "@/three/load-text";
import { animateText } from "@/three/animate-text";
import { useTheme } from "./theme-provider";

/**
 * Renders the word "Underworld" as animated 3D text using the Brotheric
 * gothic typeface. Sits above the mist background; colours follow the theme.
 */
export default function UnderworldText() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { scene, camera, renderer, resize, dispose } = createScene(canvas);

    let mesh: THREE.Mesh | null = null;
    let cancelled = false;
    let raf = 0;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = performance.now();

    createTextMesh("Underworld").then((created) => {
      if (cancelled) {
        created.geometry.dispose();
        return;
      }
      mesh = created;
      scene.add(mesh);
    });

    const render = () => {
      raf = requestAnimationFrame(render);
      resize();

      const elapsed = reducedMotion.matches
        ? 0
        : (performance.now() - start) / 1000;

      if (mesh) {
        animateText(mesh, elapsed, params.text);
        const material = mesh.material as THREE.MeshStandardMaterial;
        // Follow the theme: near-white text on dark, near-black on light.
        material.color.setHex(themeRef.current === "light" ? 0x09090b : 0xfafafa);
      }

      renderer.render(scene, camera);
    };
    render();

    window.addEventListener("resize", resize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
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
