/* ==================================================================
   HERITAGE CROPS — SCRIPT.JS
   Vanilla JS only, no framework dependencies. Handles:
   1) Sticky nav background swap on scroll
   2) Mobile menu open/close
   3) Smooth-scroll anchor navigation
   4) Scrollspy (active nav link highlighting)
   5) Minimal demo interactivity: stat counters, single-open accordion
   ================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  if (window.lucide) window.lucide.createIcons();

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ----------------------------------------------------------
     1) STICKY NAV — toggle .is-scrolled once past the hero fold
  ----------------------------------------------------------- */
  var nav = document.getElementById('site-nav');
  if (nav) {
    var toggleNavState = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', toggleNavState, { passive: true });
    toggleNavState();
  }

  /* ----------------------------------------------------------
     2) MOBILE MENU
  ----------------------------------------------------------- */
  var menuToggle = document.getElementById('menu-toggle');
  var mobileMenu = document.getElementById('mobile-menu');

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMobileMenu);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobileMenu();
    });
  }

  /* ----------------------------------------------------------
     3) SMOOTH-SCROLL ANCHOR NAVIGATION
     (html{scroll-behavior:smooth} in custom.css already covers
     most cases; this adds focus management for accessibility and
     closes the mobile menu before scrolling.)
  ----------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      closeMobileMenu();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ----------------------------------------------------------
     4) SCROLLSPY — highlight the current section's nav link
  ----------------------------------------------------------- */
  var sectionIds = ['about', 'plantations', 'investment', 'crops', 'exports', 'sustainability', 'management', 'resources', 'contact'];
  var navLinks = document.querySelectorAll('.hc-nav-link');

  if ('IntersectionObserver' in window && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        var match = document.querySelector('.hc-nav-link[href="#' + entry.target.id + '"]');
        if (match) match.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sectionIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* ----------------------------------------------------------
     5a) DEMO INTERACTIVITY — animated stat counters
     (Native rebuild note: Elementor's own Counter widget already
     animates on scroll — this vanilla version is for prototype
     preview only and can be dropped once rebuilt.)
  ----------------------------------------------------------- */
  var counters = document.querySelectorAll('.hc-stat-number');
  if ('IntersectionObserver' in window && counters.length) {
    var counterIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var raw = el.getAttribute('data-count');
        var suffix = el.getAttribute('data-suffix') || '';
        var end = parseInt(raw, 10);

        if (isNaN(end)) {
          el.textContent = raw + suffix;
          counterIO.unobserve(el);
          return;
        }

        var duration = 1400;
        var start = null;

        function step(timestamp) {
          if (!start) start = timestamp;
          var progress = Math.min((timestamp - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * end) + suffix;
          if (progress < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
        counterIO.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (c) { counterIO.observe(c); });
  }

  /* ----------------------------------------------------------
     5b) DEMO INTERACTIVITY — single-open FAQ accordion
     (Native rebuild note: Elementor's Accordion widget has a
     built-in "single open item" setting — this replicates that
     behaviour for the <details> mockup used here.)
  ----------------------------------------------------------- */
  var accordionItems = document.querySelectorAll('.hc-accordion-item');
  accordionItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      accordionItems.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

});
