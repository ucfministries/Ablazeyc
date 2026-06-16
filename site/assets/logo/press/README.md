# Press / "Featured On & Covered By" logos

The Press page logo wall (`press.html` → *Featured On & Covered By*) currently
renders each outlet as a **white typographic wordmark** (using the site's own
fonts) so every mark is guaranteed pure white and visually consistent. No
full-color logo is shown in the UI.

## Why wordmarks (for now)
The original brand assets are full-color rasters (PNG/JPG/app-icons). There is no
clean, automated way to recolor them to white on this machine (no ImageMagick /
rsvg), and a CSS `invert` on color/JPEG sources looks muddy. Per the brand brief,
the approved fallback is a premium white wordmark — done here — with the official
white SVGs to be dropped in later.

## Source assets in this folder (reference only — NOT shown in the UI)
| File | Source URL |
|------|------------|
| `fox-nation-source.png` | https://static-media.fox.com/foxnow/web/v3-2/img/network/fox-nation.png |
| `wbrz-source.png` | https://www.wbrz.com/images/logo.png |
| `louisiana-first-news-source.png` | Google Play listing icon |
| `because-of-them-we-can-source.jpg` | https://www.becauseofthemwecan.com/wp-content/uploads/2023/06/logo.jpg |
| `unfiltered-with-kiran-source.png` | Google Play listing icon |
| Rolling Out | clearbit `logo.clearbit.com/rollingout.com` — download failed; brand assets: https://brandfetch.com/rollingout.com |

> These are **unverified third-party marks** kept only as a reference for
> producing approved white versions. Do not publish them as-is, and confirm usage
> rights before shipping any official logo.

## TODO — replace wordmarks with official white SVGs
When approved white SVGs exist, save them here with these exact names and swap the
matching `<span class="press-logo-wordmark …">` in `press.html` for
`<img class="press-logo-image" src="assets/logo/press/<name>" alt="<Outlet> logo">`:

- `fox-nation-white.svg`
- `wbrz-white.svg`
- `louisiana-first-news-white.svg`
- `rolling-out-white.svg`
- `because-of-them-we-can-white.svg`
- `unfiltered-with-kiran-white.svg`

Keep marks a consistent height (~34px) and white (`#fff`); the card hover glow is
handled by `.press-logo-card`.
