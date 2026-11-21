import { BUBBLE_GROW, stepLife } from './hotpotLife';
import { stepEvents } from './hotpotEvents';
import { stepSauce } from './hotpotSauce';
import { BROTH_PALETTE, F, G, PALETTE_SIDE, GLOW_STRIDE, HotpotScene, OBJ_TEXELS, RAMPS, SHADES, SOLID_STRIDE, poseBodies } from './hotpot';

/**
 * Draws the hot pot as pixel art, in three passes (as the space page does):
 *
 * 1. Ingredients' surfels render as hard discs at twice the art resolution,
 *    lit by the lamp overhead, writing a material, a ramp shade and their
 *    height above the broth. Cooking swaps a surfel to the next ramp once the
 *    body's cook state passes its place in the order, so beef browns from the
 *    edges in, pixel by pixel.
 * 2. Steam and splashes render additively into a second target.
 * 3. One fragment per art pixel: where two or more samples are solid, the
 *    vote's material and shade (edges a shade lighter or darker, never an
 *    outline), unless it lies under the surface, where the broth dithers over
 *    it the deeper it goes. Everywhere else is broth, painted here: chili oil
 *    and its slicks on one side of the divider, milky bone broth on the other,
 *    bubbles rising and popping over the hot spots, rings where things land or
 *    the cursor stirs, and shadows of whatever is held up above it. All of it
 *    snaps to the broth palette with a 4x4 Bayer pattern.
 */

const MAX_PLUMES = 24;
const MAX_RIPPLES = 12;
const MAX_BUBBLES = 24;
const MAX_RINGS = 8;

const SOLID_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_nrm;
layout(location=2) in vec4 a_info; // radius, material, albedo, object
layout(location=3) in float a_flags;
uniform sampler2D u_obj;
uniform vec3 u_cam;
uniform vec2 u_off, u_half, u_canvas;
uniform float u_f, u_tpx, u_near, u_far, u_time;
uniform vec3 u_light;
out float v_shade;
out float v_h;
flat out float v_mat;
flat out float v_round;
void main() {
  int o = int(a_info.w) * ${OBJ_TEXELS};
  vec4 r0 = texelFetch(u_obj, ivec2(o, 0), 0);
  vec4 r1 = texelFetch(u_obj, ivec2(o + 1, 0), 0);
  vec4 r2 = texelFetch(u_obj, ivec2(o + 2, 0), 0);
  vec4 st = texelFetch(u_obj, ivec2(o + 3, 0), 0);
  int flags = int(a_flags + 0.5);
  vec3 lp = a_pos;
  vec3 ln = a_nrm;
  if ((flags & ${F.curl}) != 0) {
    // Both ends lift as the slice cooks (or droop, when it's negative).
    lp.z += st.x * lp.x * lp.x;
    ln = normalize(vec3(ln.x - 2.0 * st.x * lp.x * ln.z, ln.y, ln.z));
  }
  if ((flags & ${F.curl2}) != 0) {
    lp.z += st.x * lp.y * lp.y;
    ln = normalize(vec3(ln.x, ln.y - 2.0 * st.x * lp.y * ln.z, ln.z));
  }
  vec4 ct = texelFetch(u_obj, ivec2(o + 4, 0), 0);
  bool coated = false;
  if ((flags & ${F.slosh}) != 0) {
    // Sauce: tipped as it sloshes, with rings running out from the food in it.
    float rr = length(lp.xy - ct.xy);
    float ring = st.z * sin(rr * 0.35 - u_time * 9.0) * exp(-rr * 0.02);
    lp.z += st.x * lp.x + st.y * lp.y + ring;
    float dr = st.z * cos(rr * 0.35 - u_time * 9.0) * 0.35 * exp(-rr * 0.02);
    vec2 dir = rr > 0.01 ? (lp.xy - ct.xy) / rr : vec2(0.0);
    ln = normalize(vec3(-st.x - dir.x * dr, -st.y - dir.y * dr, 1.0));
  }
  if ((flags & ${F.ripple}) != 0) {
    float ph = lp.x * 0.13 + u_time * 2.4 + st.w;
    lp.z += sin(ph) * 2.6;
    ln = normalize(vec3(ln.x - cos(ph) * 0.34 * ln.z, ln.y, ln.z));
  }
  int pc = (flags >> 12) & 15;
  if ((flags & ${F.flake}) != 0 && pc > 0) {
    // Its piece drifts off from the middle; a shed shell sinks as it goes and is gone by the end.
    float a = float(pc - 1) * 0.785398;
    lp.xy += vec2(cos(a), sin(a)) * st.y * 9.0;
    if ((flags & ${F.shed}) != 0) {
      if (st.y > 0.9) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      lp.xy += vec2(cos(a), sin(a)) * st.y * 8.0;
      lp.z -= st.y * st.y * 22.0;
    }
  }
  vec3 w = vec3(dot(r0.xyz, lp) + r0.w, dot(r1.xyz, lp) + r1.w, dot(r2.xyz, lp) + r2.w);
  // The matrix carries scale; normals only want its direction.
  vec3 n = normalize(vec3(dot(r0.xyz, ln), dot(r1.xyz, ln), dot(r2.xyz, ln)));
  float d = u_cam.z - w.z;
  vec3 toEye = normalize(u_cam - w);
  bool twoSided = (flags & ${F.twoSided}) != 0;
  // Facing away: hidden, unless it's food that can be turned over, which shows its underside.
  bool underside = false;
  if (!twoSided && dot(n, toEye) < -0.15) {
    if ((flags & ${F.back}) != 0) { n = -n; underside = true; }
    else { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  }
  if (d < u_near) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float scale = u_f / d;
  vec2 s = u_half + (w.xy - u_cam.xy) * scale + u_off;
  vec2 clip = vec2(s.x / u_canvas.x * 2.0 - 1.0, 1.0 - s.y / u_canvas.y * 2.0);
  float size = 2.0 * a_info.x * scale * u_tpx;
  gl_Position = vec4(clip, (d - u_near) / (u_far - u_near) * 2.0 - 1.0, 1.0);
  gl_PointSize = max(size, 1.0);
  v_round = size > 3.0 ? 1.0 : 0.0;
  v_h = w.z;
  float mat = a_info.y;
  float order = (float((flags >> 8) & 15) + 0.5) / 16.0 * 0.92 + 0.04;
  bool cooked = (flags & ${F.cook}) != 0 && st.z > order;
  if (cooked) mat += 1.0;
  // Left in too long: a third ramp, in the same order.
  if ((flags & ${F.over}) != 0 && st.y > order) mat = a_info.y + 2.0;
  // Dipped in sauce: the parts facing up take its colour, more of them the more it's coated.
  if ((flags & ${F.slosh}) == 0 && ct.y > 0.0 && n.z > -0.2 && 0.5 + 0.5 * sin(a_pos.x * 0.33 + a_pos.y * 0.21) * sin(a_pos.y * 0.29 - a_pos.x * 0.17 + 1.3) < ct.y) { mat = ct.x; coated = true; }
  v_mat = mat;

  // Sauce on food sits a shade darker than the sauce in the bowl, so a dipped piece keeps its shape.
  float alb = a_info.z - (coated ? 0.2 : 0.0) - (underside ? 0.15 : 0.0);
  if ((flags & ${F.emissive}) != 0) { v_shade = alb; return; }
  float lam = dot(n, u_light);
  if (twoSided) lam = abs(lam) * 0.85;
  lam = clamp(lam, 0.0, 1.0);
  float spec = 0.0;
  if ((flags & ${F.gloss}) != 0) {
    float r = max(dot(reflect(-u_light, n), toEye), 0.0);
    spec = pow(r, 22.0) * 0.75 + pow(r, 90.0) * 0.6;
  }
  v_shade = clamp(0.14 + pow(lam, 0.85) * 0.68 + (alb - 0.5) * 0.45 + spec, 0.0, 1.0);
}`;

const SOLID_FS = `#version 300 es
precision highp float;
in float v_shade;
in float v_h;
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
  // Height above the broth, 2 px a step: the pixel pass sinks things under the surface and casts shadows with it.
  o = vec4(v_mat / 255.0, min(idx, ${SHADES - 1}.0) / 255.0, clamp(v_h / 512.0 + 0.25, 0.0, 1.0), 1.0);
}`;

const GLOW_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=1) in vec4 a_col; // r g b, object
layout(location=2) in float a_rad;
layout(location=3) in vec3 a_info; // flags, seed, length
uniform sampler2D u_obj;
uniform vec3 u_cam;
uniform vec2 u_off, u_half, u_canvas;
uniform float u_f, u_tpx, u_time, u_near, u_far, u_maxPoint, u_steam;
out vec3 v_col;
out float v_over;
void main() {
  int o = int(a_col.w) * ${OBJ_TEXELS};
  vec4 r0 = texelFetch(u_obj, ivec2(o, 0), 0);
  vec4 r1 = texelFetch(u_obj, ivec2(o + 1, 0), 0);
  vec4 r2 = texelFetch(u_obj, ivec2(o + 2, 0), 0);
  vec4 st = texelFetch(u_obj, ivec2(o + 3, 0), 0);
  int flags = int(a_info.x + 0.5);
  float seed = a_info.y;
  vec3 p = a_pos;
  float k = 1.0;
  float radius = a_rad;
  v_over = 0.0;
  if ((flags & ${G.steam}) != 0) {
    // Up off the broth towards the camera, curling, spreading and thinning out.
    float u = fract(u_time * (0.045 + seed * 0.05) + seed * 7.0);
    p.z += u * a_info.z;
    p.xy += vec2(sin(seed * 40.0 + u_time * 0.3), cos(seed * 30.0 + u_time * 0.23)) * 40.0 * u;
    radius *= 1.0 + u * 2.2;
    k *= pow(sin(u * 3.14159), 1.5) * u_steam;
    v_over = 0.25;
  }
  if ((flags & ${G.wisp}) != 0) {
    if (st.z < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float u = fract(u_time * (0.7 + seed * 0.5) + seed * 7.0);
    p.z += u * a_info.z;
    p.xy += vec2(sin(seed * 30.0 + u_time * 2.0), cos(seed * 20.0 + u_time * 1.7)) * 10.0 * u;
    radius *= 1.0 + u * 1.6;
    k *= sin(u * 3.14159);
    // Only over the broth: dithered over the board and bowls it reads as a grid of dots.
    v_over = 0.0;
  }
  if ((flags & ${G.splash}) != 0) {
    float age = u_time - st.w;
    if (st.z < 0.5 || age < 0.0 || age > 1.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float ang = seed * 6.28318;
    float dist = a_info.z * pow(age / 1.1, 0.6);
    p.xy += vec2(cos(ang), sin(ang)) * dist;
    p.z += (150.0 + seed * 120.0) * age - 380.0 * age * age;
    if (p.z < -2.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    k *= 1.0 - age / 1.1;
    // Drops show against the broth; over solid things they would dither into a grid of dots.
    v_over = 0.0;
  }
  if ((flags & ${G.flicker}) != 0) k *= 0.75 + 0.25 * sin(u_time * (2.0 + seed * 3.0) + seed * 40.0);
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
in float v_over;
out vec4 o;
void main() {
  vec2 q = (gl_PointCoord - 0.5) * 2.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float a = exp(-r2 * 3.2) * (1.0 - r2);
  o = vec4(v_col * a, v_over * a * max(v_col.r, max(v_col.g, v_col.b)));
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
uniform vec3 u_pal[${BROTH_PALETTE.length}];
uniform float u_palSide[${BROTH_PALETTE.length}];
uniform float u_time, u_scroll, u_px, u_artH, u_s, u_boil;
// The divider: centre x, swing, phase y, wavenumber; and its half thickness.
uniform vec4 u_wall;
uniform float u_wallHalf;
uniform vec3 u_plumes[${MAX_PLUMES}];
uniform int u_nPlumes;
// Rings: x, y, age, strength.
uniform vec4 u_ripples[${MAX_RIPPLES}];
uniform int u_nRipples;
// Big bubbles beside the food: x, y, age, radius.
uniform vec4 u_bubbles[${MAX_BUBBLES}];
uniform int u_nBubbles;
// How much finishing to do: 2 everything, 1 without the shimmer, reflections and light shafts, 0 also with simpler oil and shadows.
uniform int u_quality;
// Rings peeling off food breaking the surface: x, y, age, its size.
uniform vec4 u_rings[${MAX_RINGS}];
uniform int u_nRings;
// The ladle's whirlpool: centre, strength, size (strength 0: none).
uniform vec4 u_vortex;
uniform vec3 u_light;
out vec4 o;
const float BAYER[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm2(vec2 p) { return vn(p) * 0.55 + vn(p * 2.03 + 7.1) * 0.3 + vn(p * 4.1 + 3.3) * 0.15; }
vec3 hex(float r, float g, float b) { return vec3(r, g, b) / 255.0; }

int cover(ivec2 p) {
  int n = 0;
  for (int i = 0; i < 4; i++) if (texelFetch(u_solid, p * 2 + ivec2(i & 1, i >> 1), 0).a > 0.5) n++;
  return n;
}

/** Signed distance from the divider's centre line (negative on the mala side). */
float wallDist(vec2 w) {
  float a = (w.y - u_wall.z) * u_wall.w;
  float slope = u_wall.y * u_wall.w * cos(a);
  return (w.x - (u_wall.x + u_wall.y * sin(a))) / sqrt(1.0 + slope * slope);
}

/** The broth at page point w. */
// Set by broth(): whether this point is on the chili oil (for reflections).
bool g_oil = false;

vec3 broth(vec2 w) {
  g_oil = false;
  float t = u_time;
  float dist = wallDist(w);
  bool mala = dist < 0.0;
  float heat = 0.0;
  float sig = 120.0 * u_s;
  for (int i = 0; i < ${MAX_PLUMES}; i++) {
    if (i >= u_nPlumes) break;
    vec2 e = w - u_plumes[i].xy;
    heat += exp(-dot(e, e) / (sig * sig)) * u_plumes[i].z;
  }
  heat = min(heat, 1.3) * u_boil;
  // In the ladle's whirlpool the broth's pattern is wound round its middle, tighter near the centre, and turning.
  vec2 wv = w;
  float swirl = 0.0;
  if (u_vortex.z > 0.01) {
    vec2 e = w - u_vortex.xy;
    float d = length(e);
    // Strong near the middle, gone a little past its edge.
    swirl = u_vortex.z * exp(-(d * d) / (u_vortex.w * u_vortex.w));
    float a = swirl * (2.5 + t * 1.3);
    float ca = cos(a), sa = sin(a);
    wv = u_vortex.xy + vec2(ca * e.x - sa * e.y, sa * e.x + ca * e.y);
  }
  // Slow currents: everything is drawn through a drifting warp, faster where it boils.
  vec2 q = wv / (120.0 * u_s);
  vec2 warp = vec2(vn(q * 0.6 + vec2(t * 0.05, 0.0)), vn(q * 0.6 + vec2(5.2, -t * 0.045))) - 0.5;
  vec2 r = q + warp * (1.4 + heat * 0.8);
  vec3 col;
  if (mala) {
    // Dark chili broth, in broad soft bands.
    float base = fbm2(r * 0.9 + t * 0.015);
    col = mix(hex(74., 12., 10.), hex(100., 18., 12.), smoothstep(0.35, 0.7, base));
    // Wide sheets of oil where the current gathers it, with a lip that catches the lamp.
    float oil = fbm2(r * 0.6 + vec2(-t * 0.02, t * 0.015) + 11.0);
    if (oil > 0.64) col = abs(oil - 0.64) < 0.014 ? hex(192., 56., 20.) : hex(128., 26., 14.);
    // Beads of red oil drifting on top. Each is a blob in a shared field, so neighbours that wander close run
    // together into one and part again; a popping bubble pushes the oil back from where it burst.
    float cs = 56.0 * u_s;
    vec2 wc = w + warp * 50.0 * u_s;
    vec2 c0 = floor(wc / cs);
    vec2 ld = normalize(u_light.xy);
    // A step towards the lamp: where the field falls off that way is the rim facing the light.
    vec2 wl = wc + ld * 2.5 * u_s;
    float field = 0.0, fieldL = 0.0;
    int span = u_quality > 0 ? 1 : 0;
    for (int j = -span; j <= span; j++) for (int i = -span; i <= span; i++) {
      vec2 c = c0 + vec2(float(i), float(j));
      if (h21(c + 0.7) < 0.5) continue;
      float hr = h21(c + 4.4);
      vec2 ctr = (c + 0.5 + 0.32 * vec2(sin(t * (0.1 + hr * 0.12) + hr * 20.0), cos(t * (0.08 + hr * 0.1) + hr * 31.0))) * cs;
      float rr = (7.0 + 12.0 * hr * hr) * u_s;
      vec2 e = wc - ctr;
      field += rr * rr / (dot(e, e) + 1.0);
      e = wl - ctr;
      fieldL += rr * rr / (dot(e, e) + 1.0);
    }
    for (int i = 0; i < ${MAX_BUBBLES}; i++) {
      if (i >= u_nBubbles) break;
      vec4 bb = u_bubbles[i];
      float k = (bb.z - ${BUBBLE_GROW.toFixed(2)}) / 0.6;
      if (k < 0.0 || k > 1.0) continue;
      float push = 1.0 - smoothstep(0.0, bb.w * (1.4 + k * 2.2), length(w - bb.xy));
      field *= 1.0 - 0.85 * push * (1.0 - k * 0.6);
      fieldL *= 1.0 - 0.85 * push * (1.0 - k * 0.6);
    }
    bool oily = oil > 0.64 || field > 1.0;
    g_oil = oily;
    if (field > 1.0) {
      // A glossy bead: a lit crescent on the lamp's side of its edge, and a glint just in from it.
      col = hex(160., 38., 18.);
      if (field < 1.6 && fieldL < field * 0.86) col = hex(220., 84., 24.);
      else if (field > 2.2 && field < 3.6 && fieldL < field * 0.93) col = hex(255., 160., 64.);
    }
    // The lamp glinting off the oil: sparks that come and go, drifting with it.
    if (oily) {
      vec2 gc = floor(wc / (7.0 * u_s));
      float gh = h21(gc + 17.0);
      float on = fract(t * (0.5 + gh * 0.6) + gh * 13.0);
      if (gh > 0.9 && on < 0.12) col = on < 0.05 ? hex(255., 204., 106.) : hex(255., 160., 64.);
    }
    // A few flakes of chili and sesame seeds.
    vec2 fc = floor((w + warp * 60.0) / (6.0 * u_s));
    float fh = h21(fc);
    if (fh > 0.994) col = fh > 0.998 ? hex(255., 204., 106.) : hex(192., 56., 20.);
  } else {
    // Milky bone broth.
    float base = fbm2(r * 0.9 + t * 0.012);
    col = mix(hex(212., 196., 162.), hex(230., 218., 188.), smoothstep(0.35, 0.7, base));
    // Little golden rounds of fat on the surface.
    float cs = 44.0 * u_s;
    vec2 wc = w + warp * 60.0 * u_s;
    vec2 c = floor(wc / cs);
    if (h21(c + 0.7) > 0.6) {
      vec2 ctr = (c + 0.3 + 0.4 * vec2(h21(c + 1.3), h21(c + 2.1))) * cs;
      float hr = h21(c + 4.4);
      float rr = (5.0 + 12.0 * hr * hr) * u_s;
      float l = length(wc - ctr);
      if (l < rr) col = l > rr - 1.8 * u_s ? hex(246., 214., 144.) : hex(242., 234., 212.);
    }
  }
  // The surface shimmering: thin bright filaments where two drifting ripple fields cross, always moving.
  float sh = vn(wv / (34.0 * u_s) + vec2(t * 0.35, -t * 0.27) + warp * 3.0) + vn(wv / (21.0 * u_s) + vec2(-t * 0.22, t * 0.31) + 7.3);
  if (u_quality > 1 && abs(sh - 1.0) < 0.03) col *= mala ? 1.22 : 1.05;
  // Spiral arms of light round the whirlpool, and a dimple at its middle.
  if (swirl > 0.05) {
    vec2 e = w - u_vortex.xy;
    float d = length(e) + 1.0;
    float arm = sin(atan(e.y, e.x) * 3.0 + log(d) * 5.0 - t * 5.0);
    if (arm > 0.55) col *= 1.0 + swirl * (mala ? 0.6 : 0.12);
    if (d < u_vortex.w * 0.18 * u_vortex.z) col *= mala ? 0.6 : 0.85;
  }
  // The broth climbs the divider a little and catches the light there.
  float ad = abs(dist) - u_wallHalf;
  if (ad < 8.0 * u_s) col *= 1.0 + 0.28 * (1.0 - ad / (8.0 * u_s));

  // Where it rolls hard, the surface churns.
  if (u_quality > 0 && heat > 0.8) col *= 1.0 + (vn(w / (14.0 * u_s) + vec2(t * 2.1, -t * 1.7)) - 0.5) * 0.4 * min(1.0, heat - 0.8);
  // Bubbles where it's hot: each cell may hold one, growing until it pops.
  float cs = 44.0 * u_s;
  vec2 c = floor(w / cs);
  float hb = h21(c + 0.31);
  if (h21(c + 3.1) < (0.1 + heat * 0.6)) {
    vec2 ctr = (c + 0.3 + 0.4 * vec2(h21(c + 1.7), h21(c + 2.9))) * cs;
    float ph = fract(t * (0.3 + hb * 0.5) * (0.5 + heat) + hb * 9.0);
    // Small and quiet where it simmers, big where it rolls.
    float rad = mix(3.5, 7.0, h21(c + 5.5)) * (1.0 + smoothstep(0.45, 1.2, heat) * 1.3) * u_s;
    vec2 rel = w - ctr;
    float l = length(rel);
    if (ph < 0.86) {
      float rr = rad * smoothstep(0.0, 0.7, ph);
      if (l < rr) {
        vec2 u = rel / max(rr, 0.01);
        float lit = dot(u, normalize(u_light.xy));
        if (l > rr * 0.62 && lit > 0.35) col = mala ? hex(220., 84., 24.) : hex(252., 246., 232.);
        else if (l > rr * 0.7 && lit < -0.3) col = mala ? hex(50., 8., 8.) : hex(158., 140., 112.);
        else col = mala ? hex(128., 26., 14.) : hex(212., 196., 162.);
        if (length(u - normalize(u_light.xy) * 0.38) < 0.2) col = mala ? hex(255., 160., 64.) : vec3(1.0);
      }
    } else {
      // A popped bubble leaves a ring that spreads and fades.
      float rr = rad * (1.0 + (ph - 0.86) / 0.14 * 1.2);
      if (abs(l - rr) < 2.4 * u_s && h21(floor(rel * 0.25)) > (ph - 0.86) / 0.14 * 0.8) col *= mala ? 1.35 : 1.06;
    }
  }

  // The big bubbles that knock the food about: a dome swelling up beside it, then a burst ring.
  for (int i = 0; i < ${MAX_BUBBLES}; i++) {
    if (i >= u_nBubbles) break;
    vec4 bb = u_bubbles[i];
    vec2 rel = w - bb.xy;
    float l = length(rel);
    if (l > bb.w * 2.6) continue;
    if (bb.z < ${BUBBLE_GROW.toFixed(2)}) {
      float rr = bb.w * (0.4 + 0.6 * smoothstep(0.0, ${(BUBBLE_GROW * 0.8).toFixed(2)}, bb.z));
      if (l < rr) {
        vec2 u = rel / rr;
        vec2 ld = normalize(u_light.xy);
        float lit = dot(u, ld);
        // A glossy dome: brighter than the broth, a lit rim towards the lamp, a dark crescent away from it.
        col = mala ? hex(192., 56., 20.) : hex(242., 234., 212.);
        if (l > rr * 0.6 && lit > 0.2) col = mala ? hex(255., 160., 64.) : hex(252., 246., 232.);
        else if (l > rr * 0.68 && lit < -0.2) col = mala ? hex(50., 8., 8.) : hex(158., 140., 112.);
        if (length(u - ld * 0.38) < 0.22) col = mala ? hex(255., 204., 106.) : vec3(1.0);
      }
    } else {
      float k = (bb.z - ${BUBBLE_GROW.toFixed(2)}) / 0.6;
      float rr = bb.w * (1.0 + k * 1.6);
      if (abs(l - rr) < 2.4 * u_s && h21(floor(rel * 0.25)) > k * 0.8) col *= mala ? 1.4 : 1.07;
    }
  }

  // Something breaking the surface: a bright ring of broth peels off its edge and spreads, breaking into arcs.
  for (int i = 0; i < ${MAX_RINGS}; i++) {
    if (i >= u_nRings) break;
    vec4 rg = u_rings[i];
    vec2 rel = w - rg.xy;
    float k = rg.z / 1.3;
    float rr = rg.w * 0.85 + rg.z * 40.0 * u_s;
    float band = abs(length(rel) - rr);
    if (k > 1.0 || band > 3.0 * u_s) continue;
    float arc = h21(vec2(floor((atan(rel.y, rel.x) + 3.1416) * 2.2), rg.x));
    if (arc < 0.25 + k * 0.6) continue;
    col = mix(col, mala ? hex(220., 84., 24.) : hex(252., 248., 236.), (1.0 - k) * 0.9);
  }

  // Rings where something landed, was lifted out, or the spoon went by.
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    if (i >= u_nRipples) break;
    vec4 rp = u_ripples[i];
    float age = rp.z;
    float l = length(w - rp.xy);
    float band = l - age * 110.0 * u_s;
    if (abs(band) > 14.0 * u_s) continue;
    float amp = rp.w * max(0.0, 1.0 - age / 2.4);
    col *= 1.0 + amp * 0.24 * cos(band * 0.42 / u_s) * exp(-band * band / (40.0 * u_s * u_s));
  }
  return col;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  // The page point under this art pixel (the canvas's rows run bottom-up), on the broth's plane.
  vec2 w = vec2((float(p.x) + 0.5) * u_px, (u_artH - float(p.y) - 0.5) * u_px + u_scroll);
  vec4 s[4];
  int n = 0;
  for (int i = 0; i < 4; i++) { s[i] = texelFetch(u_solid, p * 2 + ivec2(i & 1, i >> 1), 0); if (s[i].a > 0.5) n++; }
  ivec2 ab = p % 4;
  float bay = (BAYER[ab.y * 4 + ab.x] + 0.5) / 16.0;
  bool under = false;
  float depth = 0.0;
  if (n >= 2) {
    int best = 0, bestVotes = 0;
    for (int i = 0; i < 4; i++) {
      if (s[i].a < 0.5) continue;
      int v = 0;
      for (int j = 0; j < 4; j++) if (s[j].a > 0.5 && abs(s[j].r - s[i].r) < 0.002 && abs(s[j].g - s[i].g) < 0.002) v++;
      if (v > bestVotes) { bestVotes = v; best = i; }
    }
    float h = (s[best].b - 0.25) * 512.0;
    // Just under the surface it shows through in its own colours, a step or two darker; deeper, it's only a
    // darker patch of broth in its shape (see below). So something rising can be watched coming up.
    depth = -h;
    under = h < -11.0;
    if (!under) {
      int mat = int(s[best].r * 255.0 + 0.5);
      int shade = int(s[best].g * 255.0 + 0.5);
      int open = 0;
      if (cover(p + ivec2(1, 0)) < 2) open++;
      if (cover(p - ivec2(1, 0)) < 2) open++;
      if (cover(p + ivec2(0, 1)) < 2) open++;
      if (cover(p - ivec2(0, 1)) < 2) open++;
      // Never down to the darkest step, which would read as an outline.
      if (open > 0 && open < 4) shade = shade >= 3 ? min(shade + 1, ${SHADES - 1}) : max(shade - 1, 1);
      if (h < -2.5) shade = max(min(shade, 3) - (h < -6.0 ? 2 : 1), 0);
      vec3 col = texelFetch(u_ramps, ivec2(shade, mat), 0).rgb;
      // Steam and spray that drift over it, dithered in as their own colour.
      vec4 ov = vec4(0.0);
      for (int i = 0; i < 4; i++) ov += texelFetch(u_glow, p * 2 + ivec2(i & 1, i >> 1), 0);
      ov *= 0.25;
      if (ov.a > 0.03) {
        vec3 oc = ov.rgb / max(ov.a, 1e-3) * 0.9 + col * 0.4;
        float bd = 1e9;
        vec3 pk = oc;
        for (int i = 0; i < ${BROTH_PALETTE.length}; i++) { vec3 e = u_pal[i] - oc; float dd = dot(e, e); if (dd < bd) { bd = dd; pk = u_pal[i]; } }
        if (clamp(ov.a * 1.2, 0.0, 0.22) > bay) col = pk;
      }
      o = vec4(col, 1.0);
      return;
    }
  }
  vec3 c = broth(w);
  // Something just under the surface: a darker patch of broth in its shape.
  if (under) c *= mix(0.55, 0.85, clamp((depth - 11.0) / 24.0, 0.0, 1.0));
  // Shadows of things above the broth, cast down and to the right, further the higher they are. Floating food
  // throws a short soft one (as if the lamp were lower), so it reads as sitting on the broth; its edge is dithered.
  vec2 dir = -u_light.xy / u_light.z;
  float hs = 4.0;
  float shadow = 0.0;
  for (int j = 0; j < 13; j++) {
    for (int k = 0; k < (u_quality > 0 ? 2 : 1); k++) {
      vec2 off = dir * hs * (k == 0 ? 1.0 : 0.72) / u_px;
      ivec2 q = ivec2(floor(vec2(float(p.x) - off.x, float(p.y) + off.y) + 0.5));
      if (q.x < 0 || q.y < 0) continue;
      vec4 t = texelFetch(u_solid, q * 2, 0);
      if (t.a < 0.5) continue;
      float hh = (t.b - 0.25) * 512.0;
      if (hh < -1.0) continue;
      float he = hh * 1.6 + 6.0 * u_s;
      if (he > hs * 0.68 && he < hs * 1.5) shadow = max(shadow, k == 0 ? 1.0 : 0.5);
    }
    if (shadow >= 1.0) break;
    hs *= 1.45;
  }
  if (shadow > 0.75 || (shadow > 0.25 && bay < 0.5)) c *= 0.6;
  // The glossy oil mirrors food floating beside it: a wavering copy, a few pixels up, every other row.
  else if (u_quality > 1 && g_oil && (p.y & 1) == 0) {
    ivec2 q = p + ivec2(int(floor(sin(float(p.y) * 0.7 + u_time * 3.0) + 0.5)), 3);
    vec4 rf = texelFetch(u_solid, q * 2, 0);
    if (rf.a > 0.5 && (rf.b - 0.25) * 512.0 > -1.0) {
      vec3 rc = texelFetch(u_ramps, ivec2(min(int(rf.g * 255.0 + 0.5), 3), int(rf.r * 255.0 + 0.5)), 0).rgb;
      c = mix(c, rc, 0.45);
    }
  }
  vec3 g = vec3(0.0);
  for (int i = 0; i < 4; i++) g += texelFetch(u_glow, p * 2 + ivec2(i & 1, i >> 1), 0).rgb;
  // Shafts of lamplight slanting down from the lamp's side, pinned to the pot. They only show where steam drifts
  // through them: steam inside a shaft glows, steam between them is dimmer.
  vec2 across = normalize(vec2(-u_light.y, u_light.x));
  float sa = dot(w, across) / (110.0 * u_s);
  float shaft = u_quality < 2 ? 0.25 : pow(0.5 + 0.5 * sin(sa + vn(vec2(sa * 0.25, u_time * 0.04)) * 4.0), 5.0) + 0.6 * pow(0.5 + 0.5 * sin(sa * 2.3 + 1.7 + u_time * 0.05), 8.0);
  // Steam shows over the dark chili broth; over the pale broth it would only speckle.
  c += g * (wallDist(w) < 0.0 ? 0.25 : 0.1) * (0.45 + shaft * 2.2);
  // And a faint haze of light in the shafts themselves, warmer over the chili oil.
  if (u_quality > 1) c += shaft * (wallDist(w) < 0.0 ? vec3(0.07, 0.035, 0.015) : vec3(0.025, 0.02, 0.012));
  // Nearest two palette colours, and a Bayer choice between them.
  float d1 = 1e9, d2 = 1e9;
  vec3 c1 = c, c2 = c;
  float side = wallDist(w) < 0.0 ? -1.0 : 1.0;
  for (int i = 0; i < ${BROTH_PALETTE.length}; i++) {
    if (u_palSide[i] * side < -0.5) continue;
    vec3 e = (u_pal[i] - c) * vec3(1.0, 1.2, 0.7);
    float dd = dot(e, e);
    if (dd < d1) { d2 = d1; c2 = c1; d1 = dd; c1 = u_pal[i]; }
    else if (dd < d2) { d2 = dd; c2 = u_pal[i]; }
  }
  float tt = sqrt(d1) / (sqrt(d1) + sqrt(d2) + 1e-6);
  o = vec4(tt > bay ? c2 : c1, 1.0);
}`;

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

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

/** The lamp overhead: up and to the left, so shadows fall down and to the right. */
const LIGHT = (() => { const v = [-0.35, -0.5, 1]; const l = Math.hypot(...v); return v.map(x => x / l); })();

export interface HotpotFrame {
  viewW: number;
  viewH: number;
  /** Page scroll, already snapped to whole art pixels. */
  scrollY: number;
  /** Camera offset for parallax, CSS pixels. */
  offX: number;
  offY: number;
  time: number;
  dt: number;
  pointer: { x: number; y: number } | null;
}

export class HotpotView {
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
  /** How much finishing the broth gets: 2 on the high tier, 1 medium, 0 low (see the post shader). */
  quality = 2;
  /** The scene being drawn, for the debug tools. */
  scene: HotpotScene | null = null;
  private pose = new Float32Array(0);
  private artW = 0;
  private artH = 0;
  private floatGlow: boolean;
  private maxPoint: number;
  private plumeBuf = new Float32Array(MAX_PLUMES * 3);
  private rippleBuf = new Float32Array(MAX_RIPPLES * 4);
  private bubbleBuf = new Float32Array(MAX_BUBBLES * 4);
  private ringBuf = new Float32Array(MAX_RINGS * 4);
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
    gl.uniform3fv(this.u(this.postProg, 'u_pal'), new Float32Array(BROTH_PALETTE.flatMap(c => hex(c).map(v => v / 255))));
    gl.uniform1fv(this.u(this.postProg, 'u_palSide'), new Float32Array(PALETTE_SIDE));
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

  /** Uploads a newly built scene. */
  setScene(scene: HotpotScene) {
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

  /** Sizes the canvas and the targets for a viewport; returns the canvas size in art pixels. */
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

  draw(fr: HotpotFrame) {
    const gl = this.gl;
    const scene = this.scene;
    if (!scene || !this.solidFbo || !this.glowFbo) return;
    stepEvents(scene, fr.time, fr.dt, fr);
    stepSauce(scene, fr.dt, fr.time, fr, fr.pointer);
    stepLife(scene, fr.time, fr.dt, fr, fr.pointer);
    const life = scene.life;
    poseBodies(scene, this.pose);
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
      gl.uniform1f(this.u(prog, 'u_far'), f * 4);
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
    gl.uniform3f(this.u(this.solidProg, 'u_light'), LIGHT[0], LIGHT[1], LIGHT[2]);
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
    gl.uniform1f(this.u(this.glowProg, 'u_steam'), 0.6 + life.boil * 0.4);
    gl.bindVertexArray(this.glowVao);
    gl.drawArrays(gl.POINTS, 0, scene.glowCount);

    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.artW, this.artH);
    const post = this.postProg;
    gl.useProgram(post);
    gl.uniform1f(this.u(post, 'u_time'), fr.time);
    gl.uniform1f(this.u(post, 'u_scroll'), fr.scrollY);
    gl.uniform1f(this.u(post, 'u_px'), this.pixel);
    gl.uniform1f(this.u(post, 'u_artH'), this.artH);
    gl.uniform1f(this.u(post, 'u_s'), scene.s);
    gl.uniform1f(this.u(post, 'u_boil'), life.boil);
    gl.uniform1i(this.u(post, 'u_quality'), this.quality);
    gl.uniform3f(this.u(post, 'u_light'), LIGHT[0], LIGHT[1], LIGHT[2]);
    const wl = scene.wall;
    gl.uniform4f(this.u(post, 'u_wall'), wl.cx, wl.amp, wl.y0, wl.k);
    gl.uniform1f(this.u(post, 'u_wallHalf'), wl.half);
    // The plumes and rings near the view.
    const top = fr.scrollY - 400, bottom = fr.scrollY + fr.viewH + 400;
    let np = 0;
    for (const [x, y, st] of scene.plumes) {
      if (y < top || y > bottom) continue;
      if (np >= MAX_PLUMES) break;
      this.plumeBuf.set([x, y, st], np * 3);
      np++;
    }
    gl.uniform3fv(this.u(post, 'u_plumes'), this.plumeBuf);
    gl.uniform1i(this.u(post, 'u_nPlumes'), np);
    let nr = 0;
    for (const r of life.ripples) {
      if (nr >= MAX_RIPPLES) break;
      this.rippleBuf.set([r.x, r.y, fr.time - r.t0, r.a], nr * 4);
      nr++;
    }
    gl.uniform4fv(this.u(post, 'u_ripples'), this.rippleBuf);
    gl.uniform1i(this.u(post, 'u_nRipples'), nr);
    let nb = 0;
    for (const b of life.bubbles) {
      if (nb >= MAX_BUBBLES || b.y < top || b.y > bottom) continue;
      this.bubbleBuf.set([b.x, b.y, fr.time - b.t0, b.r], nb * 4);
      nb++;
    }
    gl.uniform4fv(this.u(post, 'u_bubbles'), this.bubbleBuf);
    let ng = 0;
    for (const r of life.rings) {
      if (ng >= MAX_RINGS || r.y < top || r.y > bottom) continue;
      this.ringBuf.set([r.x, r.y, fr.time - r.t0, r.R], ng * 4);
      ng++;
    }
    gl.uniform4fv(this.u(post, 'u_rings'), this.ringBuf);
    gl.uniform1i(this.u(post, 'u_nRings'), ng);
    const vt = life.vortex;
    gl.uniform4f(this.u(post, 'u_vortex'), vt ? vt.x : 0, vt ? vt.y : 0, vt ? vt.k : 0, vt ? vt.R : 1);
    gl.uniform1i(this.u(post, 'u_nBubbles'), nb);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.solidTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glowTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.rampTex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  }

  /** Frees the GPU resources. The context itself stays, so a remount on the same canvas can use it again. */
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
