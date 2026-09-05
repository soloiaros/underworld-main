import * as THREE from "three";
import { params } from "@/debug/params";

type WebcamEnvState = "off" | "requesting" | "live" | "denied";

export interface WebcamEnvHandle {
  readonly state: WebcamEnvState;
  readonly envMap: THREE.Texture | null;
  start: () => Promise<boolean>;
  stop: () => void;
  update: (renderer: THREE.WebGLRenderer) => void;
  dispose: () => void;
}

const ROOM_RADIUS = 50;
const SCREEN_DISTANCE = 28;
const SCREEN_HEIGHT = 30;
const DIFF_WIDTH = 16;
const DIFF_HEIGHT = 12;

const screenVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const screenFragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uContrast;
uniform float uBrightness;
uniform float uMonochrome;
varying vec2 vUv;

void main() {
  vec3 color = texture2D(uMap, vUv).rgb;
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(luma), uMonochrome);
  color = (color - 0.5) * uContrast + 0.5 + uBrightness;
  gl_FragColor = vec4(color, uOpacity);
}
`;

const roomVertexShader = /* glsl */ `
varying vec3 vDirection;

void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const roomFragmentShader = /* glsl */ `
uniform float uGlow;
varying vec3 vDirection;

void main() {
  vec3 d = normalize(vDirection);
  float up = d.y * 0.5 + 0.5;
  vec3 color = mix(vec3(0.015), vec3(0.16), pow(up, 1.6));
  color += vec3(0.9, 0.95, 1.0) * smoothstep(0.55, 1.0, d.y) * 0.55;
  gl_FragColor = vec4(color * uGlow, 1.0);
}
`;

export function createWebcamEnv(): WebcamEnvHandle {
  let state: WebcamEnvState = "off";
  let disposed = false;
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let videoTexture: THREE.VideoTexture | null = null;
  let lastVideoTime = -1;
  let lastParamSignature = "";
  let lastCubeUpdate = 0;

  /* Diff */
  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = DIFF_WIDTH;
  diffCanvas.height = DIFF_HEIGHT;
  const diffCtx = diffCanvas.getContext("2d", { willReadFrequently: true });
  let diffPrev: Uint8ClampedArray | null = null;

  /* Scene */
  const envScene = new THREE.Scene();

  const roomMaterial = new THREE.ShaderMaterial({
    vertexShader: roomVertexShader,
    fragmentShader: roomFragmentShader,
    uniforms: { uGlow: { value: 1 } },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(ROOM_RADIUS, 32, 16),
    roomMaterial
  );
  envScene.add(room);

  /* Bars */
  const bars: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  const addBar = (
    width: number,
    height: number,
    x: number,
    y: number,
    z: number
  ) => {
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial()
    );
    bar.position.set(x, y, z);
    bar.lookAt(0, 0, 0);
    envScene.add(bar);
    bars.push(bar);
  };
  addBar(2.5, 36, -20, 0, -8);
  addBar(2.5, 36, 20, 0, -8);
  addBar(30, 3, 0, 22, -4);
  addBar(24, 2, 0, -18, 10);

  /* Screen */
  const placeholderTexture = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 255]),
    1,
    1
  );
  placeholderTexture.needsUpdate = true;

  const screenMaterial = new THREE.ShaderMaterial({
    vertexShader: screenVertexShader,
    fragmentShader: screenFragmentShader,
    uniforms: {
      uMap: { value: placeholderTexture },
      uOpacity: { value: 0 },
      uContrast: { value: 1 },
      uBrightness: { value: 0 },
      uMonochrome: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
  });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    screenMaterial
  );
  screen.position.set(0, 0, SCREEN_DISTANCE);
  screen.rotation.y = Math.PI;
  screen.scale.set(SCREEN_HEIGHT * (4 / 3), SCREEN_HEIGHT, 1);
  envScene.add(screen);

  /* Cube */
  let cubeRenderTarget = new THREE.WebGLCubeRenderTarget(
    params.webcam.cubeResolution,
    {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    }
  );
  const cubeCamera = new THREE.CubeCamera(
    0.1,
    ROOM_RADIUS * 2,
    cubeRenderTarget
  );

  const frameDifference = (source: HTMLVideoElement): number => {
    if (!diffCtx) return Infinity;
    diffCtx.drawImage(source, 0, 0, DIFF_WIDTH, DIFF_HEIGHT);
    const data = diffCtx.getImageData(0, 0, DIFF_WIDTH, DIFF_HEIGHT).data;
    if (!diffPrev) {
      diffPrev = new Uint8ClampedArray(data);
      return Infinity;
    }
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum +=
        Math.abs(data[i] - diffPrev[i]) +
        Math.abs(data[i + 1] - diffPrev[i + 1]) +
        Math.abs(data[i + 2] - diffPrev[i + 2]);
    }
    diffPrev.set(data);
    return sum / ((data.length / 4) * 3 * 255);
  };

  const start = async () => {
    if (state === "requesting" || state === "live") return state === "live";
    state = "requesting";

    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 320 },
          height: { ideal: 240 },
        },
        audio: false,
      });
    } catch {
      state = "denied";
      return false;
    }

    if (disposed || state !== "requesting") {
      mediaStream.getTracks().forEach((track) => track.stop());
      if (!disposed) state = "off";
      return false;
    }
    stream = mediaStream;

    video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      /* Frames */
    }

    videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.wrapS = THREE.RepeatWrapping;
    screenMaterial.uniforms.uMap.value = videoTexture;

    lastVideoTime = -1;
    lastParamSignature = "";
    lastCubeUpdate = 0;
    diffPrev = null;
    state = "live";
    return true;
  };

  const stop = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video) {
      video.srcObject = null;
      video = null;
    }
    videoTexture?.dispose();
    videoTexture = null;
    screenMaterial.uniforms.uMap.value = placeholderTexture;
    diffPrev = null;
    state = "off";
  };

  const update = (renderer: THREE.WebGLRenderer) => {
    if (state !== "live" || !video || !videoTexture) return;

    const p = params.webcam;

    if (cubeRenderTarget.width !== p.cubeResolution) {
      cubeRenderTarget.dispose();
      cubeRenderTarget = new THREE.WebGLCubeRenderTarget(p.cubeResolution, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      });
      cubeCamera.renderTarget = cubeRenderTarget;
      lastParamSignature = "";
    }

    screenMaterial.uniforms.uOpacity.value = p.mix;
    screenMaterial.uniforms.uContrast.value = p.contrast;
    screenMaterial.uniforms.uBrightness.value = p.brightness;
    screenMaterial.uniforms.uMonochrome.value = p.monochrome;
    roomMaterial.uniforms.uGlow.value = p.roomGlow;
    for (const bar of bars) bar.material.color.setScalar(p.barIntensity);
    videoTexture.repeat.x = p.mirror ? -1 : 1;
    videoTexture.offset.x = p.mirror ? 1 : 0;

    if (video.videoWidth > 0) {
      screen.scale.x = SCREEN_HEIGHT * (video.videoWidth / video.videoHeight);
    }

    const signature = [
      p.mix,
      p.contrast,
      p.brightness,
      p.monochrome,
      p.roomGlow,
      p.barIntensity,
      p.mirror,
    ].join("|");
    const paramsChanged = signature !== lastParamSignature;

    const now = performance.now();
    const dueForUpdate = now - lastCubeUpdate >= 1000 / p.maxFps;
    if (!dueForUpdate && !paramsChanged) return;

    let shouldRender = paramsChanged;
    if (
      !shouldRender &&
      video.readyState >= 2 &&
      video.currentTime !== lastVideoTime
    ) {
      lastVideoTime = video.currentTime;
      shouldRender = !p.motionGate || frameDifference(video) > p.motionThreshold;
    }

    if (shouldRender) {
      lastParamSignature = signature;
      lastCubeUpdate = now;
      cubeCamera.update(renderer, envScene);
    }
  };

  const dispose = () => {
    disposed = true;
    stop();
    cubeRenderTarget.dispose();
    placeholderTexture.dispose();
    envScene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    });
  };

  return {
    get state() {
      return state;
    },
    get envMap() {
      return state === "live" ? cubeRenderTarget.texture : null;
    },
    start,
    stop,
    update,
    dispose,
  };
}
