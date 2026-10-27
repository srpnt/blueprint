// B · Blueprint: UI behaviours (nav + mega-menu, mobile menu, link typing, accordions, changer,
// sliders, marquee, back-to-top, section → terrain mode). No text is ever rewritten except the
// slider counter, which mirrors the live site's behaviour.
(() => {
  const d = document, html = d.documentElement;
  const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const desk = matchMedia('(min-width: 1200px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad2 = (n) => String(n).padStart(2, '0');

  /* ---------- link typing: anchor ↓ / internal → / external ↗ ---------- */
  function kind(a) {
    const h = (a.getAttribute('href') || '').trim();
    if (!h || h.startsWith('javascript')) return null;
    if (h.startsWith('#')) return 'anchor';
    if (/^(mailto|tel):/i.test(h)) return 'external';
    try {
      const u = new URL(h, location.href);
      if (u.host !== location.host) return 'external';
      if (u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') && u.hash) return 'anchor';
    } catch (e) { return null; }
    return 'internal';
  }
  $$('a[href]').forEach((a) => { if (!a.dataset.link) { const k = kind(a); if (k) a.dataset.link = k; } });
  $$('.bp-click').forEach((c) => { if (!c.dataset.link) { const a = c.matches('a') ? c : c.querySelector('a[href]'); if (a && a.dataset.link) c.dataset.link = a.dataset.link; } });

  function scrollToEl(el) {
    const y = el.getBoundingClientRect().top + scrollY - 88;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
    else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  d.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-link="anchor"]');
    if (!a) return;
    const id = decodeURIComponent((a.getAttribute('href') || '').split('#')[1] || '');
    const el = id && d.getElementById(id);
    if (el) { e.preventDefault(); scrollToEl(el); history.replaceState(null, '', '#' + id); }
  });

  /* ---------- desktop mega-menu: hover + click + keyboard + Esc ---------- */
  const overlay = $('.mega-menu-overlay');
  const subs = $$('.qfse-primary-nav .wp-block-navigation__container > li.wp-block-navigation-submenu');
  let openLi = null, tOpen = 0, tClose = 0;
  function setOpen(li, on) {
    if (on && openLi && openLi !== li) setOpen(openLi, false);
    li.classList.toggle('is-open', on);
    if (on) openLi = li; else if (openLi === li) openLi = null;
    const b = li.querySelector(':scope > .wp-block-navigation__submenu-icon');
    if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (overlay) overlay.classList.toggle('is-on', !!openLi && desk.matches);
  }
  subs.forEach((li) => {
    const btn = li.querySelector(':scope > .wp-block-navigation__submenu-icon');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    li.addEventListener('mouseenter', () => { if (!desk.matches) return; clearTimeout(tClose); clearTimeout(tOpen); tOpen = setTimeout(() => setOpen(li, true), 60); });
    li.addEventListener('mouseleave', () => { if (!desk.matches) return; clearTimeout(tOpen); tClose = setTimeout(() => setOpen(li, false), 220); });
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); setOpen(li, !li.classList.contains('is-open')); });
    li.addEventListener('focusout', (e) => { if (desk.matches && li.classList.contains('is-open') && !li.contains(e.relatedTarget)) setOpen(li, false); });
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && li.classList.contains('is-open')) { e.stopPropagation(); setOpen(li, false); if (btn) btn.focus(); }
      if (e.key === 'ArrowDown' && desk.matches && e.target === li.querySelector(':scope > a')) { e.preventDefault(); setOpen(li, true); const f = li.querySelector('.wp-block-navigation__submenu-container a'); if (f) f.focus(); }
    });
  });
  d.addEventListener('click', (e) => { if (openLi && desk.matches && !openLi.contains(e.target)) setOpen(openLi, false); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openLi) setOpen(openLi, false); });

  /* ---------- mobile / tablet overlay menu ---------- */
  const modal = $('.qfse-primary-nav .wp-block-navigation__responsive-container');
  const openBtn = $('.qfse-primary-nav .wp-block-navigation__responsive-container-open');
  const closeBtn = $('.qfse-primary-nav .wp-block-navigation__responsive-container-close');
  const menuToggle = $('.header-container .menu-toggle .wp-block-button__link');
  let lastFocus = null;
  function modalSet(on) {
    if (!modal) return;
    modal.classList.toggle('is-menu-open', on); modal.classList.toggle('has-modal-open', on);
    html.classList.toggle('bp-menu-open', on);
    if (openBtn) openBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (window.__lenis) { on ? window.__lenis.stop() : window.__lenis.start(); }
    if (on) { lastFocus = d.activeElement; setTimeout(() => (closeBtn || modal).focus(), 40); }
    else { if (openLi) setOpen(openLi, false); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  }
  if (openBtn) openBtn.addEventListener('click', (e) => { e.preventDefault(); modalSet(true); });
  if (menuToggle) menuToggle.addEventListener('click', (e) => { e.preventDefault(); modalSet(true); });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); modalSet(false); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && modal.classList.contains('is-menu-open')) modalSet(false); });
  desk.addEventListener('change', () => { if (desk.matches && modal && modal.classList.contains('is-menu-open')) modalSet(false); });

  /* ---------- FAQ accordions ---------- */
  html.classList.add('bp-acc');
  $$('.accordion-item').forEach((it, i) => {
    const t = it.querySelector('.accordion-title');
    if (!t) return;
    t.setAttribute('role', 'button'); t.setAttribute('tabindex', '0'); t.setAttribute('aria-expanded', 'false');
    const tog = () => { const on = !it.classList.contains('is-open'); it.classList.toggle('is-open', on); t.setAttribute('aria-expanded', String(on)); };
    t.addEventListener('click', tog);
    t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
    if (i === 0 || it.matches('.accordion-block > .accordion-item:first-of-type')) { it.classList.add('is-open'); t.setAttribute('aria-expanded', 'true'); }
  });
  $$('details.wp-block-details').forEach((dt) => dt.classList.add('bp-details'));

  /* ---------- changer block (tabs) ---------- */
  $$('.qfse-changer').forEach((ch) => {
    const items = $$('.qfse-changer__item', ch);
    const activate = (it) => items.forEach((o) => {
      const on = o === it, b = $('.qfse-changer__label', o), p = $('.qfse-changer__panel', o);
      if (b) b.setAttribute('aria-expanded', String(on)); if (p) p.hidden = !on; o.classList.toggle('is-active', on);
    });
    items.forEach((it) => { const b = $('.qfse-changer__label', it); if (b) b.addEventListener('click', () => activate(it)); });
    const first = items.find((o) => ($('.qfse-changer__label', o) || {}).getAttribute && $('.qfse-changer__label', o).getAttribute('aria-expanded') === 'true') || items[0];
    if (first) activate(first);
  });

  /* ---------- sliders (testimonials / team / promo): native scroll-snap + controls ---------- */
  $$('.swiper, .slider').forEach((sw) => {
    const wrap = $('.swiper-wrapper', sw) || sw;
    const slides = $$(':scope > .swiper-slide, :scope > .wp-block-group', wrap).filter((s) => s.offsetParent !== null || true);
    if (slides.length < 2 || wrap.classList.contains('bp-track-x')) return;
    wrap.classList.add('bp-track-x'); sw.classList.add('bp-slider');
    const sec = sw.closest('[data-pattern]') || sw.parentElement;
    const prev = $('.previous-slide-btn', sec), next = $('.next-slide-btn', sec), counter = $('.slide-counter', sec);
    const idx = () => Math.round(wrap.scrollLeft / Math.max(1, slides[0].getBoundingClientRect().width));
    const go = (dir) => {
      const w = slides[0].getBoundingClientRect().width; let i = idx() + dir;
      if (i < 0) i = slides.length - 1; if (i >= slides.length) i = 0;
      wrap.scrollTo({ left: i * w, behavior: reduce ? 'auto' : 'smooth' });
    };
    [[prev, -1], [next, 1]].forEach(([el, dir]) => {
      if (!el) return;
      el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.classList.add('bp-ctrl');
      el.setAttribute('aria-label', dir < 0 ? 'Previous slide' : 'Next slide');
      el.addEventListener('click', () => go(dir));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(dir); } });
    });
    let raf = 0;
    wrap.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; const i = Math.min(slides.length - 1, Math.max(0, idx()));
        if (counter) counter.textContent = `${i + 1}/${slides.length}`; slides.forEach((s, k) => s.classList.toggle('is-active', k === i)); });
    }, { passive: true });
    slides[0].classList.add('is-active');
  });

  /* ---------- client logo marquee (clones are aria-hidden decoration) ---------- */
  $$('.wp-block-qfse-q-moving-client-row .wp-block-columns').forEach((row) => {
    const items = Array.from(row.children);
    if (!items.length) return;
    items.forEach((it) => { const c = it.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.setAttribute('data-clone', ''); $$('img', c).forEach((i) => { i.alt = ''; }); row.appendChild(c); });
    row.classList.add('is-marquee');
    row.style.setProperty('--bp-mq', Math.max(24, items.length * 6) + 's');
  });

  /* ---------- section → terrain mode, readouts, header state, back-to-top ---------- */
  const secs = $$('.entry-content > [data-pattern], [data-pattern="article"]');
  const ySpan = $('[data-bp-y]'), sSpan = $('[data-bp-sec]');
  const hdr = $('.header-container'), top = $('.bp-totop'), prog = top && top.querySelector('.bp-totop__prog');
  let mode = null;
  function setMode(sec) {
    const m = (sec && sec.getAttribute('data-bp-mode')) || (sec && sec.getAttribute('data-pattern') === 'article' ? 'calm' : 'drift');
    if (sSpan && sec) sSpan.textContent = pad2(+(sec.getAttribute('data-sec') || 0));
    if (m === mode) return; mode = m; window.__bpMode = m;
    window.dispatchEvent(new CustomEvent('bp:mode', { detail: m }));
  }
  function pick() {
    const mid = innerHeight * 0.5; let best = secs[0] || null;
    for (const s of secs) { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { best = s; break; } if (r.top <= mid) best = s; }
    setMode(best);
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, max = Math.max(1, d.documentElement.scrollHeight - innerHeight), p = Math.min(1, y / max);
      if (hdr) { hdr.classList.toggle('is-scrolled', y > 8); hdr.style.setProperty('--bp-scroll', (p * 88).toFixed(1) + '%'); }
      if (top) top.classList.toggle('is-on', y > innerHeight * 0.8);
      if (prog) prog.style.strokeDashoffset = String(132 - 132 * p);
      if (ySpan) ySpan.textContent = String(Math.round(y)).padStart(4, '0');
      pick();
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  pick(); onScroll();
  if (top) top.addEventListener('click', () => {
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.4 }); else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    const logo = $('.header-container .logo a'); if (logo) setTimeout(() => logo.focus({ preventScroll: true }), 600);
  });

  /* ---------- hero title-block coordinates follow the pointer (deco only) ---------- */
  const xy = $('.bp-titleblock__xy');
  if (xy && !reduce) addEventListener('pointermove', (e) => { xy.textContent = `X ${String(Math.round(e.clientX)).padStart(3, '0')} · Y ${String(Math.round(e.clientY)).padStart(3, '0')}`; }, { passive: true });
})();
