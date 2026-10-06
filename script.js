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

  /* ----------------------------------------------------------
     5c) ORG CHART — draw the connector lines as each tier scrolls into view
     (Presentation only; without JS the chart is simply fully drawn.)
  ----------------------------------------------------------- */
  var org = document.getElementById('org-chart');
  if (org && 'IntersectionObserver' in window) {
    var orgIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        orgIO.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.01 });

    org.classList.add('is-armed');
    org.querySelectorAll('[data-org-reveal]').forEach(function (el) { orgIO.observe(el); });
  }

  /* ----------------------------------------------------------
     5d) BLOG & NEWS — load posts from the Blog Admin API
     Posts are added at <api>/admin; no code changes needed. If the API is
     unreachable or empty, the static markup already in the list stays.
  ----------------------------------------------------------- */
  var newsList = document.querySelector('[data-news-api]');
  if (newsList && window.fetch) {
    var api = (newsList.getAttribute('data-news-api') || '').replace(/\/$/, '');
    var esc = function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    };
    var FB = '<svg class="hc-fb-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.34l-.53 3.49h-2.81V24C19.61 23.1 24 18.1 24 12.07z"/></svg>';
    var fmtDate = function (d) {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    fetch(api + '/api/posts')
      .then(function (res) { if (!res.ok) throw new Error('bad status'); return res.json(); })
      .then(function (posts) {
        if (!posts.length) return;
        newsList.innerHTML = posts.map(function (p) {
          var img = p.image ? (p.image.charAt(0) === '/' ? api + p.image : p.image) : '';
          return '<li><a href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer" class="hc-news-item hc-lift-card hc-blog-card" aria-label="' + esc(p.title) + ' — read on Facebook (opens in a new tab)">' +
            (img ? '<div class="hc-news-media hc-img-zoom"><img src="' + esc(img) + '" alt="" loading="lazy"></div>' : '') +
            '<div class="hc-news-body"><div class="hc-news-meta">' +
            '<span class="hc-news-source">' + FB + 'Facebook</span>' +
            '<span class="hc-blog-category text-xs font-semibold">' + esc(p.category) + '</span>' +
            '<time class="hc-blog-date text-xs" datetime="' + esc(p.date) + '">' + fmtDate(p.date) + '</time></div>' +
            '<h3 class="hc-news-title font-display">' + esc(p.title) + '</h3>' +
            '<p class="hc-body-copy hc-news-excerpt">' + esc(p.excerpt) + '</p>' +
            '<span class="hc-news-cta">Read on Facebook <span class="hc-btn-arrow" aria-hidden="true">↗</span></span>' +
            '</div></a></li>';
        }).join('');
      })
      .catch(function () { /* keep static fallback */ });
  }

  /* ----------------------------------------------------------
     6) CONTACT FORM — sends enquiries to info@heritagecrops.lk
     Uses Web3Forms (free). Set the access_key in index.html.
  ----------------------------------------------------------- */
  var form = document.getElementById('contact-form');
  if (form) {
    var statusEl = document.getElementById('cf-status');
    var submitBtn = document.getElementById('cf-submit');
    var submitLabel = submitBtn.querySelector('.hc-submit-label');
    var defaultLabel = submitLabel.textContent;

    /* Sri Lankan phone validation.
       Form accepts 10 digits starting with 0, e.g. 0771234567 (mobile) or 0112809340 (landline); helper also tolerates +94 forms
       Mobile = 07X (070–078); landline = 0 + valid area code. Returns +94XXXXXXXXX or null. */
    var phoneInput = document.getElementById('cf-phone');
    var phoneError = document.getElementById('cf-phone-error');
    var LK_MOBILE = /^7[0-8]\d{7}$/;
    var LK_LANDLINE = /^(11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)\d{7}$/;

    function normalizeLkPhone(raw) {
      var v = String(raw).replace(/[\s\-().]/g, '');
      if (!/^\+?\d+$/.test(v)) return null;
      var national;
      if (v.indexOf('+94') === 0) national = v.slice(3);
      else if (v.indexOf('0094') === 0) national = v.slice(4);
      else if (v.indexOf('94') === 0 && v.length === 11) national = v.slice(2);
      else if (v.charAt(0) === '0') national = v.slice(1);
      else return null;
      return (LK_MOBILE.test(national) || LK_LANDLINE.test(national)) ? '+94' + national : null;
    }

    function phoneProblem(value) {
      if (value === '') return 'Please enter your phone number.';
      if (value.charAt(0) !== '0') return 'Phone number must start with 0, e.g. 0771234567.';
      if (value.length !== 10) return 'Phone number must be exactly 10 digits, e.g. 0771234567.';
      if (normalizeLkPhone(value) === null) return 'Please enter a valid Sri Lankan mobile (07X) or landline number, e.g. 0771234567 or 0112809340.';
      return '';
    }

    function checkPhone(showMessage) {
      if (!phoneInput) return true;
      var problem = phoneProblem(phoneInput.value.trim());
      var ok = problem === '';
      phoneInput.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!showMessage && ok) { phoneError.textContent = ''; return true; }
      phoneError.textContent = problem;
      return ok;
    }

    if (phoneInput) {
      phoneInput.addEventListener('blur', function () { if (phoneInput.value.trim() !== '') checkPhone(true); });
      phoneInput.addEventListener('input', function () {
        // Digits only, maximum 10 (Sri Lankan local format, e.g. 0771234567).
        // Pasted +94 / 0094 numbers are converted to the local 0-format first.
        var typed = phoneInput.value.replace(/^\s*(\+94|0094)/, '0');
        var cleaned = typed.replace(/\D/g, '').slice(0, 10);
        if (cleaned !== phoneInput.value) phoneInput.value = cleaned;
        // Warn immediately if the first digit is not 0; otherwise re-check only after an earlier error.
        if (cleaned !== '' && cleaned.charAt(0) !== '0') checkPhone(true);
        else if (phoneInput.getAttribute('aria-invalid') === 'true') checkPhone(false);
      });
    }

    var setStatus = function (type, text) {
      statusEl.className = 'hc-form-status sm:col-span-2 text-sm ' + (type ? 'is-' + type : '');
      statusEl.textContent = text;
    };

    /* Email validation: one @, valid characters, a real domain with a dot, and a 2+ letter ending (e.g. .com, .lk). */
    var emailInput = document.getElementById('cf-email');
    var emailError = document.getElementById('cf-email-error');
    var EMAIL_RE = /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

    function emailProblem(value) {
      if (value === '') return 'Please enter your email address.';
      if (/\s/.test(value)) return 'Email address cannot contain spaces.';
      if (value.indexOf('@') === -1) return 'Email address must include "@", e.g. name@example.com.';
      if (value.indexOf('@') !== value.lastIndexOf('@')) return 'Email address can only contain one "@".';
      if (/\.\./.test(value) || /^\.|\.@|@\.|\.$/.test(value)) return 'Please check the dots in your email address.';
      if (!EMAIL_RE.test(value)) return 'Please enter a valid email address, e.g. name@example.com.';
      return '';
    }

    function checkEmail(showMessage) {
      if (!emailInput) return true;
      var problem = emailProblem(emailInput.value.trim());
      var ok = problem === '';
      emailInput.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!showMessage && ok) { emailError.textContent = ''; return true; }
      emailError.textContent = problem;
      return ok;
    }

    if (emailInput) {
      emailInput.addEventListener('blur', function () {
        emailInput.value = emailInput.value.trim();
        if (emailInput.value !== '') checkEmail(true);
      });
      emailInput.addEventListener('input', function () {
        if (emailInput.getAttribute('aria-invalid') === 'true') checkEmail(false);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailOk = checkEmail(true);
      var phoneOk = checkPhone(true);
      if (!emailOk) { emailInput.focus(); return; }
      if (!phoneOk) { phoneInput.focus(); return; }
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var data = Object.fromEntries(new FormData(form));
      data.phone = normalizeLkPhone(data.phone); // send in a consistent +94 format
      data.email = data.email.trim().toLowerCase();
      if (data.access_key === 'YOUR_ACCESS_KEY_HERE') {
        setStatus('error', 'Form is not set up yet: add the Web3Forms access key in index.html.');
        return;
      }

      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';
      setStatus('', '');

      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result.success) {
            form.reset();
            setStatus('success', 'Thank you! Your enquiry has been sent. Our team will be in touch shortly.');
          } else {
            throw new Error(result.message || 'Submission failed');
          }
        })
        .catch(function () {
          setStatus('error', 'Sorry, something went wrong. Please try again or email us at info@heritagecrops.lk.');
        })
        .then(function () {
          submitBtn.disabled = false;
          submitLabel.textContent = defaultLabel;
        });
    });
  }

  /* ----------------------------------------------------------
     7) EXPORTS — animated process cycle
     Highlights each step in turn (Plantation → Global Market),
     draws the gold progress ring, then loops. Pauses while the
     section is off-screen; static (all steps lit) when the visitor
     prefers reduced motion.
  ----------------------------------------------------------- */
  var cycle = document.getElementById('hc-cycle');
  if (cycle) {
    var cNodes = cycle.querySelectorAll('.hc-cycle-node');
    var cArc = cycle.querySelector('.hc-cycle-progress');
    var cDot = cycle.querySelector('.hc-cycle-dot');
    var cCenter = cycle.querySelector('.hc-cycle-center');
    var cCount = cycle.querySelector('.hc-cycle-count');
    var cName = cycle.querySelector('.hc-cycle-name');
    var C_LEN = 1068.14, TOTAL = cNodes.length, STEP_MS = 2000, cIndex = -1, cTimer = null;
    var cNames = [];
    cycle.querySelector('svg').getAttribute('aria-label').replace('Export process cycle: ', '').split(', ').forEach(function (n) { cNames.push(n); });

    function cSet(progressSteps, activeIdx) {
      cArc.style.strokeDashoffset = C_LEN * (1 - progressSteps / TOTAL);
      cDot.style.transform = 'rotate(' + (progressSteps * 360 / TOTAL) + 'deg)';
      cNodes.forEach(function (n, k) {
        n.classList.toggle('is-active', k === activeIdx);
        n.classList.toggle('is-done', activeIdx === -1 ? true : k < activeIdx);
      });
    }

    function cShowStep(k) {
      cSet(k, k);
      cCount.textContent = 'STEP 0' + (k + 1) + ' / 0' + TOTAL;
      cName.textContent = cNames[k];
      cCenter.classList.remove('is-swap'); void cCenter.getBoundingClientRect(); cCenter.classList.add('is-swap');
    }

    function cTick() {
      cIndex++;
      if (cIndex < TOTAL) { cShowStep(cIndex); return; }
      if (cIndex === TOTAL) { cSet(TOTAL, -1); return; }   // ring closes, all steps lit
      cIndex = 0;                                           // snap back and start over
      cycle.classList.add('is-reset');
      cShowStep(0);
      void cycle.getBoundingClientRect();
      cycle.classList.remove('is-reset');
    }

    function cStart() { if (!cTimer) { cTick(); cTimer = setInterval(cTick, STEP_MS); } }
    function cStop() { clearInterval(cTimer); cTimer = null; }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cSet(TOTAL, -1);
      cCount.textContent = 'EXPORT PROCESS';
      cName.textContent = '6 steps';
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? cStart() : cStop();
      }, { threshold: 0.3 }).observe(cycle);
    } else {
      cStart();
    }
  }

});