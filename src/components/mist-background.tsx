"use client";

import { useEffect, useRef } from "react";
import { params } from "@/debug/params";
import vertexShader from "@/shaders/mist.vert.glsl";
import fragmentShader from "@/shaders/mist.frag.glsl";
import { useTheme } from "./theme-provider";

function createProgram(gl: WebGLRenderingContext) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertex = compile(gl.VERTEX_SHADER, vertexShader);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentShader);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function loc(gl: WebGLRenderingContext, program: WebGLProgram, name: string) {
  return gl.getUniformLocation(program, name);
}

export default function MistBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const invertRef = useRef(0);
  const currentInvertRef = useRef(0);

  useEffect(() => {
    invertRef.current = theme === "light" ? 1 : 0;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      resolution: loc(gl, program, "u_resolution"),
      time: loc(gl, program, "u_time"),
      invert: loc(gl, program, "u_invert"),
      speed: loc(gl, program, "u_speed"),
      noiseScale: loc(gl, program, "u_noiseScale"),
      warpScale: loc(gl, program, "u_warpScale"),
      warpAmount: loc(gl, program, "u_warpAmount"),
      driftX: loc(gl, program, "u_driftX"),
      driftY: loc(gl, program, "u_driftY"),
      amplitude: loc(gl, program, "u_amplitude"),
      smoothMin: loc(gl, program, "u_smoothMin"),
      smoothMax: loc(gl, program, "u_smoothMax"),
      modulation: loc(gl, program, "u_modulation"),
      baseDark: loc(gl, program, "u_baseDark"),
      baseLight: loc(gl, program, "u_baseLight"),
    };

    let width = 0;
    let height = 0;
    const resize = () => {
      const scale = params.mist.resolution;
      const nextWidth = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const nextHeight = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const start = performance.now();

    const render = () => {
      raf = requestAnimationFrame(render);
      // Resizing is event-driven (window listener) — no per-frame layout reads.

      const mist = params.mist;
      const time = reducedMotion.matches ? 0 : (performance.now() - start) / 1000;

      currentInvertRef.current +=
        (invertRef.current - currentInvertRef.current) * mist.invertLerp;

      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.invert, currentInvertRef.current);
      gl.uniform1f(uniforms.speed, mist.speed);
      gl.uniform1f(uniforms.noiseScale, mist.noiseScale);
      gl.uniform1f(uniforms.warpScale, mist.warpScale);
      gl.uniform1f(uniforms.warpAmount, mist.warpAmount);
      gl.uniform1f(uniforms.driftX, mist.driftX);
      gl.uniform1f(uniforms.driftY, mist.driftY);
      gl.uniform1f(uniforms.amplitude, mist.amplitude);
      gl.uniform1f(uniforms.smoothMin, mist.smoothMin);
      gl.uniform1f(uniforms.smoothMax, mist.smoothMax);
      gl.uniform1f(uniforms.modulation, mist.modulation);
      gl.uniform1f(uniforms.baseDark, mist.baseDark);
      gl.uniform1f(uniforms.baseLight, mist.baseLight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="mist-background pointer-events-none fixed inset-0 h-full w-full"
    />
  );
}
