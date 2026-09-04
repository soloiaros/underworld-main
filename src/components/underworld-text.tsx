"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { params } from "@/debug/params";
import { beginAsset, finishAsset, trackAsset } from "@/lib/loading";
import { MAX_PIXEL_RATIO } from "@/lib/device";
import { createScene } from "@/three/create-scene";
import { createTextGeometry, createTextMesh, loadFont } from "@/three/load-text";
import { animateText } from "@/three/animate-text";
import { createWebcamEnv } from "@/three/webcam-env";
import { createStarField, type StarFieldHandle } from "@/three/star-field";

const TEXT = "Underworld";
const STILL_POINTER = { x: 0, y: 0 };

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
 * Brotheric gothic typeface, surrounded by an instanced field of small
 * chrome stars that react to the pointer. Sits above the mist background;
 * the chrome is identical in both themes. Asks for the front camera on load
 * so the chrome can reflect the user; falls back to the studio environment
 * if denied.
 */
export default function UnderworldText() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* Loading-screen tasks — registered up front so a failure anywhere below
       still settles the gate instead of trapping the visitor on it. */
    beginAsset("wordmark");
    beginAsset("star-field");
    beginAsset("hero-first-frame");

    /* The canvas fills the whole hero section; the camera sits further back
       so the wordmark keeps its apparent size and the star field gets room
       to breathe around it. */
    let handle: ReturnType<typeof createScene>;
    try {
      handle = createScene(canvas, {
        cameraZ: 20,
        maxPixelRatio: MAX_PIXEL_RATIO,
      });
    } catch (error) {
      /* No WebGL (old device, disabled GPU) — the mist background and the
         page content still carry the visit. */
      console.warn("Hero scene unavailable", error);
      finishAsset("wordmark");
      finishAsset("star-field");
      finishAsset("hero-first-frame");
      return;
    }
    const { scene, camera, renderer, resize, dispose } = handle;
    const webcamEnv = createWebcamEnv();

    // The camera only streams while the tab is visible and the wordmark is
    // on-screen — hidden tabs keep rendering paused but would otherwise keep
    // the camera hardware (and its battery cost) running.
    let cameraDenied = false;
    let pageVisible = !document.hidden;
    let inView = true;

    const syncWebcamActivity = () => {
      if (!pageVisible || !inView || !params.webcam.enabled) {
        webcamEnv.stop();
      } else if (!cameraDenied && webcamEnv.state === "off") {
        void webcamEnv.start().then((ok) => {
          if (!ok && webcamEnv.state === "denied") cameraDenied = true;
          syncWebcamActivity(); // re-check in case things changed mid-prompt
        });
      }
    };

    /* Ask for the camera up front — reflections go live as soon as the
       permission prompt resolves; on denial the chrome keeps RoomEnvironment.
       Mobile opts out via params.webcam.enabled: no prompt on arrival, no
       camera battery cost, and the studio environment is the designed look. */
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

    /* Pointer in canvas NDC, clamped slightly past the edges so leaning off
       the hero still parallaxes. Written on events, read in the loop. The
       canvas rect is cached — reading it per pointermove would force a layout
       flush for every mouse event. */
    let canvasRect = canvas.getBoundingClientRect();
    const updateCanvasRect = () => {
      canvasRect = canvas.getBoundingClientRect();
    };
    /* Resize is handled by onResize below (it also re-fits the wordmark). */
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

    /* Scales the wordmark so it always fits the viewport's visible width —
       portrait phones included — with an 8% margin, then re-fits the star
       shell around the scaled bounds. Runs on load, on geometry rebuilds and
       on resize; camera.aspect alone decides the fit, so no element of the
       hero is ever cut off. (fov is in degrees: half-angle = fov * PI / 360.)
       The geometry is centred on the origin, so scaling its box's min/max
       about zero yields the on-screen bounds. */
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
      .catch(() => {
        /* Settled by trackAsset — the hero simply stays without a wordmark. */
      });

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
      .catch(() => {
        /* Settled by trackAsset — the hero simply stays without stars. */
      });

    /* The gate lifts on the first painted frame with both hero assets in
       place — or, when the hero starts off-screen (scroll-restored visit),
       as soon as the data is ready, since there is nothing to paint yet. */
    let firstFramePending = true;
    const settleFirstFrame = () => {
      if (!firstFramePending || !mesh || !starField) return;
      firstFramePending = false;
      finishAsset("hero-first-frame");
    };

    const render = () => {
      raf = requestAnimationFrame(render);
      // Hero off-screen: skip rendering entirely (the webcam is already
      // stopped by syncWebcamActivity in that case). Resizing is handled by
      // the window listener — no per-frame layout reads here.
      if (!inView) {
        settleFirstFrame();
        return;
      }

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
            fitWordmarkToView();
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

      if (starField) {
        // The same chrome as the wordmark, driven by the same knobs — and
        // the same living reflections while the webcam is live.
        const chrome = params.text;
        const starMaterial = starField.material;
        starMaterial.metalness = chrome.metalness;
        starMaterial.roughness = chrome.roughness;
        starMaterial.envMapIntensity = chrome.envMapIntensity;

        const liveEnvMap = webcamEnv.envMap;
        if (starMaterial.envMap !== liveEnvMap) {
          starMaterial.envMap = liveEnvMap;
          starMaterial.needsUpdate = true;
        }

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

    /* Aspect changes with the viewport, so the wordmark re-fits on resize. */
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
