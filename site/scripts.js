// ============================================
// ABLAZE — SHARED SITE JS
// Loaded on every page. Handles: nav, embers, scroll
// reveal, analytics (GA4 / Meta / TikTok), UTM
// preservation, CTA click tracking, and the mobile
// sticky CTA bar.
// ============================================

// --------------------------------------------
// ANALYTICS CONFIG
// No real IDs are committed. Set these to turn tracking on.
// Three ways to configure (pick one):
//   1) Edit the defaults below.
//   2) Define window.ABLAZE_CONFIG before this script loads
//      (e.g. via a small inline <script> or Netlify snippet injection
//       that reads deploy env vars).
//   3) Leave blank — events still fire to console.debug for QA,
//      and no third-party scripts load.
// --------------------------------------------
(function () {
  'use strict';

  var cfg = Object.assign(
    {
      ga4Id: '',        // e.g. 'G-XXXXXXX'  (GA4 Measurement ID)
      metaPixelId: '',  // e.g. '123456789012345'  (Meta/Facebook Pixel ID)
      tiktokPixelId: '' // e.g. 'CXXXXXXXXXXXXXXXXX'  (TikTok Pixel ID)
    },
    window.ABLAZE_CONFIG || {}
  );

  // ---- GA4 ----
  if (cfg.ga4Id) {
    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4Id);
    document.head.appendChild(ga);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', cfg.ga4Id, { anonymize_ip: true });
  }

  // ---- Meta (Facebook) Pixel ----
  if (cfg.metaPixelId) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', cfg.metaPixelId);
    window.fbq('track', 'PageView');
  }

  // ---- TikTok Pixel ----
  if (cfg.tiktokPixelId) {
    !(function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function (e, n) { e[n] = function () { e.push([n].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (e) { for (var n = ttq._i[e] || [], i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(n, ttq.methods[i]); return n; };
      ttq.load = function (e, n) {
        var r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        var o = d.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = r + '?sdkid=' + e + '&lib=' + t;
        var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a);
      };
      ttq.load(cfg.tiktokPixelId); ttq.page();
    })(window, document, 'ttq');
  }

  // --------------------------------------------
  // UTM PRESERVATION
  // Capture UTMs on first landing, persist for the
  // session, and carry them onto outbound store /
  // streaming links so attribution survives the jump.
  // --------------------------------------------
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'ttclid', 'gclid'];
  function captureUtms() {
    var found = {};
    try {
      var p = new URLSearchParams(window.location.search);
      UTM_KEYS.forEach(function (k) { if (p.get(k)) found[k] = p.get(k); });
      if (Object.keys(found).length) sessionStorage.setItem('ablaze_utms', JSON.stringify(found));
      return JSON.parse(sessionStorage.getItem('ablaze_utms') || '{}');
    } catch (e) { return found; }
  }
  var UTMS = captureUtms();
  function withUtms(url) {
    if (!url || !Object.keys(UTMS).length) return url;
    try {
      var u = new URL(url, window.location.href);
      Object.keys(UTMS).forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, UTMS[k]); });
      return u.toString();
    } catch (e) { return url; }
  }
  window.ablazeWithUtms = withUtms;

  // --------------------------------------------
  // EVENT TRACKING
  // trackEvent fans out to whatever is configured.
  // Falls back to console.debug for pre-launch QA.
  // --------------------------------------------
  function trackEvent(name, params) {
    params = params || {};
    try { if (window.gtag) window.gtag('event', name, params); } catch (e) {}
    try { if (window.fbq) window.fbq('trackCustom', name, params); } catch (e) {}
    try { if (window.ttq) window.ttq.track(name, params); } catch (e) {}
    if (!cfg.ga4Id && !cfg.metaPixelId && !cfg.tiktokPixelId && window.console) {
      console.debug('[ablaze:track]', name, params);
    }
  }
  window.ablazeTrack = trackEvent;

  // Map a link/button to a conversion event by its destination.
  // Explicit data-track always wins.
  function inferEvent(href) {
    if (!href) return null;
    var h = href.toLowerCase();
    if (h.indexOf('merch.discovertheu.com') > -1 || h.indexOf('shop.ablazeyc.com') > -1) {
      return h.indexOf('/products/') > -1 ? 'product_click' : 'shop_merch_click';
    }
    if (h.indexOf('merch') > -1) return 'shop_merch_click';
    if (h.indexOf('open.spotify.com') > -1 || h.indexOf('music.apple.com') > -1 ||
        h.indexOf('music.youtube') > -1 || /(^|\/)music(\.html|\/|$)/.test(h)) return 'listen_now_click';
    if (/(^|\/)book(ing)?(\.html|\/|$)/.test(h)) return 'book_ablaze_click';
    if (/(^|\/)sponsor(\.html|\/|$)/.test(h)) return 'sponsor_click';
    if (/(^|\/)press(\.html|\/|$)/.test(h)) return 'press_kit_click';
    if (/(^|\/)society(\.html|\/|$)/.test(h)) return 'join_society_click';
    return null;
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a, button');
    if (!el) return;
    var explicit = el.getAttribute('data-track');
    var href = el.getAttribute('href') || '';
    var label = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (explicit) { trackEvent(explicit, { label: label, href: href }); return; }
    var ev = inferEvent(href);
    if (ev) trackEvent(ev, { label: label, href: href });
  }, { passive: true });

  // --------------------------------------------
  // DOM-READY WIRING
  // --------------------------------------------
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var body = document.body;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // SKIP LINK (a11y) — inject + ensure a target id exists
    if (!document.querySelector('.skip-link')) {
      var target = document.querySelector('main, header, section');
      if (target && !target.id) target.id = 'main';
      var skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#' + (target ? target.id : 'top');
      skip.textContent = 'Skip to content';
      body.insertBefore(skip, body.firstChild);
    }

    // MOBILE MENU
    var mb = document.getElementById('menuBtn');
    var cb = document.getElementById('closeBtn');
    var mm = document.getElementById('mMenu');
    if (mb && mm) {
      mb.setAttribute('aria-expanded', 'false');
      mb.addEventListener('click', function () { mm.classList.add('open'); mb.setAttribute('aria-expanded', 'true'); });
    }
    function closeMenu() { if (mm) { mm.classList.remove('open'); if (mb) mb.setAttribute('aria-expanded', 'false'); } }
    if (cb) cb.addEventListener('click', closeMenu);
    if (mm) mm.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

    // EMBERS
    var e = document.getElementById('embers');
    if (e && !reduceMotion) {
      for (var i = 0; i < 22; i++) {
        var d = document.createElement('div');
        d.className = 'ember';
        var s = Math.random() * 8 + 4;
        d.style.width = s + 'px';
        d.style.height = s + 'px';
        d.style.left = (Math.random() * 100) + '%';
        d.style.bottom = '-20px';
        d.style.animationDuration = (Math.random() * 8 + 8) + 's';
        d.style.animationDelay = (Math.random() * 8) + 's';
        e.appendChild(d);
      }
    }

    // REVEAL ON SCROLL (with graceful fallbacks)
    var reveals = document.querySelectorAll('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { io.observe(el); });
    }

    // ACTIVE NAV LINK
    var path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav ul a, .m-menu a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });

    // CARRY UTMs ONTO OUTBOUND STORE / STREAMING LINKS
    if (Object.keys(UTMS).length) {
      var decorateHosts = ['merch.discovertheu.com', 'shop.ablazeyc.com', 'open.spotify.com', 'music.apple.com'];
      document.querySelectorAll('a[href^="http"]').forEach(function (a) {
        try {
          var host = new URL(a.href).hostname;
          if (decorateHosts.indexOf(host) > -1) a.href = withUtms(a.href);
        } catch (err) {}
      });
    }

    // ------------------------------------------------------------------
    // FORMS → ASANA INTAKE  (progressive enhancement)
    // Every inquiry / contact / signup form is intercepted and POSTed as JSON
    // to the secure Netlify function (/.netlify/functions/submit-form), which
    // creates an Asana task. The Asana token NEVER touches the browser.
    //
    // Resilience: registered Netlify forms (data-netlify) keep their native
    // submission as a fallback — if the function is unreachable or not yet
    // configured, the browser submits the real form so Netlify still captures
    // it and nothing is lost. The scholarship application keeps its existing
    // Netlify-only flow untouched.
    // ------------------------------------------------------------------
    var ASANA_ENDPOINT = '/.netlify/functions/submit-form';

    function formStatusEl(f) {
      if (!f._statusEl) {
        var s = document.createElement('div');
        s.className = 'form-status';
        s.setAttribute('role', 'status');
        s.setAttribute('aria-live', 'polite');
        f.parentNode.insertBefore(s, f.nextSibling);
        f._statusEl = s;
      }
      return f._statusEl;
    }
    function showStatus(f, kind, msg) {
      var s = formStatusEl(f);
      s.className = 'form-status show ' + kind;
      s.textContent = msg;
    }
    function clearStatus(f) { if (f._statusEl) f._statusEl.className = 'form-status'; }

    function fireFormAnalytics(name) {
      var evMap = { booking: 'book_ablaze_click', sponsor: 'sponsor_click', press: 'press_kit_click' };
      if (name === 'fan-signup') trackEvent('join_society_click', { stage: 'submit' });
      trackEvent('form_submit', { form: name });
      if (evMap[name]) trackEvent(evMap[name], { stage: 'submit' });
    }

    function collectFields(f) {
      var data = {};
      f.querySelectorAll('input, select, textarea').forEach(function (el) {
        // The links-page signup has an unnamed email input — name it on the fly.
        if (!el.name && el.type === 'email') el.name = 'email';
        if (!el.name) return;
        if (el.type === 'checkbox') {
          data[el.name] = el.checked ? (el.value && el.value !== 'on' ? el.value : 'Yes') : '';
        } else if (el.type === 'radio') {
          if (el.checked) data[el.name] = el.value;
        } else {
          data[el.name] = el.value;
        }
      });
      return data;
    }

    function wireForm(f) {
      var name = f.getAttribute('name') || 'fan-signup';
      var isNetlify = f.hasAttribute('data-netlify');

      // Scholarship application: leave the existing Netlify Forms flow alone.
      if (name === 'scholarship') {
        f.addEventListener('submit', function () { fireFormAnalytics(name); });
        return;
      }

      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        clearStatus(f);
        var btn = f.querySelector('button[type=submit], button:not([type])');
        var orig = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = 'Sending…'; }

        var data = collectFields(f);
        data.form_name = name;
        data.request_type = f.getAttribute('data-request-type') || '';
        data.source_page = window.location.href;
        data.submitted_at = new Date().toISOString();
        try { Object.keys(UTMS).forEach(function (k) { if (!data[k]) data[k] = UTMS[k]; }); } catch (e) {}

        fireFormAnalytics(name);

        var restore = function () { if (btn) { btn.disabled = false; btn.innerHTML = orig; } };
        var succeed = function () {
          if (isNetlify && f.getAttribute('action')) {
            window.location.href = f.getAttribute('action'); // → thank-you.html
          } else {
            if (btn) btn.innerHTML = 'Sent ✓';
            setTimeout(function () { f.reset(); restore(); }, 2400);
          }
        };
        var nativeFallback = function () {
          if (isNetlify) f.submit();  // durable: native Netlify Forms capture
          else succeed();             // mini signup: behave like before (never worse)
        };

        fetch(ASANA_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (out) {
            return { status: res.status, out: out };
          });
        }).then(function (r) {
          if (r.status >= 200 && r.status < 300 && r.out.ok !== false) { succeed(); return; }
          if (r.status === 400 || r.status === 429) {
            restore();
            showStatus(f, 'error', r.out.error || 'Please check the form and try again.');
            return;
          }
          nativeFallback(); // 5xx or { fallback:true } (e.g. Asana not configured yet)
        }).catch(function () {
          nativeFallback(); // network failure — never lose the submission
        });
      });
    }

    var wiredForms = [];
    document.querySelectorAll('form[data-netlify], form[data-form], #society-form').forEach(function (f) {
      if (wiredForms.indexOf(f) > -1) return;
      wiredForms.push(f);
      wireForm(f);
    });

    // MOBILE STICKY CTA BAR (injected once, mobile-only via CSS)
    if (!document.querySelector('.sticky-cta')) {
      var bar = document.createElement('nav');
      bar.className = 'sticky-cta';
      bar.setAttribute('aria-label', 'Quick actions');
      bar.innerHTML =
        '<a class="s-listen" href="music.html" data-track="listen_now_click" aria-label="Listen to Ablaze"><svg aria-hidden="true"><use href="assets/icons/icons.svg#play"></use></svg>Listen</a>' +
        '<a class="s-shop" href="merch.html" data-track="shop_merch_click" aria-label="Shop Ablaze merch">Shop</a>' +
        '<a class="s-book" href="booking.html" data-track="book_ablaze_click" aria-label="Book Ablaze">Book Ablaze</a>';
      body.appendChild(bar);
      body.classList.add('has-sticky-cta');
      var toggleBar = function () {
        if (window.scrollY > 600) bar.classList.add('show'); else bar.classList.remove('show');
      };
      window.addEventListener('scroll', toggleBar, { passive: true });
      toggleBar();
    }

    // PATREON — append to every footer's "The Movement" column (sitewide, DRY)
    var PATREON_URL = 'https://www.patreon.com/cw/AblazeSociety';
    document.querySelectorAll('.foot-col').forEach(function (col) {
      var h = col.querySelector('h5');
      if (h && /movement/i.test(h.textContent) && !col.querySelector('a[href*="patreon"]')) {
        var pa = document.createElement('a');
        pa.href = PATREON_URL; pa.target = '_blank'; pa.rel = 'noopener';
        pa.textContent = 'Patreon';
        pa.setAttribute('data-track', 'join_society_click');
        col.appendChild(pa);
      }
    });
  });
})();
