// B · Blueprint (final round): BASE ONLY. The live site's blurred colour mix (.qfse-site-bg: 9 blobs, exact tints,
// sizes and positions) as one quiet full-screen fragment shader: soft elliptical fields, slow low-frequency warp,
// orbit drift + breathe, faint cursor pull, scroll response, the live centre-darkening ellipse and a static grain
// (dither, no flicker). No mesh here: the only mesh on the site is Q's own hero rings block (rings.js).
// Raw WebGL (no three.js), reduced-resolution buffer (the field is blur-soft), ~30 fps, paused when the tab is hidden;
// ?still=1 or prefers-reduced-motion = one frame, redrawn on scroll / resize.
(() => {
  const html = document.documentElement;
  const canvas = document.getElementById('bp-bg');
  if (!canvas) return;
  const STILL = /[?&]still=1/.test(location.search);
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 781px)').matches;

  // live spec → [cx, cy, rx, ry] in viewport fractions, rgba, [drift s (neg = reverse), breathe s, phase, breathe amount]
  const BLOBS = [
    [[-.03, .40, .35, .40], [46, 140, 110, .50], [14, 9, 0.0, 1]],      // teal   70vw×80vh  left:-38vw top:0
    [[.02, -.005, .30, .275], [35, 95, 65, .50], [22, 10, 1.3, 1]],     // green  60vw×55vh  left:-28vw top:-28vh
    [[1.025, .475, .325, .425], [35, 80, 120, .42], [-18, 12, 2.1, 1]], // blue   65vw×85vh  right:-35vw top:5vh
    [[.975, 1.0, .275, .25], [40, 110, 95, .35], [-16, 11, 3.4, .5]],   // accent 55vw×50vh  right:-25vw bottom:-25vh
    [[.50, 1.08, .25, .20], [30, 100, 105, .25], [20, 14, 4.2, .5]],    // cyan   50vw×40vh  left:25vw bottom:-28vh
    [[.025, 1.055, .275, .225], [20, 50, 70, .40], [-26, 18, 5.0, .5]], // navy   55vw×45vh  left:-25vw bottom:-28vh
    [[.95, -.02, .20, .16], [45, 120, 80, .25], [24, 17, 0.7, .5]],     // spark  40vw×32vh  right:-15vw top:-18vh
    [[.45, -.05, .20, .15], [180, 160, 40, .16], [-19, 13, 2.8, .5]],   // yellow 40vw×30vh  left:25vw top:-20vh
    [[.02, .70, .14, .15], [200, 170, 60, .14], [28, 20, 3.9, .5]],     // gold   28vw×30vh  left:-12vw top:55vh
  ];

  const VS = 'attribute vec2 aP; varying vec2 vUv; void main(){ vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }';
  const FS = `precision highp float;
#define OCT ${SMALL ? 2 : 3}
uniform vec2 uRes, uMouse; uniform float uTime, uScroll, uSig, uWarp;
uniform vec4 uBP[9]; uniform vec4 uBC[9]; uniform vec4 uBT[9];
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < OCT; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main(){
  vec2 P = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 m = uMouse * uRes;
  float t = uTime;
  float md = length(P - m) / uRes.y;
  vec2 q = P / uRes.y;
  vec2 w = vec2(fbm(q * 0.85 + vec2(t * 0.016, -t * 0.011)), fbm(q * 0.85 + vec2(5.2 - t * 0.013, 1.3 + t * 0.015))) - 0.5;
  P += w * uRes.y * (uWarp + 0.018 * exp(-md * md * 6.0));
  vec3 bg = vec3(14.0, 20.0, 19.0) / 255.0;
  vec3 col = bg;
  for (int i = 0; i < 9; i++){
    vec4 bp = uBP[i]; vec4 bc = uBC[i]; vec4 bt = uBT[i];
    float dr = 6.28318 * t / bt.x;
    vec2 off = vec2(sin(dr + bt.z), sin(dr * 0.77 + bt.z * 1.7)) * vec2(0.04 * uRes.x, 0.035 * uRes.y);
    off += vec2(0.03 * uRes.x, 0.02 * uRes.y) * (0.5 - 0.5 * cos(dr));
    float br = (0.5 - 0.5 * cos(6.28318 * t / bt.y + bt.z)) * bt.w;
    vec2 c = bp.xy * uRes + off;
    c.y -= sin(uScroll * 0.4 + bt.z) * 0.05 * uRes.y;
    c += (m - c) * 0.03;
    vec2 R = bp.zw * uRes * (1.0 + 0.14 * br);
    vec2 d = P - c; float r = length(d / R);
    float sd = length(d) * (r - 1.0) / max(r, 1e-3);
    float a = 1.0 / (1.0 + exp(1.6 * sd / uSig));
    col = mix(col, bc.rgb, clamp(a * bc.a * (1.0 - 0.2 * bt.w + 0.2 * br), 0.0, 1.0));
  }
  vec2 e = (vUv - 0.5) / vec2(0.55, 0.5);
  col = mix(col, bg, 0.85 * (1.0 - clamp(length(e) / 0.75, 0.0, 1.0)));
  col += vec3(0.008, 0.04, 0.028) * exp(-md * md * 8.0);
  col += (h21(floor(gl_FragCoord.xy)) - 0.5) * 0.016;
  gl_FragColor = vec4(col, 1.0);
}`;

  let gl = null;
  try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
  if (!gl) { html.classList.add('bp-nogl'); return; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { html.classList.add('bp-nogl'); console.warn('bp bg disabled', e); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(prog, 'aP');
  gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uRes', 'uMouse', 'uTime', 'uScroll', 'uSig', 'uWarp', 'uBP', 'uBC', 'uBT'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform4fv(U.uBP, new Float32Array(BLOBS.flatMap((b) => b[0])));
  gl.uniform4fv(U.uBC, new Float32Array(BLOBS.flatMap((b) => [b[1][0] / 255, b[1][1] / 255, b[1][2] / 255, b[1][3]])));
  gl.uniform4fv(U.uBT, new Float32Array(BLOBS.flatMap((b) => b[2])));
  gl.uniform1f(U.uWarp, SMALL ? .04 : .05);
  html.classList.add('bp-gl');

  const SCALE = SMALL ? .5 : .6;          // buffer px per css px (the field has no hard detail)
  let W = 1, H = 1, t = 6, last = 0, lastDraw = 0, raf = 0, frames = 0;
  let mx = .5, my = .45, pmx = .5, pmy = .45, sc = 0, tSc = 0;
  function resize() {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    canvas.width = Math.max(1, Math.round(W * SCALE)); canvas.height = Math.max(1, Math.round(H * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uSig, 125 * Math.min(1.15, Math.max(.55, W / 1440)));
  }
  function render() {
    gl.uniform1f(U.uTime, t); gl.uniform1f(U.uScroll, sc); gl.uniform2f(U.uMouse, pmx, pmy);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); frames++;
  }
  function loop(now) {
    raf = 0;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    t += dt * .8;
    const k = 1 - Math.exp(-dt * 1.6), ks = 1 - Math.exp(-dt * 2.5);
    pmx += (mx - pmx) * k; pmy += (my - pmy) * k; sc += (tSc - sc) * ks;
    if (now - lastDraw > 31) { lastDraw = now; render(); }
    if (!document.hidden) raf = requestAnimationFrame(loop);
  }
  const animate = !(STILL || REDUCE);
  function kick() { if (animate && !raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
  function once() { sc = tSc; render(); }
  const readScroll = () => { tSc = (scrollY || 0) / (innerHeight || 1); };

  resize(); readScroll(); sc = tSc;
  addEventListener('resize', () => { resize(); if (!animate) once(); }, { passive: true });
  addEventListener('scroll', () => { readScroll(); if (!animate || document.hidden) once(); }, { passive: true });
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; }, { passive: true });
  document.addEventListener('visibilitychange', kick);
  once();                                   // first frame now (rAF does not run in hidden tabs)
  if (animate) kick(); else requestAnimationFrame(once);
  window.__bpBg = { get frames() { return frames; }, render: once };
})();
