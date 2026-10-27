// B · Blueprint, round 2: device behaviours (two-tone headings, draw-in triggers, changer phase bar).
// Loaded BEFORE motion.js (defer order) so SplitText sees the two-tone spans. Text is never changed:
// the key phrase of a heading is only wrapped in <span class="bp-key"> (like SplitText's own spans).
(() => {
  const d = document, $$ = (s, r = d) => [...r.querySelectorAll(s)], $ = (s, r = d) => r.querySelector(s);
  const STILL = /[?&]still=1/.test(location.search);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- two-tone headings ---------- */
  // key phrase = a 2-4 word noun phrase at the END of the heading (the wrap runs to the end), inside the last clause;
  // never in a question, never starting/ending on a function word or containing a verb; no good phrase → no colour.
  const STOP = /^(a|an|the|and|or|but|nor|of|to|in|on|at|by|for|from|with|into|onto|as|via|per|about|over|than|then|so|not|no|is|are|was|were|be|been|it|its|we|you|your|our|us|they|their|them|that|this|these|those|which|who|what|why|how|when|where|can|could|will|would|should|may|might|must|do|does|did|has|have|had|get|gets|make|makes|let|lets|help|helps|turn|turns|build|builds|meet|meets|work|works|grow|grows|go|goes|close|closes|happen|happens|more|most|every|all|any|each|just|only|also|up|out)$/i;
  const VERB = /^(is|are|was|were|be|can|could|will|would|should|must|do|does|did|has|have|had|get|gets|make|makes|let|lets|help|helps|turn|turns|build|builds|meet|meets|work|works|grow|grows|go|goes|close|closes|happen|happens|we|you|our|your|it|that|which|who)$/i;
  const PRE = /^(every|each|all|any|some|no|more|most|one|two|three|four|five|six|seven|eight|nine|ten)$/i;
  function keyStart(raw) {
    const t = raw.replace(/\s+$/, ''); if (t.length < 14 || /\?/.test(t)) return -1;
    let seg = 0, m; const re = /[.:;!,\u2013\u2014]\s+(?=\S)|\s[\u2013\u2014-]\s/g;
    while ((m = re.exec(t))) seg = m.index + m[0].length;
    const all = []; const wr = /\S+/g; while ((m = wr.exec(t))) all.push({ w: m[0], i: m.index });
    const words = all.filter((x) => x.i >= seg); if (all.length < 3) return -1;
    const bare = (w) => w.replace(/^[^\w]+|[^\w]+$/g, '');
    for (const n of [3, 2, 4]) {
      if (words.length < n || all.length - n < 2) continue;
      const tail = words.slice(-n);
      if (tail.some((x, k) => k < n - 1 && /[,.;:!]$/.test(x.w))) continue;
      if (STOP.test(bare(tail[0].w)) || STOP.test(bare(tail[n - 1].w))) continue;
      if (tail.slice(1, -1).some((x) => VERB.test(bare(x.w)))) continue;
      const prev = words[words.length - n - 1] || all[all.indexOf(tail[0]) - 1];
      if (prev && PRE.test(bare(prev.w))) continue;             // 'Every [stage of delivery]' = a fragment
      if (bare(tail[n - 1].w).length < 3 || (t.length - tail[0].i) / t.length > 0.55) continue;
      return tail[0].i;
    }
    return -1;
  }
  function wrapFrom(h, k) {
    const w = d.createTreeWalker(h, NodeFilter.SHOW_TEXT); let pos = 0, n;
    while ((n = w.nextNode())) {
      const len = n.nodeValue.length;
      if (pos + len > k) {
        const tail = k - pos > 0 ? n.splitText(k - pos) : n;
        const span = d.createElement('span'); span.className = 'bp-key';
        tail.parentNode.insertBefore(span, tail);
        let x = tail; while (x) { const nx = x.nextSibling; span.appendChild(x); x = nx; }
        return true;
      }
      pos += len;
    }
    return false;
  }
  $$('.entry-content h1, .entry-content h2').forEach((h) => {
    if (h.closest('[data-pattern="statement"], .bp-click, .q-link-card, .q-card, .swiper-slide, .accordion-item, .metric-card, .wp-block-qfse-q-stat-item, [data-deco], .bp-tree__row')) return;
    if (h.querySelector('a, img, svg, .bp-key')) return;
    const t = h.textContent; if (!/[a-z]/i.test(t) || t.length > 120) return;
    const k = keyStart(t); if (k > 0) wrapFrom(h, k);
  });

  /* label-styled paragraphs that actually hold sentences → body style (CSS cannot measure length) */
  $$('.entry-content p.has-types-paragraph-nano-font-size, .entry-content p.has-types-h-6-font-size, .entry-content .q-card__tags').forEach((p) => {
    if (p.textContent.trim().length > 64) p.classList.add('bp-longlabel');
  });

  /* logo marquee images: load eagerly (lazy images inside a moving, clipped track arrive late or never) */
  $$('.wp-block-qfse-q-moving-client-row img, .qfse-certification-logos img').forEach((i) => { i.loading = 'eager'; });

  /* ---------- draw-in triggers (deco only; content is never hidden) ---------- */
  const targets = $$('.bp-daybar, .bp-loop, .bp-tree, .bp-sig, .bp-route');
  /* COOP PUSH: signature diagrams + step routes keep their final frame as the CSS default; the pre-state exists only
     under html.bp-sigm (set here when motion is allowed), so reduced motion / ?still=1 / no JS show the final frame */
  if (!(reduce || STILL) && 'IntersectionObserver' in window) document.documentElement.classList.add('bp-sigm');
  if (reduce || STILL || !('IntersectionObserver' in window)) targets.forEach((el) => el.classList.add('is-on'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-on'); io.unobserve(e.target); } }), { threshold: 0.3 });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- changer: phase bar mirrors the active item; auto-advances while in view until the user picks ---------- */
  $$('.qfse-changer').forEach((ch) => {
    const bar = $('.bp-phasebar', ch); if (!bar) return;
    const segs = $$('.bp-phasebar__seg', bar), items = $$('.qfse-changer__item', ch);
    const DUR = 7000; let idx = -1, user = false, vis = false;
    const sync = () => {
      const k = Math.max(0, items.findIndex((it) => it.classList.contains('is-active')));
      if (k === idx) return; idx = k;
      segs.forEach((s, j) => { s.classList.toggle('is-on', j === k); s.classList.toggle('is-done', j < k); });
      const f = segs[k] && $('.bp-phasebar__fill', segs[k]);
      if (f) { f.style.animation = 'none'; void f.offsetWidth; f.style.animation = ''; }
    };
    const stopAuto = () => { user = true; bar.classList.remove('is-auto'); };
    const go = (k) => { const b = items[k] && $('.qfse-changer__label', items[k]); if (b) b.click(); };
    segs.forEach((s, k) => s.addEventListener('click', () => { stopAuto(); go(k); }));
    items.forEach((it) => {
      const b = $('.qfse-changer__label', it);
      if (b) b.addEventListener('click', (e) => { if (e.isTrusted) stopAuto(); });
      new MutationObserver(sync).observe(it, { attributes: true, attributeFilter: ['class'] });
    });
    setTimeout(sync, 0);
    if (reduce || STILL || items.length < 2) return;
    bar.style.setProperty('--dur', DUR + 'ms'); bar.classList.add('is-auto');
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; }, { threshold: 0.35 }).observe(ch);
    setInterval(() => { if (user || !vis || d.hidden || ch.matches(':hover')) return; go((idx + 1) % items.length); }, DUR);
  });
})();
