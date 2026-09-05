"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { params } from "@/debug/params";
import { beginAsset, finishAsset, trackAsset } from "@/lib/loading";
import { MAX_PIXEL_RATIO } from "@/lib/device";
import { applyChrome } from "@/three/chrome";
import { createScene } from "@/three/create-scene";
import { createTextGeometry, createTextMesh, loadFont } from "@/three/load-text";
import { animateText } from "@/three/animate-text";
import { createWebcamEnv } from "@/three/webcam-env";
import { createStarField, type StarFieldHandle } from "@/three/star-field";

const TEXT = "Underworld";
const STILL_POINTER = { x: 0, y: 0 };

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

export default function UnderworldText() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    beginAsset("wordmark");
    beginAsset("star-field");
    beginAsset("hero-first-frame");

    let handle: ReturnType<typeof createScene>;
    try {
      handle = createScene(canvas, {
        cameraZ: 20,
        maxPixelRatio: MAX_PIXEL_RATIO,
      });
    } catch (error) {
      console.warn("Hero scene unavailable", error);
      finishAsset("wordmark");
      finishAsset("star-field");
      finishAsset("hero-first-frame");
      return;
    }
    const { scene, camera, renderer, resize, dispose } = handle;
    const webcamEnv = createWebcamEnv();

    let cameraDenied = false;
    let pageVisible = !document.hidden;
    let inView = true;

    const syncWebcamActivity = () => {
      if (!pageVisible || !inView || !params.webcam.enabled) {
        webcamEnv.stop();
      } else if (!cameraDenied && webcamEnv.state === "off") {
        void webcamEnv.start().then((ok) => {
          if (!ok && webcamEnv.state === "denied") cameraDenied = true;
          syncWebcamActivity();
        });
      }
    };

    if (params.webcam.enabled) {
      void webcamEnv.start().then((ok) => {
        if (!ok && webcamEnv.state === "denied") cameraDenied = true;
        syncWebcamActivity();
      });
    }

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
    let starField: StarFieldHandle | null = null;
    let cancelled = false;
    let raf = 0;
    let lastGeometrySignature = "";

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = performance.now();

    /* Pointer */
    let canvasRect = canvas.getBoundingClientRect();
    const updateCanvasRect = () => {
      canvasRect = canvas.getBoundingClientRect();
    };
    window.addEventListener("scroll", updateCanvasRect, { passive: true });

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvasRect;
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      pointer.x = Math.min(1.25, Math.max(-1.25, nx));
      pointer.y = Math.min(1.25, Math.max(-1.25, ny));
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    /* Fit */
    const fitWordmarkToView = () => {
      if (!mesh) return;
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox;
      if (!box) return;
      const wordWidth = Math.max(box.max.x - box.min.x, 1e-4);
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      const visibleWidth = 2 * halfH * camera.aspect;
      const scale = Math.min(1, (visibleWidth * 0.92) / wordWidth);
      mesh.scale.setScalar(scale);

      if (starField) {
        const scaledBox = box.clone();
        scaledBox.min.multiplyScalar(scale);
        scaledBox.max.multiplyScalar(scale);
        starField.setBounds(scaledBox);
      }
    };

    trackAsset("wordmark", createTextMesh(TEXT, params.text))
      .then((created) => {
        if (cancelled) {
          created.geometry.dispose();
          return;
        }
        mesh = created;
        lastGeometrySignature = geometrySignature();
        scene.add(mesh);
        fitWordmarkToView();
      })
      .catch(() => {});

    trackAsset("star-field", createStarField())
      .then((field) => {
        if (cancelled) {
          field.dispose();
          return;
        }
        starField = field;
        scene.add(field.mesh);
        fitWordmarkToView();
      })
      .catch(() => {});

    let firstFramePending = true;
    const settleFirstFrame = () => {
      if (!firstFramePending || !mesh || !starField) return;
      firstFramePending = false;
      finishAsset("hero-first-frame");
    };

    const render = () => {
      raf = requestAnimationFrame(render);
      if (!inView) {
        settleFirstFrame();
        return;
      }

      const elapsed = reducedMotion.matches
        ? 0
        : (performance.now() - start) / 1000;

      if (mesh) {
        const p = params.text;
        const signature = geometrySignature();
        if (signature !== lastGeometrySignature) {
          lastGeometrySignature = signature;
          loadFont().then((font) => {
            if (!mesh) return;
            const oldGeometry = mesh.geometry;
            mesh.geometry = createTextGeometry(font, TEXT, params.text);
            oldGeometry.dispose();
            fitWordmarkToView();
          });
        }

        const material = mesh.material as THREE.MeshStandardMaterial;
        applyChrome(material, p, webcamEnv.envMap);
        animateText(mesh, elapsed, p);
      }

      if (starField) {
        applyChrome(starField.material, params.text, webcamEnv.envMap);
        starField.update(
          elapsed,
          reducedMotion.matches ? STILL_POINTER : pointer,
          camera,
          params.starField
        );
      }

      webcamEnv.update(renderer);
      renderer.render(scene, camera);
      settleFirstFrame();
    };
    render();

    const onResize = () => {
      resize();
      updateCanvasRect();
      fitWordmarkToView();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", updateCanvasRect);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      intersectionObserver.disconnect();
      starField?.dispose();
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
