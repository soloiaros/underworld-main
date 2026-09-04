"use client";

import { useEffect, useRef } from "react";
import { params } from "@/debug/params";
import { createScene } from "@/three/create-scene";
import { loadChromeStars, disposeChromeStars } from "@/three/load-stars";
import { animateText } from "@/three/animate-text";

/**
 * The chromed stars model floating in the top-right corner of the manifesto
 * section. Wears the exact chrome of the wordmark — the debug panel's
 * Text > Chrome knobs drive both — over the same studio environment. The
 * wordmark's webcam reflections don't carry over: cube textures can't cross
 * canvases, and a second camera stream would double the hardware cost.
 */
export default function ChromeStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { scene, camera, renderer, resize, dispose } = createScene(canvas);

    let model: Awaited<ReturnType<typeof loadChromeStars>> | null = null;
    let cancelled = false;
    let raf = 0;
    let inView = true;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = performance.now();

    loadChromeStars().then((loaded) => {
      if (cancelled) {
        disposeChromeStars(loaded);
        return;
      }
      model = loaded;
      scene.add(loaded.group);
    });

    // Don't render while the section is off-screen.
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(canvas);

    const render = () => {
      raf = requestAnimationFrame(render);
      // Resizing is event-driven (window listener) — no per-frame layout reads.
      if (!inView) return;

      const elapsed = reducedMotion.matches
        ? 0
        : (performance.now() - start) / 1000;

      if (model) {
        // The same chrome as the wordmark — one set of knobs drives both.
        const chrome = params.text;
        model.material.metalness = chrome.metalness;
        model.material.roughness = chrome.roughness;
        model.material.envMapIntensity = chrome.envMapIntensity;

        model.group.scale.setScalar(params.stars.scale);
        animateText(model.group, elapsed, params.stars);
      }

      renderer.render(scene, camera);
    };
    render();

    window.addEventListener("resize", resize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      intersectionObserver.disconnect();
      dispose(); // scene traversal disposes the model's geometry/material
    };
  }, []);

  return <canvas ref={canvasRef} className="chrome-stars" aria-hidden="true" />;
}
