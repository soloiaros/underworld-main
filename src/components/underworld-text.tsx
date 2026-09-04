"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { params } from "@/debug/params";
import { createScene } from "@/three/create-scene";
import { createTextGeometry, createTextMesh, loadFont } from "@/three/load-text";
import { animateText } from "@/three/animate-text";
import { useTheme } from "./theme-provider";

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
 * Brotheric gothic typeface. Sits above the mist background; colours follow
 * the theme.
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
        material.color.setHex(themeRef.current === "light" ? 0x09090b : 0xfafafa);

        animateText(mesh, elapsed, p);
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
