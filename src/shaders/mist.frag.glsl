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
