"use client";

import { useEffect, useRef } from "react";
import { params } from "@/debug/params";
import { useTheme } from "./theme-provider";

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_invert;
uniform float u_speed;
uniform float u_noiseScale;
uniform float u_warpScale;
uniform float u_warpAmount;
uniform float u_driftX;
uniform float u_driftY;
uniform float u_amplitude;
uniform float u_smoothMin;
uniform float u_smoothMax;
uniform float u_modulation;
uniform float u_baseDark;
uniform float u_baseLight;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(1.7, -9.2);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = v_uv;
  uv.x *= u_resolution.x / u_resolution.y;

  float t = u_time * u_speed;

  vec2 drift = vec2(t * u_driftX, t * u_driftY);
  vec2 warp = vec2(
    fbm(uv * u_warpScale + drift),
    fbm(uv * u_warpScale + vec2(5.2, 1.3) - drift)
  );
  float mist = fbm(uv * u_noiseScale + warp * u_warpAmount + drift * 0.5);

  float lo = min(u_smoothMin, u_smoothMax);
  float hi = max(u_smoothMin, u_smoothMax);
  mist = smoothstep(lo, hi, mist) * u_amplitude;
  mist *= (1.0 - u_modulation) + u_modulation * noise(vec2(uv.y * 2.0 - t, t * 0.3));

  float base = mix(u_baseDark, u_baseLight, u_invert);
  float luma = base + mix(mist, -mist, u_invert);

  luma += (hash(v_uv * u_resolution + u_time) - 0.5) / 255.0;

  gl_FragColor = vec4(vec3(luma), 1.0);
}
`;

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

  const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
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
      resize();

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
      className="pointer-events-none fixed inset-0 h-full w-full"
    />
  );
}
