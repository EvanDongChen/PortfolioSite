import { stepLife } from './forestLife';
import { BAND, F, FLOOR_PALETTE, ForestScene, G, GLOW_STRIDE, OBJ_TEXELS, RAMPS, SHADES, SOLID_STRIDE, UP, poseBodies } from './forest';

/**
 * Draws the cryptid forest as pixel art, in the space page's three passes (see
 * lib/space/spaceView.ts and the pixel-3d skill): surfels as hard discs at twice
 * the art resolution writing a material and a ramp shade; glows added into a
 * second target; then one fragment per art pixel that votes on the 2x2 block.
 * Where no solid won, the pixel pass paints the forest floor itself (moss and
 * leaf litter, the trail, clearings, ponds), lights it and snaps it to the
 * floor palette with a Bayer dither.
 *
 * It's night. Everything is lit by a dim cold moon, a few warm lights (the
 * campfire, glowing mushrooms) and the visitor's flashlight, a beam that
 * follows the cursor: inside it the forest shows its true colours, outside it
 * only the first steps of each ramp are reached.
 */

const MAX_LIGHTS = 16;
const MAX_RIPPLES = 8;
const MAX_PONDS = 4;
const MAX_CLEAR = 8;

/** The flashlight's spot, shared by the passes: 1 in the middle, 0 outside, with a little spill round it. */
const BEAM_GLSL = `
float beamAt(vec2 s) {
  float d = length(s - u_beam.xy);
  return (smoothstep(u_beam.z, u_beam.z * 0.72, d) * 0.88 + smoothstep(u_beam.z * 1.7, u_beam.z * 0.9, d) * 0.12) * u_beam.w;
}`;

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
uniform vec3 u_moon;
uniform vec4 u_beam;
uniform vec4 u_lights[${MAX_LIGHTS}];
uniform vec3 u_lightCol[${MAX_LIGHTS}];
uniform int u_nLights;
out float v_shade;
flat out float v_mat;
flat out float v_round;
${BEAM_GLSL}
float hash1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  int o = int(a_info.w) * ${OBJ_TEXELS};
  vec4 r0 = texelFetch(u_obj, ivec2(o, 0), 0);
  vec4 r1 = texelFetch(u_obj, ivec2(o + 1, 0), 0);
  vec4 r2 = texelFetch(u_obj, ivec2(o + 2, 0), 0);
  vec4 look = texelFetch(u_obj, ivec2(o + 3, 0), 0);
  vec4 st = texelFetch(u_obj, ivec2(o + 4, 0), 0);
  int flags = int(a_flags + 0.5);
  bool stOn = st.z > 0.5;
  if (((flags & (${F.eye} | ${F.off})) != 0 && stOn) || ((flags & ${F.on}) != 0 && !stOn)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  // Dissolving in and out of the dark, surfel by surfel.
  if (look.x < 0.999 && hash1(float(gl_VertexID) * 0.618 + a_pos.x * 0.01) >= look.x) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec3 lp = a_pos;
  if ((flags & ${F.wobble}) != 0) {
    float h = max(0.0, -lp.y - st.y);
    lp.x += sin(u_time * 4.0 + st.w) * st.x * h;
  }
  if ((flags & ${F.flit}) != 0) {
    // A moth: round and round its spot, fluttering.
    float sd = hash1(float(gl_VertexID) * 1.37);
    float a = u_time * (1.6 + sd * 2.2) * (sd > 0.5 ? 1.0 : -1.0) + sd * 40.0;
    float r = length(lp.xz);
    lp = vec3(cos(a) * r, lp.y + sin(u_time * 7.0 + sd * 30.0) * r * 0.25, sin(a) * r);
  }
  if ((flags & ${F.fall}) != 0) {
    float sd = hash1(float(gl_VertexID) * 2.71);
    float t = st.w;
    lp.y += t * (22.0 + sd * 26.0);
    lp.x += sin(t * (2.0 + sd * 2.0) + sd * 30.0) * (6.0 + sd * 8.0);
    lp.z += cos(t * (1.7 + sd * 1.5) + sd * 20.0) * 5.0;
  }
  vec3 w = vec3(dot(r0.xyz, lp) + r0.w, dot(r1.xyz, lp) + r1.w, dot(r2.xyz, lp) + r2.w);
  vec3 n = normalize(vec3(dot(r0.xyz, a_nrm), dot(r1.xyz, a_nrm), dot(r2.xyz, a_nrm)));
  float d = u_cam.z - w.z;
  vec3 toEye = normalize(u_cam - w);
  bool twoSided = (flags & ${F.twoSided}) != 0;
  // Nothing shows under the floor (a monster's neck before it surfaces), nor faces turned away.
  if (w.z < -2.0 || d < u_near || (!twoSided && dot(n, toEye) < -0.15)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float scale = u_f / d;
  vec2 s = u_half + (w.xy - u_cam.xy) * scale + u_off;
  vec2 clip = vec2(s.x / u_canvas.x * 2.0 - 1.0, 1.0 - s.y / u_canvas.y * 2.0);
  float size = 2.0 * a_info.x * scale * u_tpx;
  gl_Position = vec4(clip, (d - u_near) / (u_far - u_near) * 2.0 - 1.0, 1.0);
  gl_PointSize = max(size, 1.0);
  v_round = size > 3.0 ? 1.0 : 0.0;
  v_mat = a_info.y;
  float alb = a_info.z;
  float spot = beamAt(s);
  if ((flags & ${F.shine}) != 0) {
    // Eyeshine: two bright points where the beam finds the eyes, nothing out of it.
    if (spot < 0.15) {
      if ((flags & ${F.emissive}) != 0) { v_shade = alb; return; }
      v_mat = 13.0; v_shade = 0.1; return;
    }
    v_shade = clamp(0.55 + spot * 0.5, 0.0, 1.0);
    return;
  }
  if ((flags & ${F.emissive}) != 0) {
    float fl = (flags & ${F.flame}) != 0 ? sin(u_time * 9.0 + float(gl_VertexID) * 1.7) * 0.14 + sin(u_time * 23.0 + float(gl_VertexID)) * 0.06 : sin(u_time * 2.0 + float(gl_VertexID) * 0.37) * 0.04;
    v_shade = clamp(alb + fl + spot * 0.06, 0.0, 1.0);
    return;
  }
  float lam = dot(n, u_moon);
  if (twoSided) lam = abs(lam) * 0.85;
  // The moon picks out a cold lit side on everything; the rest falls into the dark.
  float light = 0.09 + pow(max(lam, 0.0), 1.3) * 0.42;
  // The flashlight, from the viewer's hand: faces turned to the viewer catch it fully.
  // The flashlight is held a little below and to the right of the eye, so forms model rather than flatten.
  vec3 toLamp = normalize(u_cam + vec3(u_half.x * 0.5, u_half.y * 0.9, 0.0) - w);
  float face = twoSided ? 0.9 : pow(clamp(dot(n, toLamp), 0.0, 1.0), 1.6) * 0.85 + 0.15;
  light += spot * face * 1.05;
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= u_nLights) break;
    vec3 L = u_lights[i].xyz - w;
    float dl = length(L);
    float fall = max(0.0, 1.0 - dl / u_lights[i].w);
    if (fall <= 0.0) continue;
    float ll = twoSided ? 0.8 : clamp(dot(n, L / dl), 0.0, 1.0) * 0.8 + 0.2;
    light += fall * fall * ll * dot(u_lightCol[i], vec3(0.45, 0.4, 0.15)) * 1.8;
  }
  v_shade = clamp(light * (0.5 + alb), 0.0, 1.0);
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
  float idx = floor(x) + (fract(x) > 0.5 + (b - 0.5) * 0.6 ? 1.0 : 0.0);
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
uniform vec4 u_beam;
uniform vec3 u_up;
out vec3 v_col;
${BEAM_GLSL}
void main() {
  int o = int(a_col.w) * ${OBJ_TEXELS};
  vec4 r0 = texelFetch(u_obj, ivec2(o, 0), 0);
  vec4 r1 = texelFetch(u_obj, ivec2(o + 1, 0), 0);
  vec4 r2 = texelFetch(u_obj, ivec2(o + 2, 0), 0);
  vec4 look = texelFetch(u_obj, ivec2(o + 3, 0), 0);
  vec4 st = texelFetch(u_obj, ivec2(o + 4, 0), 0);
  int flags = int(a_info.x + 0.5);
  float sd = a_info.y;
  vec3 p = a_pos;
  float k = look.x;
  float radius = a_rad;
  if ((flags & ${G.gate}) != 0) k *= st.z;
  if (k < 0.01) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec3 w = vec3(dot(r0.xyz, p) + r0.w, dot(r1.xyz, p) + r1.w, dot(r2.xyz, p) + r2.w);
  if ((flags & ${G.rise}) != 0) {
    float u = fract(u_time * (0.5 + sd * 0.5) + sd * 7.0);
    w += u_up * (-a_info.z * u);
    w.x += sin(u_time * 3.0 + sd * 50.0) * u * a_rad * 4.0;
    k *= (1.0 - u) * smoothstep(0.0, 0.1, u);
  }
  if ((flags & ${G.firefly}) != 0) {
    // Lazy loops round its spot, and a slow pulse: on for a beat, then dark for a while.
    float t = u_time * (0.25 + sd * 0.2);
    w += vec3(sin(t * 1.3 + sd * 20.0) + sin(t * 2.9 + sd * 7.0) * 0.4, cos(t * 1.1 + sd * 13.0) + sin(t * 3.3) * 0.3, 0.6 + sin(t * 1.7 + sd * 9.0) * 0.6) * a_info.z;
    float ph = fract(u_time * (0.18 + sd * 0.12) + sd * 11.0);
    k *= smoothstep(0.0, 0.08, ph) * smoothstep(0.32, 0.14, ph);
  }
  if ((flags & ${G.flicker}) != 0) k *= 0.75 + 0.25 * sin(u_time * (2.0 + sd * 3.0) + sd * 40.0);
  if ((flags & ${G.eyes}) != 0) {
    // Open for a while (blinking now and then), then shut for longer.
    float ph = fract(u_time * (0.045 + sd * 0.04) + sd * 13.0);
    k *= smoothstep(0.0, 0.03, ph) * smoothstep(0.42, 0.38, ph) * step(0.05, fract(u_time * (0.3 + sd * 0.2) + sd * 7.0)) * 2.2;
  }
  float d = u_cam.z - w.z;
  if (d < u_near || k < 0.01) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float scale = u_f / d;
  vec2 s = u_half + (w.xy - u_cam.xy) * scale + u_off;
  // Fireflies go dark in the flashlight's beam.
  if ((flags & ${G.firefly}) != 0) k *= 1.0 - beamAt(s) * 0.95;
  // Whatever's watching shuts its eyes before the light reaches it.
  if ((flags & ${G.eyes}) != 0) k *= smoothstep(u_beam.z * 1.1, u_beam.z * 2.2, length(s - u_beam.xy));
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
uniform vec3 u_pal[${FLOOR_PALETTE.length}];
uniform float u_time, u_scroll, u_px, u_artH, u_s;
uniform vec4 u_beam;
uniform float u_path[10];
uniform float u_pathW;
uniform vec4 u_ponds[${MAX_PONDS}];
uniform int u_nPonds;
uniform vec3 u_clear[${MAX_CLEAR}];
uniform int u_nClear;
uniform vec4 u_lights[${MAX_LIGHTS}];
uniform vec3 u_lightCol[${MAX_LIGHTS}];
uniform int u_nLights;
// Rings spreading on the ponds: centre, radius, strength.
uniform vec4 u_ripples[${MAX_RIPPLES}];
uniform int u_nRipples;
// A camera flash: everything whitens for a moment.
uniform float u_flash;
uniform vec2 u_view;
out vec4 o;
const float BAYER[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
${BEAM_GLSL}

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm2(vec2 p) { return vn(p) * 0.55 + vn(p * 2.03 + 7.1) * 0.3 + vn(p * 4.1 + 3.3) * 0.15; }

/**
 * The flashlight's shaft through the night air, from the hand holding it (below the bottom
 * of the window, a little right of middle) out to the spot: brightest near the spot.
 */
float coneAt(vec2 s) {
  vec2 o = vec2(u_view.x * 0.62, u_view.y + 80.0);
  vec2 ax = u_beam.xy - o;
  float L2 = max(dot(ax, ax), 1.0);
  float t = dot(s - o, ax) / L2;
  if (t < 0.0 || t > 1.0) return 0.0;
  float d = length(s - (o + ax * t));
  float rad = mix(14.0, u_beam.z * 0.8, t);
  return smoothstep(rad, rad * 0.55, d) * (0.25 + 0.75 * t) * smoothstep(1.0, 0.92, t) * u_beam.w;
}

int cover(ivec2 p) {
  int n = 0;
  for (int i = 0; i < 4; i++) if (texelFetch(u_solid, p * 2 + ivec2(i & 1, i >> 1), 0).a > 0.5) n++;
  return n;
}

float pathX(float y) {
  return u_path[0] + u_path[1] * sin(y * u_path[2] + u_path[3]) + u_path[4] * sin(y * u_path[5] + u_path[6]) + u_path[7] * sin(y * u_path[8] + u_path[9]);
}

// Set by ground(): whether this point is pond water (it takes light differently).
bool g_water = false;

/** The bare floor's colour at page point w, before light. */
vec3 ground(vec2 w) {
  g_water = false;
  float S = u_s;
  float big = fbm2(w / (150.0 * S));
  float fine = vn(w / (7.0 * S));
  float mid = vn(w / (26.0 * S) + 3.1);
  vec3 moss = vec3(0.22, 0.36, 0.2);
  vec3 litter = vec3(0.42, 0.26, 0.14);
  vec3 c = mix(moss, litter, smoothstep(0.42, 0.62, big + (mid - 0.5) * 0.25));
  // Scattered leaves and twigs: a little lighter or darker here and there.
  c *= 0.9 + fine * 0.16 + (mid > 0.74 ? 0.14 : 0.0);
  // Clearings: open grass.
  for (int i = 0; i < ${MAX_CLEAR}; i++) {
    if (i >= u_nClear) break;
    float d = length((w - u_clear[i].xy) * vec2(1.0, 1.25)) / u_clear[i].z;
    float edge = 0.85 + (vn(w / (30.0 * S)) - 0.5) * 0.35;
    if (d < edge) c = mix(c, vec3(0.3, 0.42, 0.24) * (0.88 + fine * 0.25), smoothstep(edge, edge - 0.2, d));
  }
  // The trail: worn dirt with a ragged, grassy edge and a few stones.
  float dx = abs(w.x - pathX(w.y));
  float pw = u_pathW * (0.85 + (vn(vec2(w.y / (40.0 * S), 1.7)) - 0.5) * 0.5);
  if (dx < pw + (mid - 0.5) * 10.0 * S) {
    vec3 dirt = vec3(0.62, 0.52, 0.38) * (0.9 + fine * 0.15);
    // Pale stones scattered along it, and the worn middle a touch lighter still.
    if (h21(floor(w / (6.0 * S))) > 0.975) dirt = vec3(0.75, 0.74, 0.72);
    dirt *= 1.0 + smoothstep(pw * 0.5, 0.0, dx) * 0.12;
    c = mix(c, dirt, smoothstep(pw, pw * 0.75, dx));
  }
  // Ponds: black water with a reedy margin.
  for (int i = 0; i < ${MAX_PONDS}; i++) {
    if (i >= u_nPonds) break;
    vec2 e = (w - u_ponds[i].xy) / u_ponds[i].zw;
    float d = length(e) + (vn(w / (28.0 * S)) - 0.5) * 0.12;
    if (d < 1.06) c = mix(c, vec3(0.16, 0.2, 0.12), smoothstep(1.06, 0.98, d));
    if (d < 0.98) { g_water = true; c = vec3(0.12, 0.16, 0.22) * (0.75 + 0.25 * smoothstep(0.98, 0.4, d)); }
  }
  return c;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  // The page point under this art pixel (the canvas's rows run bottom-up), on the floor.
  vec2 scr = vec2((float(p.x) + 0.5) * u_px, (u_artH - float(p.y) - 0.5) * u_px);
  vec2 w = scr + vec2(0.0, u_scroll);
  vec4 s[4];
  int n = 0;
  for (int i = 0; i < 4; i++) { s[i] = texelFetch(u_solid, p * 2 + ivec2(i & 1, i >> 1), 0); if (s[i].a > 0.5) n++; }
  ivec2 ab = p % 4;
  float bay = (BAYER[ab.y * 4 + ab.x] + 0.5) / 16.0;
  vec4 g = vec4(0.0);
  for (int i = 0; i < 4; i++) g += texelFetch(u_glow, p * 2 + ivec2(i & 1, i >> 1), 0);
  g *= 0.25;
  float glum = dot(g.rgb, vec3(0.35, 0.45, 0.2));
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
    // Edges keep their own colour: a step lighter where they're lit, never down to an outline.
    int open = 0;
    if (cover(p + ivec2(1, 0)) < 2) open++;
    if (cover(p - ivec2(1, 0)) < 2) open++;
    if (cover(p + ivec2(0, 1)) < 2) open++;
    if (cover(p - ivec2(0, 1)) < 2) open++;
    if (open > 0 && open < 4 && shade >= 3) shade = min(shade + 1, ${SHADES - 1});
    // Glows in front of it (fireflies, sparks) light it a step or two; bright ones show as themselves.
    if (glum > 0.02 + bay * 0.05) shade = min(shade + 1, ${SHADES - 1});
    if (coneAt(scr) * 0.5 > bay) shade = min(shade + 1, ${SHADES - 1});
    if (u_flash > bay) shade = min(shade + 3, ${SHADES - 1});
    vec3 col = texelFetch(u_ramps, ivec2(shade, mat), 0).rgb;
    if (glum > 0.1 + bay * 0.15) {
      vec3 gc = g.rgb / max(max(g.r, max(g.g, g.b)), 1e-3);
      float bd = 1e9; vec3 pk = gc;
      for (int i = 0; i < ${FLOOR_PALETTE.length}; i++) { vec3 e = u_pal[i] - gc; float dd = dot(e, e); if (dd < bd) { bd = dd; pk = u_pal[i]; } }
      col = pk;
    }
    o = vec4(col, 1.0);
    return;
  }

  vec3 base = ground(w);
  float S = u_s;
  // Moonlight, dappled where it gets through the canopy, the patches drifting as the branches sway.
  // Small, scattered shafts of moonlight: dapples where the canopy parts, drifting as the branches sway.
  float dap = fbm2(w / (70.0 * S) + vec2(u_time * 0.01, -u_time * 0.007)) * 0.7 + fbm2(w / (400.0 * S) + 9.0) * 0.3;
  float pool = smoothstep(0.66, 0.7, dap) + smoothstep(0.58, 0.66, dap) * 0.2;
  float moon = 0.2 + pool * 0.42;
  vec3 light = vec3(0.5, 0.62, 1.15) * moon;
  float spot = beamAt(scr);
  // The flashlight: warm white, hottest in the middle.
  float hot = smoothstep(u_beam.z * 0.5, 0.0, length(scr - u_beam.xy)) * u_beam.w;
  light += vec3(1.0, 0.9, 0.7) * (spot * 0.78 + hot * 0.08);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= u_nLights) break;
    float dl = length(w - u_lights[i].xy);
    float fall = max(0.0, 1.0 - dl / u_lights[i].w);
    light += u_lightCol[i] * fall * fall * 2.2;
  }
  vec3 c;
  if (g_water) {
    // Water mirrors more than it's lit: the moon glints on its ripples, the beam makes a bright smear.
    c = base * (light * 0.55 + 0.05);
    float rip = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      if (i >= u_nRipples) break;
      float dd = length((w - u_ripples[i].xy) * vec2(1.0, 1.6));
      rip += smoothstep(4.0 * S, 0.0, abs(dd - u_ripples[i].z)) * u_ripples[i].w;
    }
    float glint = vn(w / vec2(14.0 * S, 4.0 * S) + vec2(u_time * 0.4, u_time * 0.1));
    if (glint > 0.8 - rip * 0.4 || rip > 0.55) c += vec3(0.35, 0.42, 0.6) * (0.4 + spot * 1.4 + rip);
    if (spot > 0.3 && vn(w / vec2(9.0 * S, 3.0 * S) + vec2(-u_time * 0.6, 0.0)) > 0.62) c += vec3(0.9, 0.85, 0.7) * spot;
  } else {
    c = base * light;
  }
  // Low fog drifting through, blue in the moonlight and glowing where the flashlight catches it.
  float mist = smoothstep(0.45, 0.82, fbm2(w / (240.0 * S) + vec2(u_time * 0.025, u_time * 0.006)));
  c += vec3(0.2, 0.25, 0.42) * mist * (0.35 + pool * 0.4) + vec3(0.9, 0.8, 0.55) * mist * spot * 0.35;
  // The flashlight's shaft through the air, with dust and moths' scales drifting in it.
  float cone = coneAt(scr);
  if (cone > 0.0) {
    c += vec3(0.95, 0.85, 0.6) * cone * (0.13 + mist * 0.3) * (0.8 + 0.2 * vn(scr / (40.0 * S) + vec2(0.0, u_time * 0.3)));
    vec2 cell = floor(scr / (u_px * 1.0)) + vec2(0.0, floor(u_time * 6.0));
    if (h21(cell + floor(u_time * 1.3) * 17.0) > 0.994 - cone * 0.004) c += vec3(1.0, 0.95, 0.8) * cone * 1.2;
  }
  // Glows: fireflies, sparks, the mushrooms' light, eyes.
  c += g.rgb * 0.8;
  c += vec3(u_flash * 0.9);
  // Nearest two floor colours, and a Bayer choice between them.
  float d1 = 1e9, d2 = 1e9;
  vec3 c1 = c, c2 = c;
  for (int i = 0; i < ${FLOOR_PALETTE.length}; i++) {
    vec3 e = (u_pal[i] - c) * vec3(1.0, 1.2, 0.8);
    float dd = dot(e, e);
    if (dd < d1) { d2 = d1; c2 = c1; d1 = dd; c1 = u_pal[i]; }
    else if (dd < d2) { d2 = dd; c2 = u_pal[i]; }
  }
  float t = sqrt(d1) / (sqrt(d1) + sqrt(d2) + 1e-6);
  o = vec4(t > bay ? c2 : c1, 1.0);
}`;

/** Where the moon is: high up the page, a little to the left, behind the canopy. */
const MOON_DIR = (() => { const v = [-0.35, -0.75, 0.55]; const l = Math.hypot(...v); return v.map(c => c / l); })();

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb = (h: string) => hex(h).map(v => v / 255);

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

export interface ForestFrame {
  viewW: number;
  viewH: number;
  /** Page scroll, already snapped to whole art pixels. */
  scrollY: number;
  offX: number;
  offY: number;
  time: number;
  dt: number;
  /** The cursor, in window CSS pixels, if it's over the page. */
  pointer: { x: number; y: number } | null;
}

export class ForestView {
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
  scene: ForestScene | null = null;
  private pose = new Float32Array(0);
  private artW = 0;
  private artH = 0;
  private floatGlow: boolean;
  private maxPoint: number;
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  private lightPos = new Float32Array(MAX_LIGHTS * 4);
  private lightCol = new Float32Array(MAX_LIGHTS * 3);
  private ripples = new Float32Array(MAX_RIPPLES * 4);

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
    gl.uniform3fv(this.u(this.postProg, 'u_pal'), new Float32Array(FLOOR_PALETTE.flatMap(rgb)));
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

  setScene(scene: ForestScene) {
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

    // The floor's shape: the trail, ponds and clearings.
    gl.useProgram(this.postProg);
    gl.uniform1fv(this.u(this.postProg, 'u_path'), new Float32Array(scene.path));
    gl.uniform1f(this.u(this.postProg, 'u_pathW'), scene.pathW);
    const ponds = new Float32Array(MAX_PONDS * 4);
    scene.ponds.slice(0, MAX_PONDS).forEach((p, i) => ponds.set([p.c[0], p.c[1], p.rx, p.ry], i * 4));
    gl.uniform4fv(this.u(this.postProg, 'u_ponds'), ponds);
    gl.uniform1i(this.u(this.postProg, 'u_nPonds'), Math.min(MAX_PONDS, scene.ponds.length));
    const clear = new Float32Array(MAX_CLEAR * 3);
    scene.clearings.slice(0, MAX_CLEAR).forEach((c, i) => clear.set([c.c[0], c.c[1], c.r], i * 3));
    gl.uniform3fv(this.u(this.postProg, 'u_clear'), clear);
    gl.uniform1i(this.u(this.postProg, 'u_nClear'), Math.min(MAX_CLEAR, scene.clearings.length));
    gl.uniform1f(this.u(this.postProg, 'u_s'), scene.s);
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

  draw(fr: ForestFrame) {
    const gl = this.gl;
    const scene = this.scene;
    if (!scene || !this.solidFbo || !this.glowFbo) return;
    stepLife(scene, fr.time, fr.dt, fr, fr.pointer);
    poseBodies(scene, this.pose);
    gl.bindTexture(gl.TEXTURE_2D, this.objTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, scene.bodies.length * OBJ_TEXELS, 1, 0, gl.RGBA, gl.FLOAT, this.pose);
    this.nearest();
    const life = scene.life;
    const beam = life.beam;

    // The lights near the view, flickering.
    let nl = 0;
    const mid = fr.scrollY + fr.viewH / 2;
    for (const l of scene.lights) {
      if (nl >= MAX_LIGHTS) break;
      if (Math.abs(l.p[1] - mid) > fr.viewH * 0.5 + l.r + 100) continue;
      const fl = 1 - l.flicker * (0.5 + 0.3 * Math.sin(fr.time * 7.3 + l.p[0]) + 0.2 * Math.sin(fr.time * 17.9 + l.p[1]));
      this.lightPos.set([l.p[0], l.p[1], l.p[2], l.r], nl * 4);
      this.lightCol.set([l.col[0] * fl, l.col[1] * fl, l.col[2] * fl], nl * 3);
      nl++;
    }
    const ripples = life.ripples ?? [];
    const nr = Math.min(MAX_RIPPLES, ripples.length);
    for (let i = 0; i < nr; i++) this.ripples.set(ripples[i], i * 4);

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
      gl.uniform1f(this.u(prog, 'u_far'), f * 4);
      gl.uniform4f(this.u(prog, 'u_beam'), beam.x, beam.y, beam.r, beam.on);
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
    gl.uniform3fv(this.u(this.solidProg, 'u_moon'), MOON_DIR);
    gl.uniform4fv(this.u(this.solidProg, 'u_lights'), this.lightPos);
    gl.uniform3fv(this.u(this.solidProg, 'u_lightCol'), this.lightCol);
    gl.uniform1i(this.u(this.solidProg, 'u_nLights'), nl);
    gl.bindVertexArray(this.solidVao);
    // Only the scenery near the view (with room for treetops leaning in from beyond it), then everything that moves.
    const nb = scene.bands.length - 1;
    const b0 = Math.max(0, Math.min(nb, Math.floor((fr.scrollY - 320) / BAND)));
    const b1 = Math.max(0, Math.min(nb, Math.ceil((fr.scrollY + fr.viewH + 220) / BAND)));
    const first = scene.bands[b0], last = b1 >= nb ? scene.groundCount : scene.bands[b1];
    if (last > first) gl.drawArrays(gl.POINTS, first, last - first);
    gl.drawArrays(gl.POINTS, scene.groundCount, scene.solidCount - scene.groundCount);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glowFbo);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.depthMask(false);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    camera(this.glowProg);
    gl.uniform1f(this.u(this.glowProg, 'u_maxPoint'), this.maxPoint);
    gl.uniform3fv(this.u(this.glowProg, 'u_up'), UP);
    gl.bindVertexArray(this.glowVao);
    gl.drawArrays(gl.POINTS, 0, scene.glowCount);

    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.artW, this.artH);
    gl.useProgram(this.postProg);
    gl.uniform1f(this.u(this.postProg, 'u_time'), fr.time);
    gl.uniform1f(this.u(this.postProg, 'u_scroll'), fr.scrollY);
    gl.uniform1f(this.u(this.postProg, 'u_px'), this.pixel);
    gl.uniform1f(this.u(this.postProg, 'u_artH'), this.artH);
    gl.uniform4f(this.u(this.postProg, 'u_beam'), beam.x, beam.y, beam.r, beam.on);
    gl.uniform4fv(this.u(this.postProg, 'u_lights'), this.lightPos);
    gl.uniform3fv(this.u(this.postProg, 'u_lightCol'), this.lightCol);
    gl.uniform1i(this.u(this.postProg, 'u_nLights'), nl);
    gl.uniform4fv(this.u(this.postProg, 'u_ripples'), this.ripples);
    gl.uniform1i(this.u(this.postProg, 'u_nRipples'), nr);
    gl.uniform1f(this.u(this.postProg, 'u_flash'), life.flash ?? 0);
    gl.uniform2f(this.u(this.postProg, 'u_view'), fr.viewW, fr.viewH);
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
