/* B · Blueprint, final round S3b: mobile length (≤781px only; desktop never runs this).
   1) heading + text rows → collapsible rows: the heading becomes the toggle (a <button> inside the heading),
      first row of each group open, aria-expanded/aria-controls set. Text is never removed (only hidden when closed).
   2) footer sitemap submenus fold behind a 44px toggle; the parent link stays a link. */
(function () {
  if (!window.matchMedia || !window.matchMedia('(max-width: 781px)').matches) return;
  var uid = 0;
  var T = function (el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); };
  var kids = function (el, cls) { return [].filter.call(el.children, function (c) { return c.classList.contains(cls); }); };
  var SKIP = '.bp-svcch, .bp-swipe, .bp-deck, .bp-switch, .bp-index, .bp-phased, .bp-tree, .bp-fold, .bp-fold-col, .accordion-block, .qfse-changer, .footer-container, [data-pattern="hero"], [data-pattern="cta"], [data-pattern="form"], form';

  function wire(host, head, bodies, open) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bp-fold__btn';
    while (head.firstChild) btn.appendChild(head.firstChild);
    head.appendChild(btn);
    btn.setAttribute('aria-controls', bodies.map(function (b) { if (!b.id) b.id = 'bp-fold-' + (++uid); return b.id; }).join(' '));
    var set = function (o) { host.classList.toggle('is-open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    set(open);
    btn.addEventListener('click', function () { set(!host.classList.contains('is-open')); });
  }

  // 1a) rows: .wp-block-columns = [heading-only column, text column]; ≥2 sibling rows form a group
  var groups = new Map();
  document.querySelectorAll('.entry-content [data-pattern] .wp-block-columns').forEach(function (r) {
    if (r.closest(SKIP)) return;
    var cols = kids(r, 'wp-block-column');
    if (cols.length !== 2) return;
    var h = cols[0].querySelector('h2, h3, h4, h5');
    if (!h || h.querySelector('a') || T(cols[0]) !== T(h) || !T(h)) return;
    if (cols[1].querySelector('img, video, iframe, form, .wp-block-buttons, .q-link-card, .q-card, .is-style-card')) return;
    if (T(cols[1]).length < 90) return;
    var p = r.parentElement;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push([r, h, [cols[1]]]);
  });
  groups.forEach(function (list, p) {
    if (list.length < 2) return;
    p.classList.add('bp-fold-group');
    list.forEach(function (it, i) { it[0].classList.add('bp-fold'); wire(it[0], it[1], it[2], i === 0); });
  });

  // 1b) benefit / process rows: ≥3 plain columns that each open with a heading followed by text
  document.querySelectorAll('.entry-content [data-pattern] .wp-block-columns').forEach(function (r) {
    if (r.closest(SKIP) || r.classList.contains('bp-fold')) return;
    var cols = kids(r, 'wp-block-column');
    if (cols.length < 3) return;
    var ok = cols.every(function (c) {
      var f = c.firstElementChild;
      return f && /^H[2-5]$/.test(f.tagName) && !f.querySelector('a') && T(f) && c.children.length >= 2 &&
        !c.classList.contains('bp-click') && !c.classList.contains('bp-spec') &&
        !c.querySelector('img, video, iframe, form, .wp-block-buttons, .q-link-card, .q-card') && T(c).length - T(f).length >= 60;
    });
    if (!ok) return;
    r.classList.add('bp-fold-group');
    cols.forEach(function (c, i) {
      c.classList.add('bp-fold-col');
      wire(c, c.firstElementChild, [].slice.call(c.children, 1), i === 0);
    });
  });

  // 1c) chapter blocks: [row holding only a heading] + long content rows; ≥2 sibling blocks → fold, first open
  var secs = new Map();
  document.querySelectorAll('.entry-content [data-pattern] .main-content').forEach(function (m) {
    if (m.closest(SKIP) || m.parentElement.closest('.main-content')) return;
    var f = m.firstElementChild;
    if (!f || !f.classList.contains('wp-block-columns') || m.children.length < 2) return;
    var h = f.querySelector('h2, h3, h4');
    if (!h || h.querySelector('a') || T(f) !== T(h) || !T(h)) return;
    if (T(m).length - T(h).length < 150 || m.querySelector('form, iframe, video')) return;
    var p = m.parentElement;
    if (!secs.has(p)) secs.set(p, []);
    secs.get(p).push([m, h]);
  });
  secs.forEach(function (list) {
    if (list.length < 2) return;
    list.forEach(function (it, i) { it[0].classList.add('bp-fold-sec'); wire(it[0], it[1], [].slice.call(it[0].children, 1), i === 0); });
  });
  // 1d) spec rows with a short key → key | value layout (CSS .bp-kv)
  //     long keys with long text → fold rows (heading toggle, first open per tree)
  document.querySelectorAll('.bp-tree').forEach(function (tree) {
    var fl = [];
    kids(tree, 'bp-tree__row').forEach(function (r) {
      var cols = kids(r, 'wp-block-column');
      var h = cols.length === 2 && cols[0].querySelector('h3, h4');
      if (!h || T(cols[0]) !== T(h)) return;
      if (T(h).length <= 24) r.classList.add('bp-kv');
      else if (T(cols[1]).length >= 90 && !cols[1].querySelector('img, form, .q-link-card')) fl.push([r, h, [cols[1]]]);
    });
    if (fl.length >= 2) fl.forEach(function (it, i) { it[0].classList.add('bp-fold'); wire(it[0], it[1], it[2], i === 0); });
  });

  // 2) footer sitemap folds
  var top = document.querySelector('.footer-container .footer-navigation ul.wp-block-navigation__container');
  if (top) kids(top, 'wp-block-navigation-submenu').forEach(function (li) {
    var sub = [].filter.call(li.children, function (c) { return c.tagName === 'UL'; })[0];
    if (!sub) return;
    var a = [].filter.call(li.children, function (c) { return c.tagName === 'A'; })[0];
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bp-ffold__btn';
    btn.setAttribute('aria-label', (a ? T(a) + ' ' : '') + 'links');
    if (!sub.id) sub.id = 'bp-ffold-' + (++uid);
    btn.setAttribute('aria-controls', sub.id);
    li.insertBefore(btn, sub);
    li.classList.add('bp-ffold');
    var set = function (o) { li.classList.toggle('is-open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    set(false);
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); set(!li.classList.contains('is-open')); });
  });
})();
