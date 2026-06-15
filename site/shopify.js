/* ============================================================
   ABLAZE × SHOPIFY — STOREFRONT CLIENT + RENDERER
   ------------------------------------------------------------
   Renders premium product cards into any element marked with
   [data-ablaze-merch]. Live products via the Storefront API when
   a PUBLIC token is configured (see shopify-config.js); otherwise
   a curated fallback grid that links to the Shopify store.

   States handled: loading (skeletons) → success | empty | error.
   On error or no token, it never blanks the page — it shows the
   fallback products and a "View All Merch" path.

   Usage in HTML:
     <div class="merch-grid" data-ablaze-merch data-limit="3"></div>
   Or programmatically:
     AblazeShopify.render('#shopGrid', { limit: 12 });
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.ABLAZE_SHOPIFY || {};
  var STORE_URL = CFG.storeUrl || 'https://merch.discovertheu.com/collections/all';

  function productUrl(handle) {
    return 'https://' + (CFG.storeDomain || 'merch.discovertheu.com') + '/products/' + handle;
  }

  function formatPrice(amount, currency) {
    var n = parseFloat(amount);
    if (isNaN(n)) return '';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: currency || 'USD',
        minimumFractionDigits: n % 1 === 0 ? 0 : 2
      }).format(n);
    } catch (e) {
      return '$' + (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Build one product card (an anchor to the Shopify product page).
  function cardHTML(p) {
    var url = p.url || productUrl(p.handle);
    var priceText = p.priceText || (p.price ? formatPrice(p.price, p.currency) : '');
    var compare = p.compareAt && parseFloat(p.compareAt) > parseFloat(p.price)
      ? '<span class="compare">' + esc(formatPrice(p.compareAt, p.currency)) + '</span>' : '';
    var soldOut = p.available === false;
    var tag = soldOut ? '<span class="tag sold">Sold Out</span>'
      : (p.tag ? '<span class="tag">' + esc(p.tag) + '</span>' : '');
    var img = p.image
      ? '<div class="ph-wrap"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + ' — Ablaze merch" loading="lazy" decoding="async" ' +
        'onerror="this.parentNode.innerHTML=&quot;<div class=\\&quot;ph-fallback\\&quot;>' + esc(p.title) + '</div>&quot;"></div>'
      : '<div class="ph-wrap"><div class="ph-fallback">' + esc(p.title) + '</div></div>';

    return '<a class="product" href="' + esc(url) + '" target="_blank" rel="noopener" ' +
      'data-track="product_click" data-product="' + esc(p.title) + '">' +
      img +
      '<div class="info">' +
        '<div class="tag-row">' + tag + '</div>' +
        '<h3>' + esc(p.title) + '</h3>' +
        (priceText ? '<div class="price">' + esc(priceText) + compare + '</div>' : '') +
        (p.meta ? '<div class="meta">' + esc(p.meta) + '</div>' : '') +
        '<span class="shop-cta">' + (soldOut ? 'View' : 'Shop Now') + ' <span class="arrow">↗</span></span>' +
      '</div>' +
    '</a>';
  }

  function skeletonHTML() {
    return '<div class="product skeleton" aria-hidden="true">' +
      '<div class="ph-wrap"></div>' +
      '<div class="info"><div class="sk-line w40"></div><div class="sk-line w60"></div><div class="sk-line w40"></div></div>' +
    '</div>';
  }

  function renderCards(el, products, limit) {
    var list = limit ? products.slice(0, limit) : products;
    if (!list.length) {
      el.innerHTML = '<div class="merch-note"><h3>Drop incoming</h3>' +
        '<p>New Ablaze merch is on the way. Tap below to see what\'s live right now.</p>' +
        '<a class="btn btn-fire" href="' + esc(STORE_URL) + '" target="_blank" rel="noopener" data-track="shop_merch_click">Visit The Store <span class="arrow">↗</span></a></div>';
      return;
    }
    el.innerHTML = list.map(cardHTML).join('');
  }

  function renderFallback(el, limit) {
    renderCards(el, (CFG.fallbackProducts || []).map(function (p) {
      return { title: p.title, handle: p.handle, price: p.price, image: p.image, tag: p.tag, meta: p.meta };
    }), limit);
  }

  // GraphQL fetch against the Storefront API.
  function fetchProducts(max) {
    var endpoint = 'https://' + CFG.storeDomain + '/api/' + (CFG.apiVersion || '2024-10') + '/graphql.json';
    var query = '{ products(first: ' + max + ', sortKey: BEST_SELLING) { edges { node { ' +
      'title handle availableForSale ' +
      'featuredImage { url altText } ' +
      'priceRange { minVariantPrice { amount currencyCode } } ' +
      'compareAtPriceRange { minVariantPrice { amount } } } } } }';
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Shopify-Storefront-Access-Token': CFG.storefrontToken
      },
      body: JSON.stringify({ query: query })
    }).then(function (r) {
      if (!r.ok) throw new Error('Storefront API ' + r.status);
      return r.json();
    }).then(function (json) {
      if (json.errors) throw new Error('Storefront API returned errors');
      var edges = (((json.data || {}).products || {}).edges) || [];
      return edges.map(function (e) {
        var n = e.node;
        var min = (n.priceRange && n.priceRange.minVariantPrice) || {};
        var cmp = (n.compareAtPriceRange && n.compareAtPriceRange.minVariantPrice) || {};
        return {
          title: n.title,
          handle: n.handle,
          url: productUrl(n.handle),
          available: n.availableForSale,
          image: n.featuredImage ? n.featuredImage.url : '',
          price: min.amount,
          currency: min.currencyCode || 'USD',
          compareAt: cmp.amount
        };
      });
    });
  }

  function render(target, opts) {
    opts = opts || {};
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    var limit = opts.limit || parseInt(el.getAttribute('data-limit'), 10) || 0;
    var max = Math.min(CFG.maxProducts || 12, limit || CFG.maxProducts || 12);

    // No token → straight to fallback, no spinner flash.
    if (!CFG.storefrontToken) { renderFallback(el, limit); return; }

    // Loading state
    var skn = limit || 3;
    var sk = ''; for (var i = 0; i < skn; i++) sk += skeletonHTML();
    el.innerHTML = sk;

    fetchProducts(max)
      .then(function (products) { renderCards(el, products, limit); })
      .catch(function (err) {
        if (window.console) console.warn('[ablaze:shopify] live fetch failed, using fallback —', err && err.message);
        renderFallback(el, limit);
      });
  }

  window.AblazeShopify = { render: render, productUrl: productUrl, storeUrl: STORE_URL };

  // Auto-init every [data-ablaze-merch] grid on the page.
  function init() {
    var grids = document.querySelectorAll('[data-ablaze-merch]');
    grids.forEach(function (g) { render(g, {}); });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
