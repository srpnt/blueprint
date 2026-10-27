// B · Blueprint: motion layer (Lenis + GSAP on one ticker, reveals, odometer readouts, live schematics).
// Content is fully visible without JS; every reveal is a gsap.from(); reduced-motion skips all of it.
(() => {
  const d = document, html = d.documentElement;
  const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STILL = html.classList.contains('bp-still');
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;

  /* ================= live wires: system map + agent flow ================= */
  function mk(tag, attrs, parent) { const e = d.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  /* Geometry: every point is measured in the SVG's OWN pixel space (its padding-box origin, viewBox = its rendered size, so
     1 unit = 1 px), from layout boxes with the reveal translations of the element and its ancestors (up to the host) removed.
     Wires are orthogonal schematic buses: trunk → bus → a level branch into each box (90° turns, small radius). */
  function box(el, host, S) {
    const r = el.getBoundingClientRect(); let x = r.left, y = r.top;
    for (let n = el; n && n !== host; n = n.parentElement) {
      const t = getComputedStyle(n).transform;
      if (t && t !== 'none') { const m = new DOMMatrixReadOnly(t); x -= m.m41; y -= m.m42; }
    }
    x -= S.left; y -= S.top;
    return { l: x, t: y, r: x + r.width, b: y + r.height, cx: x + r.width / 2, cy: y + r.height / 2, w: r.width, h: r.height };
  }
  const f2 = (v) => +v.toFixed(2);
  function elbow(a, busX, e, R = 6) {  // a → (busX, a.y) → (busX, e.y) → e   (horizontal · vertical · horizontal)
    const dy = e[1] - a[1], s = Math.sign(dy);
    if (Math.abs(dy) < 0.75) return `M${f2(a[0])},${f2(a[1])} H${f2(e[0])}`;
    const r = Math.max(0, Math.min(R, Math.abs(dy) / 2, Math.abs(busX - a[0]) / 2, Math.abs(e[0] - busX) / 2));
    const s1 = s > 0 ? 1 : 0, s2 = s > 0 ? 0 : 1;
    return `M${f2(a[0])},${f2(a[1])} H${f2(busX - r)} A${f2(r)},${f2(r)} 0 0 ${s1} ${f2(busX)},${f2(a[1] + s * r)} V${f2(e[1] - s * r)} A${f2(r)},${f2(r)} 0 0 ${s2} ${f2(busX + r)},${f2(e[1])} H${f2(e[0])}`;
  }
  function drop(a, e, R = 6) {  // a (top) → straight down → level branch right into e
    const r = Math.max(0, Math.min(R, Math.abs(e[1] - a[1]) / 2, Math.abs(e[0] - a[0]) / 2));
    if (Math.abs(e[0] - a[0]) < 0.75) return `M${f2(a[0])},${f2(a[1])} V${f2(e[1])}`;
    return `M${f2(a[0])},${f2(a[1])} V${f2(e[1] - r)} A${f2(r)},${f2(r)} 0 0 0 ${f2(a[0] + r)},${f2(e[1])} H${f2(e[0])}`;
  }
  function frame(host, svg) {
    const S = svg.getBoundingClientRect(); if (!S.width) return null;
    svg.setAttribute('viewBox', `0 0 ${f2(S.width)} ${f2(S.height)}`);
    svg.setAttribute('width', f2(S.width)); svg.setAttribute('height', f2(S.height));
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    return S;
  }
  function wireSet(svg, links, packets) {
    links.forEach((L, i) => {
      const id = `bpw${++uid}`, k = L.keys.join(' ');
      mk('path', { d: L.d, class: 'bp-wire__base', 'data-k': k }, svg);
      mk('path', { d: L.d, id, class: 'bp-wire', 'data-k': k }, svg);
      if (L.p) mk('circle', { cx: f2(L.p[0]), cy: f2(L.p[1]), r: 3.2, class: 'bp-wire__end', 'data-k': k }, svg);
      if (L.q) mk('circle', { cx: f2(L.q[0]), cy: f2(L.q[1]), r: 3.2, class: 'bp-wire__end bp-wire__end--in', 'data-k': k }, svg);
      if (packets && !reduce && !STILL) {
        for (let j = 0; j < (L.n || 2); j++) {
          const c = mk('circle', { r: 2.6, class: 'bp-packet', 'data-k': k }, svg);
          const dur = (L.dur || 2.6) + (i % 3) * 0.35;
          const am = mk('animateMotion', { dur: dur + 's', repeatCount: 'indefinite', begin: `-${(j * dur / (L.n || 2) + i * 0.4).toFixed(2)}s`, keyPoints: L.rev ? '1;0' : '0;1', keyTimes: '0;1', calcMode: 'linear' }, c);
          mk('mpath', { href: '#' + id }, am);
        }
      }
    });
  }
  function drawSysmap(map) {
    const svg = $(':scope > svg.bp-wires', map); if (!svg) return;
    const cards = $$('.is-style-card', map); if (cards.length < 2) return;
    const S = frame(map, svg); if (!S) return;
    const hubEl = $('.bp-hub', map);
    const B = (el) => box(el, map, S), F = B(cards[0]), rest = cards.slice(1).map(B);
    const side = F.r < rest[0].l;
    const links = [];
    if (side && hubEl) {
      const H = B(hubEl), hl = [H.l, H.cy], hr = [H.r, H.cy];
      const a0 = [F.r - 0.5, F.cy];
      links.push({ d: elbow(a0, (a0[0] + hl[0]) / 2, hl), p: a0, q: hl, keys: ['0', 'hub'], n: 3 });
      const nl = Math.min(...rest.map((b) => b.l)), busX = hr[0] + Math.round((nl - hr[0]) * 0.45);
      rest.forEach((b, i) => { const e = [b.l + 0.5, b.cy]; links.push({ d: elbow(hr, busX, e), p: hr, q: e, keys: [String(i + 1), 'hub'], n: 2 }); });
      for (let i = 0; i < rest.length - 1; i++) {
        const x = (Math.max(rest[i].l, rest[i + 1].l) + Math.min(rest[i].r, rest[i + 1].r)) / 2;
        const a = [x, rest[i].b - 0.5], e = [x, rest[i + 1].t + 0.5];
        links.push({ d: `M${f2(a[0])},${f2(a[1])} V${f2(e[1])}`, p: a, q: e, keys: [String(i + 1), String(i + 2)], n: 1, dur: 1.6 });
      }
    } else {
      const all = [F, ...rest];
      for (let i = 0; i < all.length - 1; i++) {
        const a = [all[i].l + 22, all[i].b - 0.5], e = [all[i + 1].l + 22, all[i + 1].t + 0.5];
        links.push({ d: `M${f2(a[0])},${f2(a[1])} V${f2(e[1])}`, p: a, q: e, keys: [String(i), String(i + 1)], n: 1, dur: 1.4 });
      }
    }
    wireSet(svg, links, true);
  }
  function drawFlow(af) {
    const svg = $(':scope > svg.bp-wires', af); const hubEl = $('.bp-af-node--hub', af);
    const nodes = $$('.bp-af-col--agents .bp-af-node', af); if (!svg || !hubEl || !nodes.length) return;
    const S = frame(af, svg); if (!S) return;
    const H = box(hubEl, af, S), NB = nodes.map((n) => box(n, af, S));
    const vertical = NB[0].t > H.b - 2;
    const nl = Math.min(...NB.map((b) => b.l));
    let links;
    if (vertical) {  // stacked (mobile): one bus drops from the hub's bottom edge, a level branch into each box
      const busX = Math.max(H.l + 8, nl - 11), a = [busX, H.b - 0.5];
      links = NB.map((b, i) => { const e = [b.l + 0.5, b.cy]; return { d: drop(a, e), p: i === 0 ? a : null, q: e, keys: ['hub', 'a' + (i + 1)], n: 1, dur: 2 + i * 0.2 }; });
    } else {  // side by side: trunk out of the hub's right-edge centre → vertical bus → level branch into each box
      const a = [H.r - 0.5, H.cy], busX = a[0] + Math.round((nl - a[0]) * 0.42);
      links = NB.map((b, i) => { const e = [b.l + 0.5, b.cy]; return { d: elbow(a, busX, e), p: i === 0 ? a : null, q: e, keys: ['hub', 'a' + (i + 1)], n: 2, dur: 2.2 + (i % 2) * 0.5, rev: i % 2 === 1 }; });
    }
    wireSet(svg, links, true);
  }
  /* redraw until the reveal transforms on the measured boxes have settled (≤4 s), then once more */
  function settle(host, sel, draw) {
    const t0 = performance.now();
    const moving = () => $$(sel, host).some((n) => { const t = getComputedStyle(n).transform; return t && t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'; });
    const tick = () => { if (moving() && performance.now() - t0 < 4000) { requestAnimationFrame(tick); return; } draw(); };
    requestAnimationFrame(tick);
  }
  function hot(host, key, on) { $$(`svg.bp-wires [data-k~="${key}"]`, host).forEach((e) => e.classList.toggle('is-hot', on)); }
  $$('.bp-sysmap').forEach((map) => {
    const draw = () => drawSysmap(map);
    $$('.is-style-card', map).forEach((c, i) => { c.addEventListener('mouseenter', () => { hot(map, String(i), true); map.classList.add('is-hot'); });
      c.addEventListener('mouseleave', () => { hot(map, String(i), false); map.classList.remove('is-hot'); }); });
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(draw)).observe(map); else addEventListener('resize', draw);
    const again = () => settle(map, '.is-style-card, .bp-hub', draw);
    addEventListener('load', again); draw(); again();
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { if (es[0].isIntersecting) { again(); setTimeout(again, 1300); } }).observe(map);
  });
  $$('.bp-agentflow').forEach((af) => {
    const draw = () => drawFlow(af);
    $$('.bp-af-node', af).forEach((n) => { const k = n.getAttribute('data-wire'); n.addEventListener('mouseenter', () => hot(af, k, true)); n.addEventListener('mouseleave', () => hot(af, k, false)); });
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(draw)).observe(af); else addEventListener('resize', draw);
    const again = () => settle(af, '.bp-af-node', draw);
    addEventListener('load', again); draw(); again();
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { if (es[0].isIntersecting) { again(); setTimeout(again, 1300); } }).observe(af);
    if (!reduce && !STILL) { let k = 0; const ns = $$('.bp-af-col--agents .bp-af-node', af);
      setInterval(() => { if (d.hidden) return; ns.forEach((n, i) => n.classList.toggle('is-run', i === k % ns.length)); hot(af, 'a' + ((k - 1 + ns.length) % ns.length + 1), false); hot(af, 'a' + (k % ns.length + 1), true); k++; }, 1400); }
  });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => { $$('.bp-sysmap').forEach((m) => settle(m, '.is-style-card, .bp-hub', () => drawSysmap(m))); $$('.bp-agentflow').forEach((a) => settle(a, '.bp-af-node', () => drawFlow(a))); });

  /* ================= switchboard: one configuration live at a time ================= */
  $$('.bp-switch').forEach((sw) => {
    const cards = $$('a.q-link-card', sw).sort((a, b) => (parseInt(a.style.order || 0, 10) - parseInt(b.style.order || 0, 10)));
    let k = 0, vis = false, hover = false;
    const set = (i) => cards.forEach((c, j) => c.classList.toggle('is-live', j === i));
    set(0);
    cards.forEach((c, j) => { c.addEventListener('mouseenter', () => { hover = true; set(j); }); c.addEventListener('mouseleave', () => { hover = false; }); });
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(sw);
    if (!reduce && !STILL) setInterval(() => { if (!vis || hover || d.hidden) return; k = (k + 1) % cards.length; set(k); }, 2600);
  });

  /* ================= odometer readouts (DOM text never changes) ================= */
  function odometer(el) {
    const txt = el.textContent.trim(); const m = txt.match(/^(\D*?)(\d[\d.,]*)(.*)$/);
    if (!m || el.dataset.bpOdo) return; el.dataset.bpOdo = '1';
    const ov = d.createElement('span'); ov.className = 'bp-odo'; ov.setAttribute('aria-hidden', 'true');
    const add = (cls, s) => { const e = d.createElement('span'); e.className = cls; e.textContent = s; ov.appendChild(e); return e; };
    if (m[1]) add('bp-odo__s', m[1]);
    const reels = [];
    [...m[2]].forEach((ch, i, arr) => {
      if (!/\d/.test(ch)) { add('bp-odo__s', ch); return; }
      const reel = d.createElement('span'); reel.className = 'bp-odo__reel';
      const strip = d.createElement('span'); strip.className = 'bp-odo__strip';
      const spins = 1 + (arr.length - i);
      const seq = []; for (let s = 0; s < spins; s++) for (let n = 0; n < 10; n++) seq.push(n); seq.push(+ch);
      strip.textContent = seq.join('\n'); reel.appendChild(strip); ov.appendChild(reel);
      reels.push([strip, seq.length - 1, i]);
    });
    if (m[3]) add('bp-odo__s', m[3]);
    el.classList.add('bp-odo-host'); el.appendChild(ov);
    const run = () => {
      el.classList.add('is-counting');
      reels.forEach(([s, n, i]) => { s.style.transitionDuration = (1.5 + i * 0.25) + 's'; s.style.transform = `translateY(${-n}em)`; });
      const g = el.closest('.wp-block-qfse-q-stat-item'); if (g) g.classList.add('is-read');
      setTimeout(() => { el.classList.remove('is-counting'); el.classList.add('is-done'); setTimeout(() => { ov.remove(); el.classList.remove('bp-odo-host', 'is-done'); }, 450); }, 1700 + reels.length * 250);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); requestAnimationFrame(() => requestAnimationFrame(run)); } }, { threshold: 0.6 });
      io.observe(el);
    } else run();
  }
  if (!reduce && !STILL) $$('.wp-block-qfse-q-stat-item :is(h2,h3,h4,p):first-of-type, .metric-card > :is(h2,h3,h4):first-child').forEach((el) => { if (/\d/.test(el.textContent)) odometer(el); });
  $$('.wp-block-qfse-q-stat-item').forEach((it) => {
    const t = (it.querySelector('h2,h3,h4') || it).textContent; const pc = t.match(/(\d+(?:\.\d+)?)\s*%/);
    it.style.setProperty('--bp-g', pc ? Math.min(100, +pc[1]) / 100 : 0.86);
    if (reduce || STILL) it.classList.add('is-read');
  });

  /* ================= pipeline progress ================= */
  const pipes = $$('.bp-pipeline');
  function pipeSet(g, p) { g.style.setProperty('--p', p.toFixed(3)); const cs = $$(':scope > a.q-card, :scope > .q-card', g); cs.forEach((c, i) => c.classList.toggle('is-lit', p >= (cs.length > 1 ? i / (cs.length - 1) : 0) - 0.04)); }
  if (reduce || STILL || !window.gsap) pipes.forEach((g) => pipeSet(g, 1));

  /* ================= GSAP: smooth scroll + reveals ================= */
  if (reduce || STILL || !window.gsap || !window.ScrollTrigger) return;
  const gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  if (window.Lenis) {
    const lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  pipes.forEach((g) => ST.create({ trigger: g, start: 'top 78%', end: 'bottom 50%', scrub: 0.6, onUpdate: (s) => pipeSet(g, s.progress) }));

  const io = { start: 'top 88%', once: true };
  $$('.bp-rule').forEach((r) => {
    gsap.from($$('.bp-rule__ticks', r), { scaleX: 0, transformOrigin: '0 50%', duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: r, ...io } });
    gsap.from($$('.bp-rule__idx, .bp-rule__of', r), { autoAlpha: 0, x: -12, duration: .7, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: r, ...io } });
  });
  const splitOK = !!window.SplitText;
  const heads = $$('.entry-content h1, .entry-content h2, [data-pattern="article"] h2');
  const doHeads = () => heads.forEach((h) => {
    if (h.closest('.bp-click, .swiper-slide, .accordion-item')) return;
    if (splitOK && h.textContent.length < 160) {
      try {
        const sp = window.SplitText.create ? window.SplitText.create(h, { type: 'lines,words', mask: 'lines', linesClass: 'bp-ln' }) : new window.SplitText(h, { type: 'lines,words', linesClass: 'bp-ln' });
        gsap.from(sp.words, { yPercent: 115, duration: 1, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: h, ...io }, onComplete: () => { try { sp.revert(); } catch (e) {} } });
        return;
      } catch (e) { /* fall through */ }
    }
    gsap.from(h, { autoAlpha: 0, y: 28, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: h, ...io } });
  });
  (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(doHeads);

  const singles = $$(['.entry-content > [data-pattern] p:not(.bp-click p):not(.swiper-slide p):not(.accordion-item p)',
    '.entry-content > [data-pattern] h3:not(.bp-click h3):not(.swiper-slide h3)', '.entry-content .wp-block-buttons',
    '.entry-content figure.wp-block-image:not(.bp-click figure):not(.wp-block-qfse-q-moving-client-row figure)', '.bp-titleblock'].join(','))
    .filter((e) => !e.closest('[data-deco]') && !e.closest('.wp-block-qfse-q-stat-item') && !e.closest('.qfse-changer__panel'));
  singles.slice(0, 260).forEach((e) => gsap.from(e, { autoAlpha: 0, y: 22, duration: .85, ease: 'power3.out', scrollTrigger: { trigger: e, ...io } }));

  const groups = new Map();
  $$('.bp-click, .bp-spec, .wp-block-qfse-q-stat-item, .accordion-item, .bp-af-node, .qfse-changer__item').forEach((c) => {
    const p = c.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(c);
  });
  /* explicit end state (fromTo): a from() re-recorded mid-flight (ScrollTrigger refresh) could park cards at y:36 for good, which
     also put the schematic wires (measured on layout boxes) 36px off the visible cards */
  groups.forEach((list, parent) => gsap.fromTo(list, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .09, scrollTrigger: { trigger: parent, start: 'top 85%', once: true } }));

  $$('.entry-content figure.wp-block-image img').forEach((img) => {
    if (img.closest('.wp-block-qfse-q-moving-client-row, .qfse-certification-logos, .bp-spec, .bp-click, [data-deco]')) return;
    if ((img.getAttribute('width') || 999) < 240) return;
    gsap.from(img, { clipPath: 'inset(0 0 100% 0)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: img, ...io } });
  });
  /* S3 fix (reveal trigger): trigger positions refresh whenever the page height changes (collapsibles, sliders, late images), and a
     reveal whose trigger is in view always completes: it plays (fade kept), then the end state is forced if the ticker stalled. */
  let rz; if ('ResizeObserver' in window) new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => ST.refresh(), 250); }).observe(d.body);
  if ('IntersectionObserver' in window) {
    const seen = new WeakSet();
    const net = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; net.unobserve(e.target);
      const sts = ST.getAll().filter((s) => s.trigger === e.target && s.animation);
      sts.forEach((s) => { if (s.animation.progress() < 1) s.animation.play(); });
      setTimeout(() => sts.forEach((s) => { if (s.animation.progress() < 1) s.animation.progress(1); }), 1800);
    }), { rootMargin: '0px 0px -12% 0px' });
    const arm = () => ST.getAll().forEach((s) => { if (s.vars && s.vars.once && s.trigger && !seen.has(s.trigger)) { seen.add(s.trigger); net.observe(s.trigger); } });
    (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(() => setTimeout(arm, 0));
  }
  addEventListener('load', () => ST.refresh());
})();
