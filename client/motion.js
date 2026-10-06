/* ==================================================================
   HERITAGE CROPS — MOTION SYSTEM (behaviour)
   Who does what, and why:
   · Web Animations API  → scroll reveals, word reveals, image reveals, hero intro
                           (native, off the main thread, no library cost)
   · IntersectionObserver→ triggers reveals (cheap)
   · GSAP + ScrollTrigger→ scroll-scrubbed motion (progress bar, parallax, timeline
                           line) and spring-physics pointer effects (magnetic buttons,
                           3D card tilt, cursor ring) via quickTo
   · CSS keyframes       → ambient float, curtain, button shine
   Nothing runs when the visitor prefers reduced motion or if GSAP fails to load.
   ================================================================== */
(function () {
  'use strict';
  var SELF = document.currentScript && document.currentScript.src;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) { root.classList.remove('mo'); return; }

  gsap.registerPlugin(ScrollTrigger);
  var EASE = 'cubic-bezier(.16,1,.3,1)';
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var LOW = window.innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  window.__mo = { vel: 0 };
  var AMT = window.innerWidth < 768 ? 16 : 30;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var inHero = function (e) { return !!e.closest('.hc-hero-section'); };

  /* ---------- helpers ---------- */
  // Fade + rise using the independent `translate` property (never clashes with hover transforms)
  function rise(el, delay, dist) {
    el.classList.remove('mo-pre');
    el.style.opacity = '1';
    el.animate([{ opacity: 0, translate: '0 ' + (dist || 36) + 'px' }, { opacity: 1, translate: '0 0' }],
      { duration: 900, delay: delay || 0, easing: EASE, fill: 'backwards' });
  }

  // Wrap each word (keeping <br> and nested <span>s) so words can slide up from a mask
  function splitWords(el) {
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'), i = document.createElement('span');
            w.className = 'mo-w'; i.className = 'mo-wi'; i.textContent = part;
            i.style.transform = 'translateY(115%)';
            w.appendChild(i); frag.appendChild(w); words.push(i);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    })(el);
    return words;
  }

  function revealWords(words, base) {
    words.forEach(function (w, i) {
      w.style.transform = '';
      w.animate([{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }],
        { duration: 1000, delay: (base || 0) + i * 55, easing: EASE, fill: 'backwards' });
    });
  }

  function revealImage(box) {
    var img = box.querySelector('img');
    box.style.clipPath = '';
    box.animate([{ clipPath: 'inset(10% 6% round 16px)' }, { clipPath: 'inset(0% 0% round 16px)' }],
      { duration: 1200, easing: EASE, fill: 'backwards' });
    if (img) img.animate([{ scale: '1.32' }, { scale: '1.12' }], { duration: 1600, easing: EASE, fill: 'backwards' });
  }

  /* ---------- scroll-triggered reveals ---------- */
  var io = new IntersectionObserver(function (entries) {
    var k = 0;   // index within this batch → staggered reveal for rows of cards
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var t = en.target; io.unobserve(t);
      if (t._words) revealWords(t._words, 0);
      else if (t._clip) revealImage(t);
      else if (t._line) { t.style.scale = ''; t.animate([{ scale: '0 1' }, { scale: '1 1' }], { duration: 1400, easing: EASE, fill: 'backwards' }); }
      else rise(t, (k++) * 90);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  function watch(sel) {
    $$(sel).forEach(function (e) {
      if (inHero(e) || e.closest('.hc-news-list')) return;
      e.classList.add('mo-pre'); io.observe(e);
    });
  }
  watch([
    '.hc-eyebrow', '.hc-text-link', '.hc-text-link-gold',
    '.hc-icon-box', '.hc-plan-card', '.hc-plantation-card', '.hc-crop-card', '.hc-sustain-card',
    '.hc-testimonial-card', '.hc-org-card', '.hc-stats-section .grid > div', '.hc-timeline .flex.items-start',
    '.hc-journey-list li', '.hc-accordion-item', '.hc-form > div', '.hc-form > button',
    '.hc-footer .grid > div', '.hc-footer-bottom'
  ].join(','));

  $$('section h2.font-display').forEach(function (h) {            // animated headline text
    if (inHero(h)) return;
    h._words = splitWords(h); io.observe(h);
  });
  $$('.hc-footer-hairline').forEach(function (l) { l._line = true; l.style.scale = '0 1'; io.observe(l); });
  $$('#about .hc-img-zoom').forEach(function (b) {                 // image reveal
    b._clip = true; b.style.clipPath = 'inset(10% 6% round 16px)'; io.observe(b);
  });

  /* ---------- scroll-scrubbed (GSAP ScrollTrigger) ---------- */
  var bar = document.createElement('div');                         // reading progress
  bar.className = 'mo-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { bar.style.transform = 'scaleX(' + s.progress + ')'; } });

  $$('#about .hc-img-zoom').forEach(function (box) {               // image parallax
    var img = box.querySelector('img'); if (!img) return;
    ScrollTrigger.create({ trigger: box, start: 'top bottom', end: 'bottom top',
      onUpdate: function (s) { img.style.translate = '0 ' + ((s.progress - 0.5) * -2 * AMT) + 'px'; } });
  });

  var heroInner = document.querySelector('.hc-hero-section > div');   // hero drifts up + softens
  var heroSec = document.querySelector('.hc-hero-section');
  function heroScroll() {                                              // computed from scrollY each time: no stored state
    if (!heroInner || !heroSec) return;
    var p = Math.max(0, Math.min(1, (window.scrollY || 0) / (heroSec.offsetHeight || 1)));
    heroInner.style.translate = p ? '0 ' + (-70 * p).toFixed(1) + 'px' : '';
    heroInner.style.opacity = p ? String(1 - 0.6 * p) : '';
  }

  var line = document.querySelector('.hc-timeline-line');          // timeline stem draws as you scroll
  if (line) gsap.fromTo(line, { scaleY: 0, transformOrigin: 'top' }, { scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.hc-timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });

  /* ---------- pointer effects (mouse / trackpad only) ---------- */
  if (fine) {
    var ring = document.createElement('div');                      // cursor ring with spring-like lag
    ring.className = 'mo-cursor'; ring.setAttribute('aria-hidden', 'true'); document.body.appendChild(ring);
    var cx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    var cy = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    window.addEventListener('pointermove', function (e) {
      cx(e.clientX); cy(e.clientY); ring.classList.add('is-on');
      ring.classList.toggle('is-link', !!e.target.closest('a,button,summary,[role="button"],.hc-lift-card'));
    }, { passive: true });
    window.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });
    root.addEventListener('mouseleave', function () { ring.classList.remove('is-on'); });

    $$('.hc-btn-primary, .hc-btn-ghost-dark, .hc-social-list a').forEach(function (b) {   // magnetic buttons
      if (b.closest('.hc-mobile-cta')) return;
      b.classList.add('mo-mag');
      var cfg = { duration: 0.9, ease: 'elastic.out(1, 0.4)' };
      var mx = gsap.quickTo(b, 'x', cfg), my = gsap.quickTo(b, 'y', cfg);
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.28); my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener('pointerleave', function () { mx(0); my(0); });
    });

    $$('.hc-plantation-card, .hc-crop-card, .hc-plan-card').forEach(function (c) {   // 3D tilt
      c.classList.add('mo-tilt');
      gsap.set(c, { transformPerspective: 900 });
      var cfg = { duration: 0.6, ease: 'power3' };
      var rx = gsap.quickTo(c, 'rotationX', cfg), ry = gsap.quickTo(c, 'rotationY', cfg), ly = gsap.quickTo(c, 'y', cfg);
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--cx', (e.clientX - r.left) + 'px'); c.style.setProperty('--cy', (e.clientY - r.top) + 'px');
        ry(((e.clientX - r.left) / r.width - 0.5) * 9); rx(-((e.clientY - r.top) / r.height - 0.5) * 9); ly(-6);
      });
      c.addEventListener('pointerleave', function () { rx(0); ry(0); ly(0); });
    });
  }

  /* ================= TEXT FX (kept deliberately calm and readable) ================= */
  var CH = '!<>-_/[]{}=+*^?#ABCDEFGHJKLMNOPRSTUVWXYZ';
  function scramble(el, text, dur) {
    var t0 = performance.now(), n = text.length;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), out = '', k = Math.floor(p * n);
      for (var i = 0; i < n; i++) out += (i < k || text[i] === ' ') ? text[i] : CH[(Math.random() * CH.length) | 0];
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step); else el.textContent = text;
    })(t0);
  }
  // Small section labels decode once as they scroll in
  var eyeIO = new IntersectionObserver(function (en) {
    en.forEach(function (e) {
      if (!e.isIntersecting) return; eyeIO.unobserve(e.target);
      var tn = Array.prototype.filter.call(e.target.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0];
      if (!tn) return;
      var span = document.createElement('span'), txt = tn.textContent.trim();
      span.textContent = txt; e.target.replaceChild(span, tn); scramble(span, txt, 800);
    });
  }, { threshold: 0.6 });
  $$('.hc-eyebrow').forEach(function (e) { if (!inHero(e)) eyeIO.observe(e); });

  // Paragraphs: words fade from dim to full as you read down (opacity only, so it stays crisp)
  $$('.hc-body-copy, .hc-body-copy-on-dark').forEach(function (p) {
    if (inHero(p)) return;
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var f = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { f.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.textContent = part; f.appendChild(w); words.push(w);
          });
          node.replaceChild(f, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    })(p);
    gsap.fromTo(words, { opacity: 0.2 }, { opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: p, start: 'top 88%', end: 'bottom 62%', scrub: true } });
  });

  // Card / timeline titles: clean masked slide-up
  $$('.hc-icon-box h3, .hc-plan-card h3, .hc-plantation-card h3, .hc-timeline h3, .hc-org-name').forEach(function (h) {
    var o = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; o.disconnect();
      h.animate([{ clipPath: 'inset(0 0 100% 0)', translate: '0 18px', opacity: 0 }, { clipPath: 'inset(0 0 -25% 0)', translate: '0 0', opacity: 1 }],
        { duration: 900, delay: 120, easing: EASE, fill: 'backwards' });
    }, { threshold: 0.6 }); o.observe(h);
  });

  // Big numbers: soft pop-in
  $$('.hc-stat-number, .hc-sustain-card .font-display').forEach(function (n) {
    var o = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; o.disconnect();
      n.animate([{ scale: '.82', opacity: 0 }, { scale: '1', opacity: 1 }], { duration: 900, easing: EASE, fill: 'backwards' });
    }, { threshold: 0.7 }); o.observe(n);
  });

  // Gold line draws under each section heading once it has revealed
  $$('section h2.font-display').forEach(function (h) {
    if (inHero(h)) return;
    var ln = document.createElement('span'); ln.className = 'mo-hline'; ln.setAttribute('aria-hidden', 'true');
    h.insertAdjacentElement('afterend', ln);
    ln.style.scale = '0 1';
    var o = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; o.disconnect();
      ln.style.scale = ''; ln.animate([{ scale: '0 1' }, { scale: '1 1' }], { duration: 1100, delay: 500, easing: EASE, fill: 'backwards' });
    }, { threshold: 0.8 }); o.observe(h);
  });

  /* ================= LAYER 2 ================= */

  // Ambient light drifting behind the dark sections
  function orbs(sel, specs) {
    var host = document.querySelector(sel); if (!host) return;
    host.classList.add('mo-host');
    specs.forEach(function (s) {
      var o = document.createElement('span'); o.className = 'mo-orb'; o.setAttribute('aria-hidden', 'true');
      o.style.cssText = 'width:' + s[0] + 'px;height:' + s[0] + 'px;left:' + s[1] + ';top:' + s[2] + ';--x:' + s[3] + 'px;--y:' + s[4] + 'px;--d:' + s[5] + 's';
      host.insertBefore(o, host.firstChild);
    });
  }
  orbs('.hc-hero-section', [[520, '-8%', '10%', 60, -40, 20], [380, '62%', '55%', -50, 30, 16]]);
  orbs('.hc-investment-section', [[460, '70%', '-10%', -60, 40, 22]]);
  orbs('.hc-finalcta-section', [[480, '8%', '-25%', 70, 30, 19], [360, '75%', '40%', -40, -30, 15]]);

  // More parallax: card photos drift slower than the page
  $$('.hc-plantation-card .hc-img-zoom img, .hc-crop-card > img').forEach(function (img) {
    img.classList.add('mo-px');
    ScrollTrigger.create({ trigger: img.parentNode, start: 'top bottom', end: 'bottom top',
      onUpdate: function (s) { img.style.translate = '0 ' + ((s.progress - 0.5) * -2 * (AMT / 2)) + 'px'; } });
  });

  // "The Journey" strip: highlight each stage in turn while it is on screen
  var steps = $$('.hc-journey-step');
  if (steps.length) {
    var ji = 0, jt = null;
    var jtick = function () { steps.forEach(function (s, i) { s.classList.toggle('hc-journey-step-current', i === ji); }); ji = (ji + 1) % steps.length; };
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { if (!jt) { jtick(); jt = setInterval(jtick, 1300); } } else { clearInterval(jt); jt = null; }
    }, { threshold: 0.3 }).observe(steps[0].closest('section'));
  }

  // Click ripple on primary buttons
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.hc-btn-primary'); if (!b) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, d = document.createElement('span');
    d.className = 'mo-ripple';
    d.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    b.appendChild(d);
    d.animate([{ scale: 0, opacity: 0.6 }, { scale: 1, opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = function () { d.remove(); };
  });

  // Hero depth: panel and light orbs shift at different rates with the mouse
  if (fine) {
    var hero = document.querySelector('.hc-hero-section'), panel = document.querySelector('.hc-float-panel');
    if (hero && panel) {
      var sp = { duration: 1.2, ease: 'power3' };
      var qpx = gsap.quickTo(panel, 'x', sp), qpy = gsap.quickTo(panel, 'y', sp);
      var oq = $$('.mo-orb', hero).map(function (o) { var c = { duration: 1.8, ease: 'power3' }; return [gsap.quickTo(o, 'x', c), gsap.quickTo(o, 'y', c)]; });
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        qpx(nx * -22); qpy(ny * -16);
        oq.forEach(function (q, i) { q[0](nx * (i + 1) * 28); q[1](ny * (i + 1) * 28); });
      });
      hero.addEventListener('pointerleave', function () { qpx(0); qpy(0); oq.forEach(function (q) { q[0](0); q[1](0); }); });
    }
  }

  /* ================= LAYER 3 ================= */

  // Scroll velocity (smoothed, -1…1). Drives heading skew, the marquee and the WebGL shaders.
  var vel = 0, velT = 0, lastSk = 0, mx = 0, mW = 0, mTrack = null, mSeen = false;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { velT = s.getVelocity(); } });
  var skewEls = $$('section h2.font-display');


  // Nav: sliding gold indicator follows the scrollspy's .active link
  var navWrap = document.querySelector('.hc-nav-links');
  if (navWrap) {
    navWrap.style.position = 'relative';
    var ind = document.createElement('span'); ind.className = 'mo-nav-ind'; navWrap.appendChild(ind);
    var moveInd = function () {
      var a = navWrap.querySelector('.hc-nav-link.active');
      gsap.to(ind, a ? { x: a.offsetLeft, width: a.offsetWidth, opacity: 1, duration: 0.7, ease: 'power4.out' } : { opacity: 0, duration: 0.3 });
    };
    new MutationObserver(moveInd).observe(navWrap, { subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', moveInd); setTimeout(moveInd, 1800);
  }

  // Mobile menu: links stagger in whenever it opens
  var mmenu = document.getElementById('mobile-menu');
  if (mmenu) new MutationObserver(function () {
    if (!mmenu.classList.contains('is-open')) return;
    $$('a', mmenu).forEach(function (a, i) {
      a.animate([{ opacity: 0, translate: '0 30px' }, { opacity: 1, translate: '0 0' }], { duration: 800, delay: 150 + i * 60, easing: EASE, fill: 'backwards' });
    });
  }).observe(mmenu, { attributes: true, attributeFilter: ['class'] });

  // "How it works": scroll-linked focus on the step at reading height
  var tlSteps = $$('.hc-timeline .flex.items-start');
  function timelineScroll() {                                          // done = already passed, live = at reading height, rest = upcoming
    var vh = window.innerHeight;
    tlSteps.forEach(function (st) {
      var r = st.getBoundingClientRect(), live = r.top < vh * 0.62 && r.bottom > vh * 0.42, done = r.bottom <= vh * 0.42;
      st.classList.toggle('is-live', live); st.classList.toggle('is-done', done);
    });
  }

  // Pointer spotlight on the dark sections
  if (fine) ['.hc-investment-section', '.hc-exports-section', '.hc-finalcta-section'].forEach(function (sel) {
    var s = document.querySelector(sel); if (!s) return;
    s.classList.add('mo-host');
    var sp = document.createElement('span'); sp.className = 'mo-spot'; sp.setAttribute('aria-hidden', 'true'); s.insertBefore(sp, s.firstChild);
    var raf = 0;
    s.addEventListener('pointermove', function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0; var r = s.getBoundingClientRect();
        sp.style.setProperty('--mx', (e.clientX - r.left) + 'px'); sp.style.setProperty('--my', (e.clientY - r.top) + 'px'); sp.style.opacity = 1;
      });
    });
    s.addEventListener('pointerleave', function () { sp.style.opacity = 0; });
  });

  // FAQ: height-animated open/close (native <details> snaps)
  $$('.hc-accordion-item').forEach(function (d) {
    var s = d.querySelector('summary'); if (!s) return;
    s.addEventListener('click', function (e) {
      e.preventDefault();
      if (d._a) d._a.cancel();
      var h0 = d.offsetHeight, closing = d.open, h1;
      d.style.overflow = 'hidden';
      if (closing) { var cs = getComputedStyle(d); h1 = s.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); }
      else { d.open = true; h1 = d.offsetHeight; }
      d._a = d.animate({ height: [h0 + 'px', h1 + 'px'] }, { duration: closing ? 420 : 560, easing: EASE });
      d._a.onfinish = d._a.oncancel = function () { if (closing) d.open = false; d.style.overflow = ''; d._a = null; };
    });
  });

  /* ================= SMOOTH SCROLL (Lenis, loaded from a CDN) =================
     Set SMOOTH to false to go back to the browser's normal scrolling. If the CDN fails, the page just scrolls natively. */
  var SMOOTH = true, lenis = null;
  function startSmooth() {
    if (!window.Lenis || lenis) return;
    lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    // anchor links (nav, buttons, footer) glide through Lenis instead of fighting it
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
      var id = a.getAttribute('href'); if (!id || id === '#') return;
      var t = document.querySelector(id); if (!t) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var mm = document.getElementById('mobile-menu');
      if (mm && mm.classList.contains('is-open')) {
        mm.classList.remove('is-open');
        var bt = document.getElementById('menu-toggle'); if (bt) bt.setAttribute('aria-expanded', 'false');
        lenis.start();
      }
      lenis.scrollTo(t, { duration: 1.3, force: true });
    }, true);
    var menu = document.getElementById('mobile-menu');       // no page scrolling behind the open mobile menu
    if (menu) {
      menu.setAttribute('data-lenis-prevent', '');
      new MutationObserver(function () { if (menu.classList.contains('is-open')) lenis.stop(); else lenis.start(); })
        .observe(menu, { attributes: true, attributeFilter: ['class'] });
    }
  }
  if (SMOOTH) {
    if (window.Lenis) startSmooth();
    else {
      var ls = document.createElement('script');
      ls.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js'; ls.async = true;
      ls.onload = startSmooth; document.head.appendChild(ls);
    }
  }

  // WebGL layer: loaded only after the page is idle, and only where it is likely to run well
  var gl0 = document.createElement('canvas'), hasGL = false;
  try { hasGL = !!gl0.getContext('webgl'); } catch (err) { hasGL = false; }
  var saveData = navigator.connection && navigator.connection.saveData;
  if (hasGL && !saveData) window.addEventListener('load', function () {
    var go = function () {
      var s = document.createElement('script');
      s.src = SELF ? SELF.replace(/motion\.js(\?.*)?$/, 'motion-gl.js') : 'motion-gl.js'; s.async = true;
      s.onload = function () { if (window.HCGL) window.HCGL.init({ fine: fine, low: LOW }); };
      document.head.appendChild(s);
    };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2000 }); else setTimeout(go, 800);
  });

  /* ---------- blog list is filled in later by script.js: re-measure + reveal new cards ---------- */
  var feed = document.querySelector('[data-news-api]');
  if (feed) new MutationObserver(function () {
    $$('.hc-news-item', feed).forEach(function (it, i) { rise(it.parentNode, i * 100); });
    ScrollTrigger.refresh();
  }).observe(feed, { childList: true });

  /* ---------- hero intro: curtain lifts, headline words rise, rest follows ---------- */
  var h1 = document.querySelector('.hc-hero-section h1');
  var heroWords = h1 ? splitWords(h1) : [];
  if (h1) h1.style.opacity = '1';

  function intro() {
    root.classList.add('mo-go');
    setTimeout(function () {
      revealWords(heroWords, 0);
      $$('.hc-hero-copy').forEach(function (e) { rise(e, 550); });
      $$('.hc-hero-section .mt-9 > *').forEach(function (e, i) { rise(e, 700 + i * 110); });
      $$('.hc-float-panel').forEach(function (e) { rise(e, 900, 44); });
      $$('.hc-nav-links .hc-nav-link').forEach(function (e, i) { rise(e, 300 + i * 55, -14); });
    }, 600);
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2200); })]), new Promise(function (r) { setTimeout(r, 1500); })]).then(intro);

  var tick = 0;
  function onScroll() { if (tick) return; tick = requestAnimationFrame(function () { tick = 0; heroScroll(); timelineScroll(); }); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('pageshow', onScroll);
  heroScroll(); timelineScroll();
  window.addEventListener('load', function () { ScrollTrigger.refresh(); heroScroll(); timelineScroll(); });
})();