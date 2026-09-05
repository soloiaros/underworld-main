"use client";

import { useEffect, useRef } from "react";
import type GUI from "lil-gui";
import { useTheme } from "@/components/theme-provider";
import { params } from "./params";
import { useDebug } from "./use-debug";

function addMistFolder(gui: GUI) {
  const folder = gui.addFolder("Mist");
  const { mist } = params;

  folder.add(mist, "speed", 0, 0.3, 0.001).name("Speed");
  folder.add(mist, "amplitude", 0, 0.6, 0.005).name("Amplitude");
  folder.add(mist, "noiseScale", 0.2, 6, 0.01).name("Noise scale");
  folder.add(mist, "warpScale", 0.2, 6, 0.01).name("Warp scale");
  folder.add(mist, "warpAmount", 0, 4, 0.01).name("Warp amount");
  folder.add(mist, "driftX", -2, 2, 0.01).name("Drift X");
  folder.add(mist, "driftY", -2, 2, 0.01).name("Drift Y");
  folder.add(mist, "smoothMin", 0, 1, 0.01).name("Threshold min");
  folder.add(mist, "smoothMax", 0, 1, 0.01).name("Threshold max");
  folder.add(mist, "modulation", 0, 1, 0.01).name("Modulation");
  folder.add(mist, "baseDark", 0, 1, 0.001).name("Base (dark)");
  folder.add(mist, "baseLight", 0, 1, 0.001).name("Base (light)");
  folder.add(mist, "invertLerp", 0.01, 0.4, 0.01).name("Invert lerp");
  folder.add(mist, "resolution", 0.1, 1, 0.05).name("Resolution");
  folder.open();
}

function addTextFolder(gui: GUI) {
  const folder = gui.addFolder("Text");
  const { text } = params;

  folder.add(text, "size", 0.2, 4, 0.01).name("Size");
  folder.add(text, "depth", 0, 1.5, 0.01).name("Depth");

  const bevel = folder.addFolder("Bevel");
  bevel.add(text, "bevelEnabled").name("Enabled");
  bevel.add(text, "bevelThickness", 0, 0.2, 0.001).name("Thickness");
  bevel.add(text, "bevelSize", 0, 0.15, 0.001).name("Size");
  bevel.add(text, "bevelSegments", 1, 10, 1).name("Segments");

  const chrome = folder.addFolder("Chrome");
  chrome.add(text, "metalness", 0, 1, 0.01).name("Metalness");
  chrome.add(text, "roughness", 0, 1, 0.01).name("Roughness");
  chrome.add(text, "envMapIntensity", 0, 3, 0.05).name("Reflection");

  folder.add(text, "floatSpeed", 0, 3, 0.01).name("Float speed");
  folder.add(text, "floatAmplitude", 0, 1, 0.01).name("Float amplitude");
  folder.add(text, "rotateSpeed", 0, 1.5, 0.01).name("Rotate speed");
  folder.add(text, "tiltAmount", 0, 0.5, 0.005).name("Tilt amount");
  folder.open();
}

function addStarsFolder(gui: GUI) {
  const folder = gui.addFolder("Stars");
  const { stars } = params;

  folder.add(stars, "scale", 0.5, 8, 0.05).name("Scale");
  folder.add(stars, "floatSpeed", 0, 3, 0.01).name("Float speed");
  folder.add(stars, "floatAmplitude", 0, 1, 0.01).name("Float amplitude");
  folder.add(stars, "rotateSpeed", 0, 1.5, 0.01).name("Rotate speed");
  folder.add(stars, "tiltAmount", 0, 0.5, 0.005).name("Tilt amount");
}

function addStarFieldFolder(gui: GUI) {
  const folder = gui.addFolder("Star field");
  const { starField } = params;

  folder.add(starField, "count", 8, 160, 1).name("Count");
  folder.add(starField, "size", 0.05, 0.6, 0.005).name("Size");
  folder.add(starField, "spinSpeed", 0, 2, 0.01).name("Spin speed");
  folder.add(starField, "bobAmount", 0, 0.5, 0.005).name("Bob amount");
  folder.add(starField, "parallax", 0, 0.5, 0.005).name("Mouse parallax");
  folder.add(starField, "repelRadius", 0.5, 6, 0.05).name("Repel radius");
  folder.add(starField, "repelStrength", 0, 2, 0.01).name("Repel strength");
}

function addWebcamFolder(gui: GUI) {
  const folder = gui.addFolder("Webcam reflections");
  const { webcam } = params;

  folder.add(webcam, "enabled").name("Enabled");
  folder.add(webcam, "mix", 0, 1, 0.01).name("Webcam mix");
  folder.add(webcam, "contrast", 0.5, 2.5, 0.01).name("Contrast");
  folder.add(webcam, "brightness", -0.3, 0.3, 0.005).name("Brightness");
  folder.add(webcam, "monochrome", 0, 1, 0.01).name("Monochrome");
  folder.add(webcam, "mirror").name("Mirror");
  folder.add(webcam, "roomGlow", 0, 3, 0.01).name("Room glow");
  folder.add(webcam, "barIntensity", 0, 6, 0.05).name("Light bars");

  const perf = folder.addFolder("Performance");
  perf.add(webcam, "maxFps", 1, 30, 1).name("Max update FPS");
  perf.add(webcam, "motionGate").name("Motion gate");
  perf.add(webcam, "motionThreshold", 0, 0.2, 0.005).name("Motion threshold");
  perf.add(webcam, "cubeResolution", [64, 128, 256, 512]).name("Cube resolution");
}

export default function DebugGui() {
  const enabled = useDebug();
  const { theme, setTheme } = useTheme();
  const themeRef = useRef(theme);
  const setThemeRef = useRef(setTheme);

  useEffect(() => {
    themeRef.current = theme;
    setThemeRef.current = setTheme;
  }, [theme, setTheme]);

  useEffect(() => {
    if (!enabled) return;

    let gui: GUI | undefined;
    let cancelled = false;

    import("lil-gui").then(({ default: GUI }) => {
      if (cancelled) return;

      gui = new GUI({ title: "Debug" });
      if (cancelled) {
        gui.destroy();
        gui = undefined;
        return;
      }

      const themeProxy = {
        get theme() {
          return themeRef.current;
        },
        set theme(value: "dark" | "light") {
          setThemeRef.current(value);
        },
      };
      gui.add(themeProxy, "theme", ["dark", "light"]).name("Theme").listen();

      addMistFolder(gui);
      addTextFolder(gui);
      addStarsFolder(gui);
      addStarFieldFolder(gui);
      addWebcamFolder(gui);

      gui
        .add(
          {
            copy: () => {
              void navigator.clipboard.writeText(
                JSON.stringify(params, null, 2)
              );
            },
          },
          "copy"
        )
        .name("Copy params");
    });

    return () => {
      cancelled = true;
      gui?.destroy();
    };
  }, [enabled]);

  return null;
}
