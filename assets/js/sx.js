// B · Blueprint: SERVICES PUSH r2. Service hero diagrams (.bp-sx), section glyphs, travelling step markers.
// Wires use motion.js's agentflow geometry: points in the SVG's own px space (viewBox = rendered size), measured from layout
// boxes with reveal translations removed; ends sit 0.5px inside the box edge (= centre of its 1px border). Final frame is
// the default (pre-states only under html.bp-sigm); ?still=1 / reduced motion: no packets, no cycling.
(() => {
  const d = document, html = d.documentElement, NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STILL = html.classList.contains('bp-still') || reduce;
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const f2 = (v) => +(+v).toFixed(2);
  let uid = 0;
  function mk(tag, attrs, parent) { const e = d.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function box(el, host, S) {
    const r = el.getBoundingClientRect(); let x = r.left, y = r.top;
    for (let n = el; n && n !== host; n = n.parentElement) {
      const t = getComputedStyle(n).transform;
      if (t && t !== 'none') { const m = new DOMMatrixReadOnly(t); x -= m.m41; y -= m.m42; }
    }
    x -= S.left; y -= S.top;
    return { l: x, t: y, r: x + r.width, b: y + r.height, cx: x + r.width / 2, cy: y + r.height / 2, w: r.width, h: r.height };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function orth(pts, R = 6) {  // orthogonal polyline, rounded corners (radius capped by half of each leg)
    const P = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const q = P[P.length - 1]; if (Math.hypot(pts[i][0] - q[0], pts[i][1] - q[1]) > 0.01) P.push(pts[i]); }
    let s = `M${f2(P[0][0])},${f2(P[0][1])}`;
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const u1 = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], u2 = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
      const z = u1[0] * u2[1] - u1[1] * u2[0];
      if (Math.abs(z) < 0.5) { s += ` L${f2(b[0])},${f2(b[1])}`; continue; }
      const r = Math.max(0, Math.min(R, l1 / 2, l2 / 2));
      s += ` L${f2(b[0] - u1[0] * r)},${f2(b[1] - u1[1] * r)} A${f2(r)},${f2(r)} 0 0 ${z > 0 ? 1 : 0} ${f2(b[0] + u2[0] * r)},${f2(b[1] + u2[1] * r)}`;
    }
    const L = P[P.length - 1]; s += ` L${f2(L[0])},${f2(L[1])}`;
    return s;
  }
  const fr = (v) => (v === '=' ? '=' : (v === undefined || v === '' ? 0.5 : +v));
  function route(A, B, mode, fa, fb, bus) {
    fa = fr(fa); fb = fr(fb);
    if (mode === 'v') {
      const dn = B.t >= A.b - 1;
      const a = [0, dn ? A.b - 0.5 : A.t + 0.5], e = [0, dn ? B.t + 0.5 : B.b - 0.5];
      a[0] = fa === '=' ? clamp(B.cx, A.l + 4, A.r - 4) : A.l + A.w * fa;
      e[0] = fb === '=' ? clamp(a[0], B.l + 4, B.r - 4) : B.l + B.w * fb;
      if (Math.abs(e[0] - a[0]) < 0.75) { e[0] = a[0]; return { pts: [a, e], a, e }; }
      const by = Math.round(a[1] + (e[1] - a[1]) * bus);
      return { pts: [a, [a[0], by], [e[0], by], e], a, e };
    }
    if (mode === 'hv') {  // out of A's side, then vertical into B's top/bottom edge
      const right = B.cx >= A.r; const a = [right ? A.r - 0.5 : A.l + 0.5, A.t + A.h * (fa === '=' ? 0.5 : fa)];
      const dn = B.t >= a[1]; const e = [B.l + B.w * (fb === '=' ? 0.5 : fb), dn ? B.t + 0.5 : B.b - 0.5];
      return { pts: [a, [e[0], a[1]], e], a, e };
    }
    if (mode === 'vh') {  // out of A's bottom/top, then horizontal into B's side edge
      const dn = B.cy >= A.b; const a = [A.l + A.w * (fa === '=' ? 0.5 : fa), dn ? A.b - 0.5 : A.t + 0.5];
      const right = B.l >= a[0]; const e = [right ? B.l + 0.5 : B.r - 0.5, B.t + B.h * (fb === '=' ? 0.5 : fb)];
      return { pts: [a, [a[0], e[1]], e], a, e };
    }
    const fwd = B.l >= A.r - 1;  // 'h': side edge → side edge, level branch through a vertical bus
    const a = [fwd ? A.r - 0.5 : A.l + 0.5, 0], e = [fwd ? B.l + 0.5 : B.r - 0.5, 0];
    a[1] = fa === '=' ? clamp(B.cy, A.t + 4, A.b - 4) : A.t + A.h * fa;
    e[1] = fb === '=' ? clamp(a[1], B.t + 4, B.b - 4) : B.t + B.h * fb;
    if (Math.abs(e[1] - a[1]) < 0.75) { e[1] = a[1]; return { pts: [a, e], a, e }; }
    const bx = Math.round(a[0] + (e[0] - a[0]) * bus);
    return { pts: [a, [bx, a[1]], [bx, e[1]], e], a, e };
  }
  function draw(sx) {
    const svg = sx.querySelector(':scope > svg.bp-sx__w'); if (!svg) return;
    const S = svg.getBoundingClientRect(); if (!S.width || !S.height) return;
    svg.setAttribute('viewBox', `0 0 ${f2(S.width)} ${f2(S.height)}`); svg.setAttribute('width', f2(S.width)); svg.setAttribute('height', f2(S.height));
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const N = {}; $$(':scope > .bp-sx__n[data-id]', sx).forEach((n) => { if (n.offsetParent !== null) N[n.dataset.id] = box(n, sx, S); });
    const animate = sx.classList.contains('is-on') && !sx.classList.contains('is-drawn') && !STILL;
    const q = [];
    (sx.dataset.links || '').split(',').forEach((spec, i) => {
      const [pair, mode = 'h', fa, fb, bus] = spec.trim().split(':');
      const [ia, ib] = pair.split('>'); const A = N[ia], B = N[ib]; if (!A || !B) return;
      const R = route(A, B, mode, fa, fb, bus === undefined ? 0.5 : +bus);
      const dd = orth(R.pts), id = `sxw${++uid}`, k = `${ia} ${ib}`;
      mk('path', { d: dd, class: 'bp-sxw__base' + (animate ? ' dr' : ''), pathLength: 1, style: `--d:${(0.25 + i * 0.07).toFixed(2)}s`, 'data-k': k }, svg);
      mk('path', { d: dd, id, class: 'bp-sxw', 'data-k': k }, svg);
      mk('circle', { cx: f2(R.a[0]), cy: f2(R.a[1]), r: 2.6, class: 'bp-sxw__end', 'data-k': k }, svg);
      mk('circle', { cx: f2(R.e[0]), cy: f2(R.e[1]), r: 2.6, class: 'bp-sxw__end bp-sxw__end--in', 'data-k': k }, svg);
      if (!STILL) {
        const c = mk('circle', { r: 2.5, class: 'bp-sxw__pk', 'data-k': k }, svg);
        const dur = 2.6 + (i % 3) * 0.45;
        const am = mk('animateMotion', { dur: dur + 's', repeatCount: 'indefinite', begin: `-${((i * 0.53) % dur).toFixed(2)}s`, keyPoints: '0;1', keyTimes: '0;1', calcMode: 'linear' }, c);
        mk('mpath', { href: '#' + id }, am);
      }
      q.push({ k, mode, a: R.a.map(f2), e: R.e.map(f2), A: [A.l, A.t, A.r, A.b].map(f2), B: [B.l, B.t, B.r, B.b].map(f2) });
    });
    sx.__sxq = q;
  }
  function cycle(sx) {
    if (STILL || sx.__cyc) return;
    const seq = (sx.dataset.seq || '').split(',').filter(Boolean).map((s) => s.split('+'));
    if (seq.length < 2) return;
    let k = 0; sx.__cyc = 1;
    const nodes = $$(':scope > .bp-sx__n', sx);
    const step = () => {
      if (d.hidden) return;
      const cur = seq[k % seq.length], prev = seq[(k - 1 + seq.length) % seq.length];
      nodes.forEach((n) => n.classList.toggle('is-run', cur.includes(n.dataset.id)));
      $$('svg [data-k]', sx).forEach((e) => { const [x, y] = e.getAttribute('data-k').split(' ');
        e.classList.toggle('is-hot', (prev.includes(x) && cur.includes(y)) || (prev.includes(y) && cur.includes(x))); });
      k++;
    };
    step(); setInterval(step, 1500);
  }
  const sxs = $$('.bp-sx');
  sxs.forEach((sx) => {
    const redraw = () => requestAnimationFrame(() => draw(sx));
    if (window.ResizeObserver) new ResizeObserver(redraw).observe(sx); else addEventListener('resize', redraw);
    addEventListener('load', redraw);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(redraw);
    draw(sx);
    const on = () => {
      if (sx.classList.contains('is-on')) return;
      sx.classList.add('is-on'); draw(sx);
      setTimeout(() => draw(sx), 900);
      setTimeout(() => { sx.classList.add('is-drawn'); draw(sx); cycle(sx); }, STILL ? 0 : 2300);
    };
    if (STILL || !('IntersectionObserver' in window)) { sx.classList.add('is-on', 'is-drawn'); draw(sx); return; }
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); on(); } }, { threshold: 0.2 });
    io.observe(sx);
  });
  window.__sxCheck = () => sxs.map((sx) => { draw(sx); return { kind: sx.className, links: sx.__sxq || [] }; });

  /* ---------- section visuals: glyph grids, gauges, stack rows draw in once on view ---------- */
  const once = (els, cls, th = 0.2) => {
    if (STILL || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add(cls)); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add(cls); io.unobserve(e.target); } }), { threshold: th });
    els.forEach((e) => io.observe(e));
  };
  once($$('.bp-sv--glyphs, .bp-sv--metrics, .bp-sv--stack'), 'is-on', 0.15);

  /* ---------- process: a marker travels the spine once; stations/rows light as it passes ---------- */
  function travel(host, rowsSel, yOf, lit) {
    const mkr = host.querySelector('.bp-mk'); const rows = $$(rowsSel, host);
    if (!mkr || !rows.length) return;
    const done = () => { rows.forEach((r) => r.classList.add(lit)); host.classList.add('is-done'); };
    if (STILL || !('IntersectionObserver' in window) || !mkr.animate) { done(); return; }
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return; io.disconnect();
      const H = host.getBoundingClientRect(), M = mkr.getBoundingClientRect(), dur = 650 * rows.length + 700;
      const m0 = M.top - H.top + M.height / 2;  // marker centre now (relative to the host)
      const ys = rows.map((r) => yOf(r.getBoundingClientRect(), H));
      const end = ys[ys.length - 1] - m0;
      host.classList.add('is-run');
      const fill = host.querySelector('.bp-fstep__fill'); if (fill) fill.style.transitionDuration = dur + 'ms';
      mkr.animate([{ transform: 'translateY(0px)' }, { transform: `translateY(${end.toFixed(2)}px)` }], { duration: dur, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
      ys.forEach((y, i) => setTimeout(() => rows[i].classList.add(lit), Math.max(0, dur * ((y - m0) / Math.max(1, end))) * 0.92));
      setTimeout(done, dur + 50);
    }, { threshold: 0.25 });
    io.observe(host);
  }
  $$('.bp-sv--tree .bp-tree').forEach((t) => travel(t, ':scope > .bp-tree__row', (b, H) => b.top - H.top + b.height / 2, 'is-lit'));
  $$('.bp-fstep').forEach((c) => travel(c, ':scope > .bp-fstep__st', (b, H) => b.top - H.top + 12, 'is-lit'));
})();
