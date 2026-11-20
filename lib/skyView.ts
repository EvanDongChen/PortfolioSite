import { stepLife } from './skyLife';
import { stepEvents } from './skyEvents';
import { F, G, GLOW_STRIDE, OBJ_TEXELS, RAMPS, SHADES, SKY_BOTTOM, SKY_PALETTE, SKY_TOP, SOLID_STRIDE, SkyScene, poseBodies } from './sky';

/**
 * Draws the sky islands as pixel art, in the space page's three passes (see
 * lib/spaceView.ts and the pixel-3d skill): surfels as hard discs at twice the
 * art resolution writing a material and a ramp shade; glows added into a second
 * target behind them; then one fragment per art pixel that votes on the 2x2
 * block, shades edges with their own ramp and snaps open sky (a gradient from
 * deep blue overhead to pale haze below, plus glow) to the sky palette with a
 * Bayer dither, so the sky falls into flat bands.
 */

const SOLID_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_nrm;
layout(location=2) in vec4 a_info; // radius, material, albedo, object
layout(location=3) in float a_flags;
uniform sampler2D u_obj;
uniform vec3 u_cam;
uniform vec2 u_off, u_half, u_canvas;
uniform float u_f, u_tpx, u_time, u_near, u_far;
uniform vec3 u_sun;
uniform float u_sunGain;
out float v_shade;
flat out float v_mat;
flat out float v_round;
void main() {
  int o = int(a_info.w) * ${OBJ_TEXELS};
  vec4 r0 = texelFetch(u_obj, ivec2(o, 0), 0);
  vec4 r1 = texelFetch(u_obj, ivec2(o + 1, 0), 0);
  vec4 r2 = texelFetch(u_obj, ivec2(o + 2, 0), 0);
  vec4 st = texelFetch(u_obj, ivec2(o + 4, 0), 0);
  int flags = int(a_flags + 0.5);
  if ((flags & ${F.eye}) != 0 && st.z > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec3 lp = a_pos;
  if ((flags & ${F.wobble}) != 0) {
    float h = max(0.0, -lp.y - st.y);
    lp.x += sin(u_time * 4.0 + st.w) * st.x * h;
  }
  if ((flags & ${F.trail}) != 0) {
    // Whiskers, mane and tail ripple, more the further back they reach.
    float h = max(0.0, -lp.x - st.y);
    lp.y += sin(u_time * 4.0 - h * 0.09 + st.w) * st.x * h;
    lp.z += cos(u_time * 3.1 - h * 0.07 + st.w) * st.x * h * 0.6;
  }
  vec3 w = vec3(dot(r0.xyz, lp) + r0.w, dot(r1.xyz, lp) + r1.w, dot(r2.xyz, lp) + r2.w);
  vec3 n = normalize(vec3(dot(r0.xyz, a_nrm), dot(r1.xyz, a_nrm), dot(r2.xyz, a_nrm)));
  float d = u_cam.z - w.z;
  vec3 toEye = normalize(u_cam - w);
  bool twoSided = (flags & ${F.twoSided}) != 0;
  if (d < u_near || (!twoSided && dot(n, toEye) < -0.15)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float scale = u_f / d;
  vec2 s = u_half + (w.xy - u_cam.xy) * scale + u_off;
  vec2 clip = vec2(s.x / u_canvas.x * 2.0 - 1.0, 1.0 - s.y / u_canvas.y * 2.0);
  float size = 2.0 * a_info.x * scale * u_tpx;
  gl_Position = vec4(clip, (d - u_near) / (u_far - u_near) * 2.0 - 1.0, 1.0);
  gl_PointSize = max(size, 1.0);
  v_round = size > 3.0 ? 1.0 : 0.0;
  v_mat = a_info.y;
  float alb = a_info.z;
  if ((flags & ${F.flow}) != 0) {
    // Bright streaks running down falling water.
    alb += fract(lp.y / (a_info.x * 7.0) - u_time * 1.8 + a_pos.x * 0.13 + a_pos.z * 0.11) < 0.3 ? 0.3 : 0.0;
  }
  if ((flags & ${F.emissive}) != 0) {
    v_shade = clamp(alb + sin(u_time * 2.0 + float(gl_VertexID) * 0.37) * 0.04, 0.0, 1.0);
    return;
  }
  // Daylight: from the sun's corner, high up and a little in front, over a bright daytime fill.
  vec3 L = u_sun;
  float lam = dot(n, L);
  if (twoSided) lam = abs(lam) * 0.85;
  lam = clamp(lam, 0.0, 1.0);
  // Light bounced up off the clouds below keeps undersides from going muddy.
  float bounce = max(0.0, n.y) * 0.2;
  v_shade = clamp(0.2 + pow(lam, 0.85) * 0.8 * u_sunGain + bounce + (alb - 0.5) * 0.5, 0.0, 1.0);
}`;

const SOLID_FS = `#version 300 es
precision highp float;
in float v_shade;
flat in float v_mat;
flat in float v_round;
out vec4 o;
const float BAYER[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
void main() {
  if (v_round > 0.5) { vec2 q = gl_PointCoord - 0.5; if (dot(q, q) > 0.25) discard; }
  ivec2 a = ivec2(gl_FragCoord.xy) / 2 % 4;
  float b = (BAYER[a.y * 4 + a.x] + 0.5) / 16.0;
  float x = v_shade * ${SHADES - 1}.0;
  float idx = floor(x) + (fract(x) > 0.5 + (b - 0.5) * 0.35 ? 1.0 : 0.0);
  o = vec4(v_mat / 255.0, min(idx, ${SHADES - 1}.0) / 255.0, 0.0, 1.0);
}`;

const GLOW_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=1) in vec4 a_col; // r g b, object
layout(location=2) in float a_rad;
layout(location=3) in vec3 a_info; // flags, seed, stream length
uniform sampler2D u_obj;
uniform vec3 u_cam;
uniform vec2 u_off, u_half, u_canvas;
uniform float u_f, u_tpx, u_time, u_near, u_far, u_maxPoint;
uniform float u_glowGain;
out vec3 v_col;
void main() {
  int o = int(a_col.w) * ${OBJ_TEXELS};
  vec4 r0 = texelFetch(u_obj, ivec2(o, 0), 0);
  vec4 r1 = texelFetch(u_obj, ivec2(o + 1, 0), 0);
  vec4 r2 = texelFetch(u_obj, ivec2(o + 2, 0), 0);
  vec4 st = texelFetch(u_obj, ivec2(o + 4, 0), 0);
  int flags = int(a_info.x + 0.5);
  vec3 p = a_pos;
  float k = 1.0;
  float radius = a_rad;
  if ((flags & ${G.gate}) != 0) {
    k = st.z;
    if (k < 0.01) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  } else {
    k *= u_glowGain;
  }
  if ((flags & ${G.stream}) != 0) {
    float u = fract(u_time * (0.3 + a_info.y * 0.4) + a_info.y * 7.0);
    p.x += u * a_info.z;
    radius *= 1.0 + u * 1.5;
    k *= (1.0 - u) * smoothstep(0.0, 0.1, u);
  }
  if ((flags & ${G.flicker}) != 0) k *= 0.75 + 0.25 * sin(u_time * (2.0 + a_info.y * 3.0) + a_info.y * 40.0);
  vec3 w = vec3(dot(r0.xyz, p) + r0.w, dot(r1.xyz, p) + r1.w, dot(r2.xyz, p) + r2.w);
  float d = u_cam.z - w.z;
  if (d < u_near) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float scale = u_f / d;
  vec2 s = u_half + (w.xy - u_cam.xy) * scale + u_off;
  gl_Position = vec4(s.x / u_canvas.x * 2.0 - 1.0, 1.0 - s.y / u_canvas.y * 2.0, (d - u_near) / (u_far - u_near) * 2.0 - 1.0, 1.0);
  float size = 2.0 * radius * scale * u_tpx;
  float big = min(size, u_maxPoint);
  gl_PointSize = max(big, 1.0);
  v_col = a_col.rgb * k * min(4.0, (size * size) / (big * big));
}`;

const GLOW_FS = `#version 300 es
precision highp float;
in vec3 v_col;
out vec4 o;
void main() {
  vec2 q = (gl_PointCoord - 0.5) * 2.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float a = exp(-r2 * 3.2) * (1.0 - r2);
  o = vec4(v_col * a, 0.0);
}`;

const POST_VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const POST_FS = `#version 300 es
precision highp float;
uniform sampler2D u_solid;
uniform sampler2D u_glow;
uniform sampler2D u_ramps;
uniform vec3 u_sky[${SKY_PALETTE.length}];
// The sky's own colour at the top and the bottom of the window, and the art canvas height.
uniform vec3 u_top, u_bottom;
uniform float u_artH;
// Lightning (whitens everything) and a storm's gloom (greys the sky).
uniform float u_flash, u_gloom;
out vec4 o;
const float BAYER[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);

int cover(ivec2 p) {
  int n = 0;
  for (int i = 0; i < 4; i++) if (texelFetch(u_solid, p * 2 + ivec2(i & 1, i >> 1), 0).a > 0.5) n++;
  return n;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 s[4];
  int n = 0;
  for (int i = 0; i < 4; i++) { s[i] = texelFetch(u_solid, p * 2 + ivec2(i & 1, i >> 1), 0); if (s[i].a > 0.5) n++; }
  ivec2 ab = p % 4;
  float bayer = (BAYER[ab.y * 4 + ab.x] + 0.5) / 16.0;
  if (n >= 2) {
    int best = 0, bestVotes = 0;
    for (int i = 0; i < 4; i++) {
      if (s[i].a < 0.5) continue;
      int v = 0;
      for (int j = 0; j < 4; j++) if (s[j].a > 0.5 && abs(s[j].r - s[i].r) < 0.002 && abs(s[j].g - s[i].g) < 0.002) v++;
      if (v > bestVotes) { bestVotes = v; best = i; }
    }
    int mat = int(s[best].r * 255.0 + 0.5);
    int shade = int(s[best].g * 255.0 + 0.5);
    // Edges keep their own colour, a step lighter on the lit side and a step darker on the other.
    int open = 0;
    if (cover(p + ivec2(1, 0)) < 2) open++;
    if (cover(p - ivec2(1, 0)) < 2) open++;
    if (cover(p + ivec2(0, 1)) < 2) open++;
    if (cover(p - ivec2(0, 1)) < 2) open++;
    if (open > 0 && open < 4 && mat != ${9}) shade = shade >= 3 ? min(shade + 1, ${SHADES - 1}) : max(shade - 1, 0);
    // The storm's gloom drops everything a shade, lightning lifts it to the top of its ramp.
    if (u_gloom > bayer * 1.6) shade = max(shade - 1, 0);
    if (u_flash > bayer) shade = min(shade + 2, ${SHADES - 1});
    o = vec4(texelFetch(u_ramps, ivec2(shade, mat), 0).rgb, 1.0);
    return;
  }
  vec3 g = vec3(0.0);
  for (int i = 0; i < 4; i++) g += texelFetch(u_glow, p * 2 + ivec2(i & 1, i >> 1), 0).rgb;
  float y = 1.0 - gl_FragCoord.y / u_artH;
  vec3 sky = mix(u_top, u_bottom, pow(clamp(y, 0.0, 1.0), 1.25));
  sky = mix(sky, vec3(0.32, 0.36, 0.5), u_gloom * 0.75);
  vec3 c = sky + g * 0.25 + vec3(u_flash * 0.8);
  // Nearest two sky colours, and a Bayer choice between them.
  float d1 = 1e9, d2 = 1e9;
  vec3 c1 = sky, c2 = sky;
  for (int i = 0; i < ${SKY_PALETTE.length}; i++) {
    vec3 e = (u_sky[i] - c) * vec3(0.8, 1.0, 0.6);
    float dd = dot(e, e);
    if (dd < d1) { d2 = d1; c2 = c1; d1 = dd; c1 = u_sky[i]; }
    else if (dd < d2) { d2 = dd; c2 = u_sky[i]; }
  }
  float t = sqrt(d1) / (sqrt(d1) + sqrt(d2) + 1e-6);
  o = vec4(t > bayer ? c2 : c1, 1.0);
}`;

/** Which way the daylight comes from: the top right, high, and somewhat towards the viewer. */
const SUN_DIR = (() => { const v = [0.45, -0.8, 0.6]; const l = Math.hypot(...v); return v.map(c => c / l); })();

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb = (h: string) => hex(h).map(v => v / 255);
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

const compile = (gl: WebGL2RenderingContext, vs: string, fs: string) => {
  const prog = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
  return prog;
};

export interface SkyFrame {
  viewW: number;
  viewH: number;
  /** Page scroll, already snapped to whole art pixels. */
  scrollY: number;
  offX: number;
  offY: number;
  time: number;
  dt: number;
  pointer: { x: number; y: number } | null;
}

export class SkyView {
  private gl: WebGL2RenderingContext;
  private solidProg: WebGLProgram;
  private glowProg: WebGLProgram;
  private postProg: WebGLProgram;
  private solidVao: WebGLVertexArrayObject | null = null;
  private glowVao: WebGLVertexArrayObject | null = null;
  private buffers: WebGLBuffer[] = [];
  private objTex: WebGLTexture;
  private rampTex: WebGLTexture;
  private solidTex: WebGLTexture | null = null;
  private glowTex: WebGLTexture | null = null;
  private depth: WebGLRenderbuffer | null = null;
  private solidFbo: WebGLFramebuffer | null = null;
  private glowFbo: WebGLFramebuffer | null = null;
  scene: SkyScene | null = null;
  private pose = new Float32Array(0);
  private artW = 0;
  private artH = 0;
  private floatGlow: boolean;
  private maxPoint: number;
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

  constructor(private canvas: HTMLCanvasElement | OffscreenCanvas, public pixel: number) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, premultipliedAlpha: false, powerPreference: 'high-performance' }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.floatGlow = !!gl.getExtension('EXT_color_buffer_float');
    this.maxPoint = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1] || 64;
    this.solidProg = compile(gl, SOLID_VS, SOLID_FS);
    this.glowProg = compile(gl, GLOW_VS, GLOW_FS);
    this.postProg = compile(gl, POST_VS, POST_FS);

    this.objTex = gl.createTexture()!;
    this.rampTex = gl.createTexture()!;
    const ramps = new Uint8Array(SHADES * RAMPS.length * 4);
    RAMPS.forEach((ramp, m) => ramp.forEach((c, s) => { const [r, g, b] = hex(c); ramps.set([r, g, b, 255], (m * SHADES + s) * 4); }));
    gl.bindTexture(gl.TEXTURE_2D, this.rampTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, SHADES, RAMPS.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, ramps);
    this.nearest();

    gl.useProgram(this.postProg);
    gl.uniform3fv(this.u(this.postProg, 'u_sky'), new Float32Array(SKY_PALETTE.flatMap(rgb)));
    gl.uniform1i(this.u(this.postProg, 'u_solid'), 0);
    gl.uniform1i(this.u(this.postProg, 'u_glow'), 1);
    gl.uniform1i(this.u(this.postProg, 'u_ramps'), 2);
  }

  private u(prog: WebGLProgram, name: string) {
    let m = this.uniforms.get(prog);
    if (!m) { m = new Map(); this.uniforms.set(prog, m); }
    if (!m.has(name)) m.set(name, this.gl.getUniformLocation(prog, name));
    return m.get(name)!;
  }

  private nearest() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /** Uploads a newly built scene, keeping the creatures where they were if one was already running. */
  setScene(scene: SkyScene) {
    const gl = this.gl;
    for (const b of this.buffers) gl.deleteBuffer(b);
    if (this.solidVao) gl.deleteVertexArray(this.solidVao);
    if (this.glowVao) gl.deleteVertexArray(this.glowVao);
    this.buffers = [];
    this.scene = scene;
    this.pose = new Float32Array(scene.bodies.length * OBJ_TEXELS * 4);

    const vao = (data: Float32Array, stride: number, layout: [number, number, number][]) => {
      const v = gl.createVertexArray()!;
      gl.bindVertexArray(v);
      const buf = gl.createBuffer()!;
      this.buffers.push(buf);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (const [loc, size, offset] of layout) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, offset * 4);
      }
      gl.bindVertexArray(null);
      return v;
    };
    this.solidVao = vao(scene.solid, SOLID_STRIDE, [[0, 3, 0], [1, 3, 3], [2, 4, 6], [3, 1, 10]]);
    this.glowVao = vao(scene.glow, GLOW_STRIDE, [[0, 3, 0], [1, 4, 4], [2, 1, 3], [3, 3, 8]]);
  }

  resize(viewW: number, viewH: number, pixel = this.pixel) {
    this.pixel = pixel;
    const w = Math.ceil(viewW / pixel);
    const h = Math.ceil(viewH / pixel) + 1;
    if (w === this.artW && h === this.artH) return { w, h };
    this.artW = w;
    this.artH = h;
    this.canvas.width = w;
    this.canvas.height = h;
    const gl = this.gl;
    for (const t of [this.solidTex, this.glowTex]) if (t) gl.deleteTexture(t);
    if (this.depth) gl.deleteRenderbuffer(this.depth);
    for (const fb of [this.solidFbo, this.glowFbo]) if (fb) gl.deleteFramebuffer(fb);
    const tex = (internal: number, format: number, type: number) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w * 2, h * 2, 0, format, type, null);
      this.nearest();
      return t;
    };
    this.solidTex = tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    this.glowTex = this.floatGlow ? tex(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT) : tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    this.depth = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w * 2, h * 2);
    const fbo = (t: WebGLTexture) => {
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
      return fb;
    };
    this.solidFbo = fbo(this.solidTex);
    this.glowFbo = fbo(this.glowTex);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { w, h };
  }

  draw(fr: SkyFrame) {
    const gl = this.gl;
    const scene = this.scene;
    if (!scene || !this.solidFbo || !this.glowFbo) return;
    stepEvents(scene, fr.dt, fr);
    stepLife(scene, fr.time, fr.dt, fr, fr.pointer);
    const light = scene.events.light;
    poseBodies(scene, fr.time, this.pose);
    gl.bindTexture(gl.TEXTURE_2D, this.objTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, scene.bodies.length * OBJ_TEXELS, 1, 0, gl.RGBA, gl.FLOAT, this.pose);
    this.nearest();

    const f = scene.focal;
    const camera = (prog: WebGLProgram) => {
      gl.useProgram(prog);
      gl.uniform3f(this.u(prog, 'u_cam'), fr.viewW / 2 + fr.offX, fr.scrollY + fr.viewH / 2 + fr.offY, f);
      gl.uniform2f(this.u(prog, 'u_off'), fr.offX, fr.offY);
      gl.uniform2f(this.u(prog, 'u_half'), fr.viewW / 2, fr.viewH / 2);
      gl.uniform2f(this.u(prog, 'u_canvas'), this.artW * this.pixel, this.artH * this.pixel);
      gl.uniform1f(this.u(prog, 'u_f'), f);
      gl.uniform1f(this.u(prog, 'u_tpx'), 2 / this.pixel);
      gl.uniform1f(this.u(prog, 'u_time'), fr.time);
      gl.uniform1f(this.u(prog, 'u_near'), 20);
      gl.uniform1f(this.u(prog, 'u_far'), f * 12);
      gl.uniform1i(this.u(prog, 'u_obj'), 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.objTex);
    };

    gl.viewport(0, 0, this.artW * 2, this.artH * 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.solidFbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    camera(this.solidProg);
    gl.uniform3fv(this.u(this.solidProg, 'u_sun'), SUN_DIR);
    gl.uniform1f(this.u(this.solidProg, 'u_sunGain'), light.sun);
    gl.bindVertexArray(this.solidVao);
    gl.drawArrays(gl.POINTS, 0, scene.solidCount);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glowFbo);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.depthMask(false);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    camera(this.glowProg);
    gl.uniform1f(this.u(this.glowProg, 'u_maxPoint'), this.maxPoint);
    gl.uniform1f(this.u(this.glowProg, 'u_glowGain'), light.glow);
    gl.bindVertexArray(this.glowVao);
    gl.drawArrays(gl.POINTS, 0, scene.glowCount);

    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.artW, this.artH);
    gl.useProgram(this.postProg);
    // The sky is deepest blue at the top of the page and pales towards the sea of cloud at its foot.
    const depth = Math.max(0, Math.min(1, fr.scrollY / Math.max(1, scene.pageH - fr.viewH)));
    gl.uniform3fv(this.u(this.postProg, 'u_top'), mix(rgb(SKY_TOP[0]), rgb(SKY_TOP[1]), depth));
    gl.uniform3fv(this.u(this.postProg, 'u_bottom'), mix(rgb(SKY_BOTTOM[0]), rgb(SKY_BOTTOM[1]), depth));
    gl.uniform1f(this.u(this.postProg, 'u_artH'), this.artH);
    gl.uniform1f(this.u(this.postProg, 'u_flash'), light.flash);
    gl.uniform1f(this.u(this.postProg, 'u_gloom'), light.gloom);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.solidTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glowTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.rampTex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  }

  dispose() {
    const gl = this.gl;
    for (const b of this.buffers) gl.deleteBuffer(b);
    for (const v of [this.solidVao, this.glowVao]) if (v) gl.deleteVertexArray(v);
    for (const t of [this.solidTex, this.glowTex, this.objTex, this.rampTex]) if (t) gl.deleteTexture(t);
    for (const fb of [this.solidFbo, this.glowFbo]) if (fb) gl.deleteFramebuffer(fb);
    if (this.depth) gl.deleteRenderbuffer(this.depth);
    for (const p of [this.solidProg, this.glowProg, this.postProg]) gl.deleteProgram(p);
    this.buffers = [];
    this.scene = null;
  }
}
