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

    // HERO VIDEO — respect reduced-motion + Data Saver; poster stays as fallback
    var hv = document.querySelector('.hero-video');
    if (hv) {
      var saveData = navigator.connection && navigator.connection.saveData;
      if (reduceMotion || saveData) {
        hv.removeAttribute('autoplay');
        hv.pause();
        // Actually stop the multi-MB download, not just playback — drop the
        // sources and reset so only the poster remains.
        Array.prototype.forEach.call(hv.querySelectorAll('source'), function (s) { s.remove(); });
        hv.removeAttribute('src');
        hv.load();
      } else {
        var kickVideo = function () {
          if (!hv.paused) return;
          var pv = hv.play();
          if (pv && pv.catch) { pv.catch(function () {}); }
        };
        kickVideo();
        hv.addEventListener('canplay', kickVideo);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) kickVideo(); });
      }
    }

    // HERO SEQUENCE — cross-fade the performance clip and the original hero
    // stills on an endless loop. The video layer holds for one full pass of the
    // clip (not a hard-cut restart), each still holds for its data-hold ms.
    // Skipped entirely for reduced-motion / Data Saver: layer 1 just stays up,
    // which is the pre-sequence hero.
    var heroLayers = document.querySelectorAll('.hero-bg [data-hero-layer]');
    if (heroLayers.length > 1 && hv && !reduceMotion && !(navigator.connection && navigator.connection.saveData)) {
      var li = 0, heroTimer = null;
      var VIDEO_FALLBACK_MS = 14000;

      var holdFor = function (layer) {
        var h = layer.getAttribute('data-hold');
        if (h !== 'video') return parseInt(h, 10) || 7000;
        // One full pass of the clip, minus the fade so the cut lands clean.
        var dur = hv.duration && isFinite(hv.duration) ? hv.duration * 1000 : VIDEO_FALLBACK_MS;
        return Math.max(4000, dur - 1300);
      };

      var ready = function (layer) {
        var img = layer.querySelector('img');
        return !img || (img.complete && img.naturalWidth > 0);
      };

      var showLayer = function (i) {
        // Never fade to a still that has not decoded yet: skip ahead, and fall
        // back to the video layer rather than show an empty hero.
        var guard = 0;
        while (!ready(heroLayers[i]) && guard++ < heroLayers.length) {
          i = (i + 1) % heroLayers.length;
        }
        if (!ready(heroLayers[i])) i = 0;
        li = i;
        heroLayers.forEach(function (l, n) { l.classList.toggle('is-active', n === i); });
        var layer = heroLayers[i];
        var isVideo = layer.getAttribute('data-hold') === 'video';
        // Only run the clip while it is the layer on screen.
        if (isVideo) { hv.currentTime = 0; kickVideo(); } else { hv.pause(); }
        // Restart the drift on whichever still just came up.
        var img = layer.querySelector('img');
        if (img) { img.style.animation = 'none'; void img.offsetWidth; img.style.animation = ''; }
        clearTimeout(heroTimer);
        heroTimer = setTimeout(function () { showLayer((li + 1) % heroLayers.length); }, holdFor(layer));
      };

      // Start the clock once the clip's real duration is known.
      var startSequence = function () { showLayer(0); };
      if (hv.readyState >= 1) startSequence();
      else hv.addEventListener('loadedmetadata', startSequence, { once: true });
      // A hidden tab freezes timers; resync rather than resume mid-fade.
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { clearTimeout(heroTimer); } else { showLayer(li); }
      });
    }

    // NAV — scrolled state (denser, darker chrome once content moves)
    var navEl = document.querySelector('.nav');
    if (navEl) {
      var navState = function () { navEl.classList.toggle('scrolled', window.scrollY > 40); };
      window.addEventListener('scroll', navState, { passive: true });
      navState();
    }

    // STAT COUNT-UP — proof-band numbers count in once when they enter view
    var proofNums = document.querySelectorAll('.proof .num');
    if (proofNums.length && !reduceMotion && 'IntersectionObserver' in window) {
      var countIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          countIo.unobserve(en.target);
          var m = (en.target.textContent || '').trim().match(/^(\d+(?:\.\d+)?)(.*)$/);
          if (!m) return;
          var end = parseFloat(m[1]), suffix = m[2], t0 = null;
          var tick = function (ts) {
            if (!t0) t0 = ts;
            var p = Math.min((ts - t0) / 1100, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            en.target.textContent = Math.round(end * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      }, { threshold: 0.4 });
      proofNums.forEach(function (n) { countIo.observe(n); });
    }

    // YOUTUBE FACADE — click-to-load embed. The page stays light (no YouTube
    // JS/cookies) until a visitor actually presses play.
    document.querySelectorAll('.yt-facade[data-yt-embed]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var wrap = btn.closest('.yt-player') || btn.parentNode;
        var path = btn.getAttribute('data-yt-embed');
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + path + (path.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1&playsinline=1&rel=0';
        f.title = btn.getAttribute('aria-label') || 'YouTube video player';
        f.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('tabindex', '-1');
        wrap.appendChild(f);
        f.focus();
        btn.remove();
      });
    });

    // OPENER — the homepage flame intro. The <head> gate decides whether it runs
    // and drops the scroll lock on a timer by itself; this only wires the ways out.
    var opener = document.getElementById('opener');
    if (opener) {
      var openerClosing = false;
      var closeOpener = function () {
        if (openerClosing || !document.documentElement.classList.contains('opener-on')) return;
        openerClosing = true;
        opener.classList.add('is-closing');
        setTimeout(function () { document.documentElement.classList.remove('opener-on'); }, 260);
      };
      var openerSkip = document.getElementById('openerSkip');
      if (openerSkip) openerSkip.addEventListener('click', closeOpener);
      opener.addEventListener('click', closeOpener);
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeOpener(); });
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

    // ------------------------------------------------------------------
    // "WRONG FORM" REDIRECT
    // The contact form's Inquiry Type dropdown offers categories that have a
    // dedicated form elsewhere on the site. Those forms collect required fields
    // the contact form has no equivalent for — a booking with no date, venue or
    // audience size can't be answered, only chased — so picking one of these on
    // the contact form sends the visitor to next-step.html instead of the normal
    // thank-you page, where they're asked to fill the real form.
    //
    // The submission is still delivered either way (Asana card + notifications);
    // this only changes where the visitor lands. Never drop a lead over a
    // routing mistake.
    //
    // Keys must match contact.html's <option> text EXACTLY. Options with no
    // dedicated form of their own — Merch, Testimony, Director, Fan Mail, Other
    // — are deliberately absent: the contact form IS their intake, so they go to
    // thank-you.html as before.
    // ⚠️ Mirrored server-side in netlify/functions/submit-form.js → REDIRECT_FORMS
    // (which sends the matching auto-reply email). Change both together.
    var REDIRECTS = {
      'Booking':                   'booking',
      'Press / Media':             'press',
      'Sponsorship / Partnership': 'sponsor',
      'Scholarship':               'scholarship',
    };

    // Returns the next-step URL for a submission, or '' to use the form's normal
    // action. Contact form only — the dedicated forms are already the right form.
    function redirectFor(formName, data) {
      if (formName !== 'contact') return '';
      var variant = REDIRECTS[(data.inquiry || '').trim()];
      return variant ? 'next-step.html?to=' + variant : '';
    }

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
      // Captured once so a redirect on one submit can be undone on the next —
      // a visitor who picks "Booking", sees a validation error, then switches to
      // "Fan Mail" must land on thank-you.html, not the stale booking redirect.
      var defaultAction = f.getAttribute('action');

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

        // Point the form at next-step.html when the visitor picked an inquiry
        // type that has its own form. Setting the ACTION rather than calling
        // window.location directly is what makes this survive the failure paths:
        // succeed() and nativeFallback() both read the action, so the visitor
        // gets the same redirect whether the function answered, 503'd, or the
        // network dropped entirely. thank-you.html gets ?from=<form> so it can
        // greet a booking lead differently from a fan signup.
        if (defaultAction) {
          var action = redirectFor(name, data) || defaultAction;
          if (action.indexOf('thank-you') > -1 && action.indexOf('from=') === -1) {
            action += (action.indexOf('?') > -1 ? '&' : '?') + 'from=' + encodeURIComponent(name);
          }
          f.setAttribute('action', action);
        }

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
          if (isNetlify) {
            f.submit();  // durable: native Netlify Forms capture
            return;
          }
          // Mini email signups (index/merch/society) are NOT registered Netlify
          // forms, so there is nothing to fall back TO — no durable row, no
          // submission_created hook, no notification. This used to call succeed()
          // and show "Sent ✓" anyway, which meant a failed signup looked
          // identical to a successful one and the address was gone for good.
          // Tell the truth instead so the visitor can retry.
          restore();
          showStatus(f, 'error', 'That didn’t send — please try again, or email ablazeyouthchoir@ucfministries.org.');
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

    // BOOKING FORM — 3 staged steps, tier deep-link preselect, lead-time floor
    var bookForm = document.querySelector('form[name="booking"].form--staged');
    if (bookForm) {
      var steps = Array.prototype.slice.call(bookForm.querySelectorAll('.fstep'));
      var railItems = Array.prototype.slice.call(bookForm.querySelectorAll('.form-steps .fs'));
      var curStep = 0;
      var setStep = function (i, focusFirst) {
        curStep = Math.max(0, Math.min(steps.length - 1, i));
        steps.forEach(function (s, si) { s.classList.toggle('active', si === curStep); });
        railItems.forEach(function (r, ri) {
          r.classList.toggle('active', ri === curStep);
          r.classList.toggle('done', ri < curStep);
        });
        if (focusFirst) {
          var first = steps[curStep].querySelector('input:not([type=hidden]), select, textarea');
          if (first) first.focus();
        }
      };
      var stepValid = function () {
        var fields = steps[curStep].querySelectorAll('input, select, textarea');
        for (var fi = 0; fi < fields.length; fi++) {
          if (!fields[fi].checkValidity()) { fields[fi].reportValidity(); return false; }
        }
        return true;
      };
      bookForm.querySelectorAll('.btn-next').forEach(function (b) {
        b.addEventListener('click', function () { if (stepValid()) setStep(curStep + 1, true); });
      });
      bookForm.querySelectorAll('.btn-back').forEach(function (b) {
        b.addEventListener('click', function () { setStep(curStep - 1, true); });
      });
      // If submit finds an invalid field on a hidden step, jump to that step.
      bookForm.addEventListener('invalid', function (ev) {
        var s = ev.target.closest && ev.target.closest('.fstep');
        if (s && steps.indexOf(s) !== curStep) setStep(steps.indexOf(s), false);
      }, true);
      setStep(0, false);

      // Tier preselect: ?tier=worship|full|national|custom in the URL, or any
      // on-page element carrying data-tier (the tier cards' CTAs).
      var tierSel = bookForm.querySelector('select[name="tier"]');
      var TIER_PREFIX = { worship: 'Worship Set', full: 'Full Experience', national: 'National', custom: 'Custom' };
      var applyTier = function (key) {
        if (!tierSel || !key || !TIER_PREFIX[key]) return;
        for (var oi = 0; oi < tierSel.options.length; oi++) {
          if (tierSel.options[oi].text.indexOf(TIER_PREFIX[key]) === 0) { tierSel.selectedIndex = oi; break; }
        }
      };
      try { applyTier(new URLSearchParams(window.location.search).get('tier')); } catch (err) {}
      document.querySelectorAll('[data-tier]').forEach(function (el) {
        el.addEventListener('click', function () { applyTier(el.getAttribute('data-tier')); });
      });

      // We book 60+ days out; the date pickers should not offer sooner.
      var minDate = function (days) {
        var d = new Date(); d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      };
      var evDate = bookForm.querySelector('input[name="event_date"]');
      var bkDate = bookForm.querySelector('input[name="backup_date"]');
      if (evDate) evDate.min = minDate(60);
      if (bkDate) bkDate.min = minDate(60);
    }

    // MOBILE STICKY CTA BAR (injected once, mobile-only via CSS).
    // On the booking page the bar becomes a single Start Inquiry action —
    // linking a visitor to the page they are already on helps nobody.
    if (!document.querySelector('.sticky-cta')) {
      var bar = document.createElement('nav');
      bar.className = 'sticky-cta';
      bar.setAttribute('aria-label', 'Quick actions');
      var onBooking = /^booking/.test(window.location.pathname.split('/').pop() || '');
      bar.innerHTML = onBooking
        ? '<a class="s-book" href="#inquire" data-track="book_ablaze_click" aria-label="Start a booking inquiry">Start Inquiry</a>'
        : '<a class="s-listen" href="music.html" data-track="listen_now_click" aria-label="Listen to Ablaze"><svg aria-hidden="true"><use href="assets/icons/icons.svg#play"></use></svg>Listen</a>' +
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

    // ------------------------------------------------------------------
    // MUSIC CAROUSEL
    // Turn each .music-grid into a single-row, arrow-scrollable shelf so
    // releases never wrap to an awkward second row. Progressive: without
    // JS the CSS flex row still scrolls (trackpad / touch swipe).
    // ------------------------------------------------------------------
    document.querySelectorAll('.music-grid').forEach(function (grid) {
      if (grid.closest('.carousel')) return;
      var wrap = document.createElement('div');
      wrap.className = 'carousel';
      grid.parentNode.insertBefore(wrap, grid);
      wrap.appendChild(grid);

      function makeArrow(dir, label, glyph) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'carousel-arrow ' + dir;
        b.setAttribute('aria-label', label);
        b.innerHTML = glyph;
        wrap.appendChild(b);
        return b;
      }
      var prev = makeArrow('prev', 'Previous releases', '‹');
      var next = makeArrow('next', 'More releases', '›');

      function stepBy() {
        var card = grid.querySelector('.album');
        var gap = parseInt(getComputedStyle(grid).columnGap, 10) || 24;
        return card ? card.getBoundingClientRect().width + gap : grid.clientWidth * 0.8;
      }
      function nudge(d) {
        grid.scrollBy({ left: d * stepBy(), behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      prev.addEventListener('click', function () { nudge(-1); });
      next.addEventListener('click', function () { nudge(1); });

      function update() {
        var max = grid.scrollWidth - grid.clientWidth;
        var overflow = max > 4;
        prev.classList.toggle('is-hidden', !overflow || grid.scrollLeft <= 2);
        next.classList.toggle('is-hidden', !overflow || grid.scrollLeft >= max - 2);
      }
      grid.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      grid.querySelectorAll('img').forEach(function (img) {
        if (!img.complete) img.addEventListener('load', update, { once: true });
      });
      update();
    });

    // ------------------------------------------------------------------
    // PRESS GALLERY — paginated 2x3 "turn" carousel + lightbox
    // Each .gallery-page is one slide (2 rows x 3 cols). Arrows/dots/swipe
    // turn between pages. Clicking a .gallery-cell opens a full-size
    // lightbox with prev/next, keyboard nav, and a download button.
    // Scoped to .gallery so other pages are untouched.
    // ------------------------------------------------------------------
    document.querySelectorAll('.gallery').forEach(function (gallery) {
      var track = gallery.querySelector('.gallery-track');
      var pages = Array.prototype.slice.call(gallery.querySelectorAll('.gallery-page'));
      var prev = gallery.querySelector('.gallery-arrow.prev');
      var next = gallery.querySelector('.gallery-arrow.next');
      var dotsWrap = gallery.querySelector('.gallery-dots');
      if (!track || !pages.length) return;
      var idx = 0;

      var dots = [];
      if (dotsWrap) {
        pages.forEach(function (_, i) {
          var d = document.createElement('button');
          d.type = 'button';
          d.className = 'gallery-dot' + (i === 0 ? ' active' : '');
          d.setAttribute('aria-label', 'Go to photo set ' + (i + 1));
          d.addEventListener('click', function () { go(i); });
          dotsWrap.appendChild(d);
          dots.push(d);
        });
      }

      function go(i) {
        idx = Math.max(0, Math.min(pages.length - 1, i));
        track.style.transform = 'translateX(' + (-idx * 100) + '%)';
        dots.forEach(function (d, di) { d.classList.toggle('active', di === idx); });
        if (prev) prev.disabled = idx === 0;
        if (next) next.disabled = idx === pages.length - 1;
      }
      if (prev) prev.addEventListener('click', function () { go(idx - 1); });
      if (next) next.addEventListener('click', function () { go(idx + 1); });

      if (pages.length < 2) {
        if (prev) prev.style.display = 'none';
        if (next) next.style.display = 'none';
        if (dotsWrap) dotsWrap.style.display = 'none';
      }

      // swipe (touch)
      var x0 = null;
      track.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
        x0 = null;
      }, { passive: true });

      go(0);

      // ---- LIGHTBOX ----
      var cells = Array.prototype.slice.call(gallery.querySelectorAll('.gallery-cell'));
      var lb = document.getElementById(gallery.getAttribute('data-lightbox') || 'lightbox');
      if (!lb || !cells.length) return;
      var lbImg = lb.querySelector('.lb-img');
      var lbCap = lb.querySelector('.lb-cap');
      var lbDl = lb.querySelector('.lb-download');
      var lbPrev = lb.querySelector('.lb-prev');
      var lbNext = lb.querySelector('.lb-next');
      var lbClose = lb.querySelector('.lb-close');
      var cur = 0, opener = null;

      function fileName(src) {
        try { return src.split('/').pop().split('?')[0] || 'ablaze-photo.jpg'; } catch (e) { return 'ablaze-photo.jpg'; }
      }
      function show(i) {
        cur = (i + cells.length) % cells.length;
        var cell = cells[cur];
        var full = cell.getAttribute('data-full') || cell.querySelector('img').getAttribute('src');
        var cap = cell.getAttribute('data-caption') || '';
        if (lbImg) { lbImg.setAttribute('src', full); lbImg.setAttribute('alt', cap); }
        if (lbCap) lbCap.textContent = cap;
        if (lbDl) { lbDl.setAttribute('href', full); lbDl.setAttribute('download', fileName(full)); }
      }
      function open(i) {
        opener = cells[(i + cells.length) % cells.length];
        show(i);
        lb.classList.add('open');
        lb.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        if (lbClose) lbClose.focus();
      }
      function close() {
        lb.classList.remove('open');
        lb.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (opener) opener.focus();
      }
      cells.forEach(function (cell, i) {
        cell.addEventListener('click', function () { open(i); });
      });
      if (lbPrev) lbPrev.addEventListener('click', function () { show(cur - 1); });
      if (lbNext) lbNext.addEventListener('click', function () { show(cur + 1); });
      if (lbClose) lbClose.addEventListener('click', close);
      lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
      document.addEventListener('keydown', function (e) {
        if (!lb.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(cur - 1);
        else if (e.key === 'ArrowRight') show(cur + 1);
      });
    });
  });
})();
