# Ablaze Youth Choir — Website

Multi-page site, 12 linked pages, real assets wired in.

## File structure
```
Ablaze Web/                       ← project root
├── site/                         ← THE WEBSITE (this folder)
│   ├── index.html                ← home
│   ├── about.html
│   ├── music.html                ← real album covers, real streaming links
│   ├── watch.html                ← real photos as video tiles
│   ├── booking.html              ← deepest page, full inquiry form
│   ├── marky.html                ← Mark Ellis Jr.'s photo + bio
│   ├── scholarship.html
│   ├── scholarship-apply.html
│   ├── sponsor.html
│   ├── society.html
│   ├── press.html                ← downloadable logo + press photos
│   ├── contact.html
│   ├── styles.css                ← shared stylesheet (with @font-face for AblazeFont)
│   ├── scripts.js                ← shared JS
│   └── assets/                   ← site-specific assets
│       ├── logo/                 ← white + black SVG logos
│       ├── font/                 ← AblazeFont.otf
│       ├── icons/                ← fire, apple, tiktok SVGs
│       └── photos/               ← Mark photos, OG images
├── hero/                         ← (parent folder, referenced via ../hero/)
├── discography/                  ← (parent folder, referenced via ../discography/)
├── General Photos/               ← (parent folder, referenced via ../General Photos/)
└── ...
```

## What's wired up
- ✅ Real white SVG logo in nav + footer (every page)
- ✅ Real Mark Ellis Jr. photos on Ablaze Reach + Press Kit
- ✅ Real album covers (I Got It, All Yours, Work It Out, Can't Tell It All, etc.)
- ✅ Real Spotify, Apple Music, YouTube links throughout
- ✅ Real TikTok, Instagram links throughout
- ✅ Real photos in About + Watch + Press galleries (pulled from /General Photos/)
- ✅ Hero card images on homepage (using /hero/ folder)
- ✅ AblazeFont loaded via @font-face (use class `ablaze-font` to apply)
- ✅ UCFM parent ministry linked everywhere (https://ucfministries.org)
- ✅ Favicon set to fire.svg
- ✅ Open Graph + Twitter cards configured per page

## What still needs swap
Three things only:
1. **Form endpoints** — every form has `action="#"` placeholder. Wire to Formspree, HubSpot, or Netlify Forms.
2. **Email addresses** — using placeholders like `booking@ablazeyc.com`. Update in `contact.html`.
3. **Booking prices** — currently "starting at $3,500 / $7,500 / $15,000". Update in `booking.html` + `index.html`.

## Hosting
This is plain HTML — host anywhere. **Easiest path:**
1. Drag the entire `Ablaze Web/` folder onto [Netlify Drop](https://app.netlify.com/drop)
2. Set the publish directory to `site/`
3. Add `netlify` attribute to each form for free form handling

For custom domain (ablazeyc.com), point DNS to the Netlify site.

## Brand colors (in `styles.css`)
```css
--fire-1: #ff3d00    (deep orange)
--fire-2: #ff7a18    (orange)
--fire-3: #ffb400    (gold/amber)
--crimson: #a8160b   (deep red)
```
Adjust those four — the entire site re-themes.
