# Press / "Featured On & Covered By" logos

The Press page logo wall (`press.html` → *Featured On & Covered By*) renders white
logos on a dark background. No full-color logo is shown in the UI.

## Status

**Official white SVGs in use (4):**
| Outlet | File | Class |
|--------|------|-------|
| FOX Nation | `fox-nation-white.svg` | `mark` (square) |
| WBRZ Channel 2 | `wbrz-white.svg` | `word` (wide) |
| Rolling Out | `rolling-out-white.svg` | `word` (wide) |
| Because Of Them We Can | `because-of-them-we-can-white.svg` | `mark` (square) |

`.press-logo-image.mark` = 56px tall (square logos); `.press-logo-image.word` =
32px tall (wide wordmark logos). Tuned for consistent visual weight.

**White wordmark fallback (2 — still need official white SVGs):**
| Outlet | Target file |
|--------|-------------|
| Louisiana First News | `louisiana-first-news-white.svg` |
| Unfiltered with Kiran | `unfiltered-with-kiran-white.svg` |

To swap a wordmark for an official logo: save the white SVG here with the target
name, then in `press.html` replace that outlet's `<span class="press-logo-wordmark …">`
with `<img class="press-logo-image word" src="assets/logo/press/<name>" alt="<Outlet> logo">`
(use `mark` instead of `word` if the logo is square-ish).

## Source assets (reference only — NOT shown in the UI)
`*-source.png` / `*-source.jpg` are the original full-color marks pulled from each
outlet, kept only as reference for producing approved white versions. Confirm usage
rights before shipping any official logo.
