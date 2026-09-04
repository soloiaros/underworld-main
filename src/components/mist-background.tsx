"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "./theme-provider";

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Fractal value noise — the cheapest way to get soft, rolling mist.
const FRAGMENT_SHADER = `
precision mediump float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_invert; // 0.0 = dark mist on black, 1.0 = inverted for light theme

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

  float t = u_time * 0.05;

  // Domain-warped fbm for slow, billowing flow.
  vec2 drift = vec2(t * 0.6, t * 0.15);
  vec2 warp = vec2(
    fbm(uv * 1.4 + drift),
    fbm(uv * 1.4 + vec2(5.2, 1.3) - drift)
  );
  float mist = fbm(uv * 1.8 + warp * 1.6 + drift * 0.5);

  // Shape into soft horizontal bands and keep it very subtle.
  mist = smoothstep(0.25, 1.0, mist) * 0.16;
  mist *= 0.6 + 0.4 * noise(vec2(uv.y * 2.0 - t, t * 0.3));

  float base = mix(0.035, 0.965, u_invert);
  float luma = base + mix(mist, -mist, u_invert);

  // Dither to hide banding in the very dark gradient.
  luma += (hash(v_uv * u_resolution + u_time) - 0.5) / 255.0;

  gl_FragColor = vec4(vec3(luma), 1.0);
}
`;

const SCALE = 0.25; // render at 1/4 resolution — plenty for soft mist

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

export default function MistBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const invertRef = useRef(0);
  const currentInvertRef = useRef(0);

  // Target value for the shader; lerped towards in the render loop.
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

    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uInvert = gl.getUniformLocation(program, "u_invert");

    let width = 0;
    let height = 0;
    const resize = () => {
      const nextWidth = Math.max(1, Math.floor(canvas.clientWidth * SCALE));
      const nextHeight = Math.max(1, Math.floor(canvas.clientHeight * SCALE));
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
      if (reducedMotion.matches) return; // render one static frame instead

      resize();
      const time = (performance.now() - start) / 1000;

      // Smooth the theme inversion instead of snapping.
      currentInvertRef.current +=
        (invertRef.current - currentInvertRef.current) * 0.08;

      gl.uniform2f(uResolution, width, height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uInvert, currentInvertRef.current);
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
