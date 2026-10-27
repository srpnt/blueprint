// B · Blueprint (final round): Q's own hero mesh, the "rings" block (.wp-block-qfse-rings-section), rebuilt crisp.
// Reads the SAME data-q-rings JSON the editor sets per block in WordPress (live renderer: ref/q-rings-original-view.js):
// a torus of noise-deformed rings in perspective with the same parameters and motion family (ring-count breathing,
// amplitude swell, morph, slow spin, tilt wobble). Drawn in WebGL as analytic-antialiased ribbons whose positions are
// computed on the GPU (smooth curves, DPR ≤ 2), per-vertex depth fade, the config colours as a teal→green gradient and
// a gentle eased cursor parallax. The canvas sits in the document between the base field and the content, runs past the
// hero bottom and fades out with a CSS mask, so the shape is never cut by the section box.
// Paused off-screen (IntersectionObserver) and when the tab is hidden; reduced motion or ?still=1 = one static frame.
(() => {
  'use strict';
  const blocks = [...document.querySelectorAll('.wp-block-qfse-rings-section__bg[data-q-rings]')];
  if (!blocks.length) return;
  const STILL = /[?&]still=1/.test(location.search);
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const DEF = { seed: null, mode: 'flat', speed: 1, ringsMin: 18, ringsMax: 48, ringsSpeed: .015, ampMin: .02, ampMax: .12,
    ampSpeed: .02, ampCurve: .6, noiseScale: 1.6, layerOffset: .02, morphSpeed: .03, rotationSpeed: .03, innerRadius: .12,
    size: .85, x: .5, y: .5, mobileX: null, mobileY: null, mobileSize: null, mobileBreakpoint: 768, tilt: 0, points: 180,
    majorRadius: .7, tubeRadius: .26, tubeArc: 1, perspective: 4, depthFade: .6, tiltWobble: .15, wobbleSpeed: .02,
    lineWidth: 1, colors: ['#01FF40', '#01FF40'], opacity: .9, innerFade: .3, respectReducedMotion: true };
  const pick = (v, d) => (v == null || v === '' ? d : v);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const mix = (a, b, k) => a + (b - a) * k;
  const rgb = (h) => { let s = String(h).replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&');
    const n = parseInt(s, 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const rng = (seed) => { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const noise1 = (rand) => { const g = new Float32Array(256); for (let i = 0; i < 256; i++) g[i] = rand() * 2 - 1;
    return (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = g[i & 255] * f, b = g[(i + 1) & 255] * (f - 1);
      return 2 * (a + (b - a) * u); }; };

  const SNOISE = `vec3 m289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 m289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 perm(vec4 x){ return m289(((x * 34.0) + 1.0) * x); }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
  i = m289(i);
  vec4 p = perm(perm(perm(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec3 ns = 0.142857142857 * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0; vec4 s1 = floor(b1) * 2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 nr = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
  p0 *= nr.x; p1 *= nr.y; p2 *= nr.z; p3 *= nr.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0); m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}`;

  const VS = `attribute vec3 aV;
uniform vec2 uRes, uC, uOff; uniform vec3 uC0, uC1;
uniform float uDpr, uR, uP, uCount, uAmp, uRot, uTilt, uZ, uFlat, uFull, uArc, uMajor, uTube, uPersp, uCurve, uNs, uLayer,
  uOp, uDF, uLW, uInner, uIFade;
varying float vD, vHW, vA; varying vec3 vCol;
${SNOISE}
float ringF(float r){ return uFull > 0.5 ? r / uCount : (uCount > 1.0 ? r / (uCount - 1.0) : 0.0); }
vec3 ringPt(float r, float j){
  float ph = 6.2831853 * j / uP, ci = cos(ph), si = sin(ph), cr = cos(uRot), sr = sin(uRot);
  if (uFlat > 0.5) {
    float m = clamp(ringF(r), 0.0, 1.0), y = uInner + (1.0 - uInner) * m, S = uAmp * (1.0 - uCurve + uCurve * m), k = y * uNs;
    vec2 h = vec2(ci, si) * (y + S * snoise(vec3(ci * k + uOff.x, si * k + uOff.y, uZ + r * uLayer)));
    return vec3(uC.x + (h.x * cr - h.y * sr) * uR, uC.y + (h.x * sr + h.y * cr) * cos(uTilt) * uR, 0.0);
  }
  float F = ringF(r), T = uFull > 0.5 ? F * 6.2831853 : (F - 0.5) * uArc, O = cos(T), Sn = sin(T);
  float k = uAmp * (1.0 - uCurve + uCurve * (0.5 + 0.5 * O)), q = uMajor + uTube * O;
  vec3 p = vec3(q * ci, q * si, uTube * Sn);
  p += vec3(O * ci, O * si, Sn) * (k * snoise(p * uNs + vec3(uOff, uZ + r * uLayer)));
  vec2 xy = vec2(p.x * cr - p.y * sr, p.x * sr + p.y * cr);
  float ct = cos(uTilt), st = sin(uTilt), M = xy.y * ct - p.z * st, w = xy.y * st + p.z * ct;
  float s = uPersp > 0.0 ? uPersp / (uPersp - w) : 1.0;
  return vec3(uC.x + xy.x * s * uR, uC.y + M * s * uR, w);
}
void main(){
  float r = aV.x, live = clamp(uCount - r, 0.0, 1.0);
  vA = 0.0; vD = 0.0; vHW = 0.5; vCol = uC0;
  if (live < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec3 c = ringPt(r, aV.y);
  vec2 t = ringPt(r, aV.y + 1.0).xy - ringPt(r, aV.y - 1.0).xy;
  float tl = length(t);
  vec2 n = tl > 1e-5 ? vec2(-t.y, t.x) / tl : vec2(0.0, 1.0);
  float w = max(uLW * uDpr, 1.0);
  vHW = 0.5 * w; vD = aV.z * (vHW + 1.0);
  float dn = clamp(0.5 + c.z * 0.5 / max(uMajor + uTube, 1e-3), 0.0, 1.0);
  float F = clamp(ringF(r), 0.0, 1.0);
  vec3 col;
  if (uFlat > 0.5) { vA = uOp * live * (1.0 - uIFade * (1.0 - F)); col = mix(uC0, uC1, F); }
  else {
    float O = cos(uFull > 0.5 ? F * 6.2831853 : (F - 0.5) * uArc);
    vA = uOp * live * (1.0 - uDF * (1.0 - dn) * (1.0 - dn * 0.35));
    col = mix(uC0, uC1, uFull > 0.5 ? 0.5 - 0.5 * O : F);
    col = mix(col, uC0, 0.2 * dn);
  }
  vA *= min(1.0, uLW * uDpr);
  vCol = col;
  vec2 clip = (c.xy * uDpr + n * vD) / (uRes * uDpr) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;
  const FS = `precision mediump float;
varying float vD, vHW, vA; varying vec3 vCol;
void main(){ float a = vA * clamp(vHW + 0.5 - abs(vD), 0.0, 1.0); if (a < 0.002) discard; gl_FragColor = vec4(vCol * a, a); }`;

  const UN = ['uRes', 'uC', 'uOff', 'uC0', 'uC1', 'uDpr', 'uR', 'uP', 'uCount', 'uAmp', 'uRot', 'uTilt', 'uZ', 'uFlat', 'uFull',
    'uArc', 'uMajor', 'uTube', 'uPersp', 'uCurve', 'uNs', 'uLayer', 'uOp', 'uDF', 'uLW', 'uInner', 'uIFade'];
  const all = [];

  function Rings(el) {
    let cfg = {};
    try { cfg = JSON.parse(el.getAttribute('data-q-rings') || '{}'); } catch (e) { console.warn('[rings] invalid data-q-rings', e); }
    const o = { ...DEF, ...cfg };
    const sec = el.closest('.wp-block-qfse-rings-section') || el.parentElement;
    const cv = document.createElement('canvas');
    cv.className = 'bp-rings'; cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.querySelector('.wp-site-blocks') || document.body.firstChild);
    const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) { cv.remove(); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const U = {}; UN.forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

    // geometry: N rings × (P + 1) points × 2 sides; ribbons expanded + antialiased in the shaders
    const N = Math.max(1, Math.ceil(Math.max(o.ringsMin, o.ringsMax)));
    const P = Math.max(64, Math.min(Math.max(256, Math.round(o.points) * 2), Math.floor(65000 / (N * 2)) - 1));
    const verts = new Float32Array(N * (P + 1) * 2 * 3), idx = new Uint16Array(N * P * 6);
    let v = 0, q = 0;
    for (let r = 0; r < N; r++) {
      for (let j = 0; j <= P; j++) { verts.set([r, j, -1, r, j, 1], v); v += 6; }
      for (let j = 0; j < P; j++) { const b = (r * (P + 1) + j) * 2; idx.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], q); q += 6; }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    const aV = gl.getAttribLocation(prog, 'aV'); gl.enableVertexAttribArray(aV); gl.vertexAttribPointer(aV, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);

    const cols = (Array.isArray(o.colors) && o.colors.length ? o.colors : DEF.colors).map(rgb);
    const c0 = cols[0], c1 = cols[cols.length - 1];
    const torus = o.mode === 'torus', full = o.tubeArc >= 1;
    gl.uniform3fv(U.uC0, c0); gl.uniform3fv(U.uC1, c1); gl.uniform1f(U.uP, P);
    gl.uniform1f(U.uFlat, torus ? 0 : 1); gl.uniform1f(U.uFull, full ? 1 : 0);
    gl.uniform1f(U.uArc, Math.max(.01, Math.min(1, o.tubeArc)) * Math.PI * 2);
    gl.uniform1f(U.uMajor, o.majorRadius); gl.uniform1f(U.uTube, o.tubeRadius); gl.uniform1f(U.uPersp, o.perspective);
    gl.uniform1f(U.uCurve, o.ampCurve); gl.uniform1f(U.uNs, o.noiseScale); gl.uniform1f(U.uLayer, o.layerOffset);
    gl.uniform1f(U.uOp, o.opacity); gl.uniform1f(U.uDF, o.depthFade); gl.uniform1f(U.uLW, o.lineWidth);
    gl.uniform1f(U.uInner, o.innerRadius); gl.uniform1f(U.uIFade, o.innerFade);

    // seeded like the live renderer (seed from the config, else stable per page so still frames are reproducible)
    const seed = o.seed != null ? o.seed : [...location.pathname].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261);
    const rand = rng(seed), n1 = noise1(rand);
    let time = 1000 * rand(), rot = rand() * Math.PI * 2;
    const dir = rand() < .5 ? -1 : 1;
    gl.uniform2f(U.uOff, 100 * rand(), 100 * rand());

    const st = { W: 1, H: 1, dpr: 1, cx: 0, cy: 0, R: 1, frames: 0, count: 0 };
    function layout() {
      const b = sec.getBoundingClientRect(), sy = scrollY || 0, vw = document.documentElement.clientWidth || innerWidth;
      const top0 = b.top + sy, mob = b.width < o.mobileBreakpoint;
      const X = mob ? pick(o.mobileX, o.x) : o.x, Y = mob ? pick(o.mobileY, o.y) : o.y, S = mob ? pick(o.mobileSize, o.size) : o.size;
      st.R = Math.max(1, Math.min(b.width, b.height) / 2 * S);
      const top = top0 < innerHeight * .6 ? 0 : top0 - 120;          // a first-section hero runs up under the clear nav
      const cyDoc = top0 + b.height * Y;
      const bottom = Math.max(top0 + b.height, cyDoc + st.R * 1.02) + Math.min(260, b.height * .3);
      st.W = vw; st.H = Math.ceil(bottom - top); st.cx = b.left + b.width * X; st.cy = cyDoc - top;
      st.dpr = Math.min(devicePixelRatio || 1, 2);
      cv.style.top = top + 'px'; cv.style.width = st.W + 'px'; cv.style.height = st.H + 'px';
      cv.style.setProperty('--bp-rings-fade', (100 * clamp01((top0 + b.height * .6 - top) / st.H)).toFixed(1) + '%');
      if (top > 0) cv.style.setProperty('--bp-rings-top', (100 * 120 / st.H).toFixed(1) + '%');
      cv.width = Math.max(1, Math.round(st.W * st.dpr)); cv.height = Math.max(1, Math.round(st.H * st.dpr));
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.uRes, st.W, st.H); gl.uniform1f(U.uDpr, st.dpr); gl.uniform1f(U.uR, st.R);
    }
    let mx = 0, my = 0, pmx = 0, pmy = 0;
    function draw() {
      const pc = clamp01(.5 + .75 * n1(time * o.ringsSpeed + 173.1)), pa = clamp01(.5 + .75 * n1(time * o.ampSpeed + 311.7));
      st.count = Math.max(1, mix(o.ringsMin, o.ringsMax, pc));
      gl.uniform1f(U.uCount, st.count); gl.uniform1f(U.uAmp, mix(o.ampMin, o.ampMax, pa));
      gl.uniform1f(U.uTilt, o.tilt + o.tiltWobble * n1(time * o.wobbleSpeed + 57.1) + pmy * .03);
      gl.uniform1f(U.uRot, rot); gl.uniform1f(U.uZ, time * o.morphSpeed);
      gl.uniform2f(U.uC, st.cx - pmx * 16, st.cy - pmy * 10);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      st.frames++;
    }
    const animate = !STILL && !(REDUCE && o.respectReducedMotion !== false);
    let raf = 0, last = 0, vis = true;
    function frame(now) {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
      time += dt * o.speed; rot += dt * o.speed * o.rotationSpeed * dir;
      const k = Math.min(1, dt * 2); pmx += (mx - pmx) * k; pmy += (my - pmy) * k;
      draw(); kick();
    }
    function kick() { if (animate && vis && !document.hidden && !raf) { if (!last) last = 0; raf = requestAnimationFrame(frame); } }
    const relayout = () => { layout(); if (!raf) draw(); };
    layout(); draw();
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(sec); else addEventListener('resize', relayout, { passive: true });
    addEventListener('resize', relayout, { passive: true });
    addEventListener('load', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    if (window.IntersectionObserver) new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; if (vis) { last = 0; kick(); } }).observe(cv);
    document.addEventListener('visibilitychange', () => { last = 0; kick(); });
    if (FINE && animate) addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });
    kick();
    all.push(st);
  }
  blocks.forEach((el) => { try { Rings(el); } catch (e) { console.warn('[rings] disabled', e); } });
  window.__bpRings = all;
})();
