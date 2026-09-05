"use client";

import { useEffect, useRef } from "react";
import { params } from "@/debug/params";
import { beginAsset, finishAsset, trackAsset } from "@/lib/loading";
import { MAX_PIXEL_RATIO } from "@/lib/device";
import { applyChrome } from "@/three/chrome";
import { createScene } from "@/three/create-scene";
import { loadChromeStars, disposeChromeStars } from "@/three/load-stars";
import { animateText } from "@/three/animate-text";

export default function ChromeStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    beginAsset("chrome-stars");

    let handle: ReturnType<typeof createScene>;
    try {
      handle = createScene(canvas, { maxPixelRatio: MAX_PIXEL_RATIO });
    } catch (error) {
      console.warn("Chrome stars scene unavailable", error);
      finishAsset("chrome-stars");
      return;
    }
    const { scene, camera, renderer, resize, dispose } = handle;

    let model: Awaited<ReturnType<typeof loadChromeStars>> | null = null;
    let cancelled = false;
    let raf = 0;
    let inView = true;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = performance.now();

    trackAsset("chrome-stars", loadChromeStars())
      .then((loaded) => {
        if (cancelled) {
          disposeChromeStars(loaded);
          return;
        }
        model = loaded;
        scene.add(loaded.group);
      })
      .catch(() => {});

    /* Visibility */
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(canvas);

    const render = () => {
      raf = requestAnimationFrame(render);
      if (!inView) return;

      const elapsed = reducedMotion.matches
        ? 0
        : (performance.now() - start) / 1000;

      if (model) {
        applyChrome(model.material, params.text);
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
      dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="chrome-stars" aria-hidden="true" />;
}
