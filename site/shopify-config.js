/* ============================================================
   ABLAZE × SHOPIFY — STOREFRONT CONFIG
   ------------------------------------------------------------
   The store is a Shopify collection:
   https://merch.discovertheu.com/collections/all

   HOW PRODUCTS RENDER
   -------------------
   • If `storefrontToken` is set, /merch and the homepage pull
     LIVE products via the Shopify Storefront API (client-side).
   • If it is blank, the page shows the curated `fallbackProducts`
     below and links straight to the Shopify store. Nothing breaks
     either way.

   ABOUT THE TOKEN  (read this before pasting anything)
   ----------------
   • Use a **Storefront API access token** ONLY. This is a PUBLIC,
     publishable token — it is designed to be exposed in browser
     code (exactly like a Stripe publishable key). It can only READ
     published products and create carts. It cannot touch orders,
     customers, or inventory.
   • NEVER paste an **Admin API** key / password / access token here
     or anywhere in client code. If a credential starts with `shpat_`
     or `shppa_`, it is an Admin token — do not use it.

   WHERE TO GET A STOREFRONT TOKEN
   -------------------
   Shopify admin → Settings → Apps and sales channels →
   Develop apps → Create an app → Configure Storefront API scopes
   (enable `unauthenticated_read_product_listings`) →
   Install → copy the "Storefront API access token".

   THREE WAYS TO SET IT
   -------------------
   1) Paste it into `storefrontToken` below (simplest, safe — it's public).
   2) Define `window.ABLAZE_SHOPIFY_TOKEN = '...'` before this file
      loads (e.g. Netlify Snippet Injection that reads a deploy env
      var named SHOPIFY_STOREFRONT_ACCESS_TOKEN). See .env.example.
   3) Leave blank to use the fallback grid + store links.
   ============================================================ */
(function () {
  var STORE_DOMAIN = 'merch.discovertheu.com';        // SHOPIFY_STORE_DOMAIN
  var STORE_URL = 'https://' + STORE_DOMAIN + '/collections/all';

  window.ABLAZE_SHOPIFY = Object.assign({
    storeDomain: STORE_DOMAIN,
    // PUBLIC Storefront token only. Blank = fallback mode. (option 2 above can inject it)
    storefrontToken: (window.ABLAZE_SHOPIFY_TOKEN || ''),
    apiVersion: '2024-10',
    storeUrl: STORE_URL,
    maxProducts: 12,

    // Curated fallback — the live products as of launch. Used when no
    // token is set, or if the API call fails. Keep prices in sync, or
    // set a token and these become irrelevant.
    fallbackProducts: [
      {
        title: 'ABLAZE No Weapon Tee',
        handle: 'no-weapon-tee',
        price: '26.00',
        image: 'https://cdn.shopify.com/s/files/1/0757/7790/0792/files/mockup-12976-1-67C88B6D-5-1200x1200.png?v=1780000351',
        tag: 'Bestseller',
        meta: '7 colorways · S–2XL · soft cotton'
      },
      {
        title: 'Premium Ablaze Debut Album Tee',
        handle: 'premium-ablaze-debut-album-tee',
        price: '35.00',
        image: 'https://cdn.shopify.com/s/files/1/0757/7790/0792/files/mockup-3356-3-976A868D-17-1600x1600.png?v=1761435337',
        tag: 'Debut Album',
        meta: 'Premium tee · Black · XS–2XL',
        featured: true
      },
      {
        title: 'Ablaze Basic Tee',
        handle: 'ablaze-basic-tee',
        price: '35.00',
        image: 'https://cdn.shopify.com/s/files/1/0757/7790/0792/files/mockup-3358-1-BD6BD69B-7-1600x1600.png?v=1761435585',
        tag: 'Essential',
        meta: 'Everyday tee · Black · S–2XL'
      }
    ]
  }, window.ABLAZE_SHOPIFY || {});
})();
