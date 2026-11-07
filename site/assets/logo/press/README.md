# Press / "Featured On & Covered By" logos

The Press page logo wall (`press.html` → *Featured On & Covered By*) renders white
logos on a dark background. No full-color logo is shown in the UI.

## Status

**Official white SVGs in use (6):**
| Outlet | File | Class |
|--------|------|-------|
| FOX Nation | `fox-nation-white.svg` | `mark` (square) |
| WBRZ Channel 2 | `wbrz-white.svg` | `word` (wide) |
| Rolling Out | `rolling-out-white.svg` | `word` (wide) |
| Because Of Them We Can | `because-of-them-we-can-white.svg` | `mark` (square) |
| WJZ / CBS Baltimore | `cbs-baltimore-white.svg` | `word` (wide) |
| Louisiana First News | `louisiana-first-news-white.svg` | `word` (wide) |

`cbs-baltimore-white.svg` is CBS's own knockout lockup (`Full_Lockup_KO`, pulled from
`cbsnews.com/assets/show/baltimore/logo-wide-transparent-500.svg`). Only two things
changed: the `<style>`/`.st0` rule was dropped in favour of an inline `fill="#ffffff"`
on the single compound path, and the root `<svg>` got the `role`/`aria-label` attrs
this folder uses. Path data is untouched, so the knockouts render exactly as CBS ships
them. It is a wide two-line lockup, so it sits at 147x32 rendered, a little wider than
the other `word` logos.

`.press-logo-image.mark` = 56px tall (square logos); `.press-logo-image.word` =
32px tall (wide wordmark logos). Tuned for consistent visual weight.

`louisiana-first-news-white.svg` is **traced, not official**. No vector was available,
so it was produced from the wide brand lockup PNG (`louisiana-first-news-wide-source.png`,
288x94 of usable artwork) as follows: build a "blueness" coverage mask that keeps the
source antialiasing, upscale 6x with Lanczos, then `potrace -i -s -k 0.5 -a 1.0 -O 0.2
-t 10 --flat`, and finally rewrite potrace's header into a clean `0 0 288 94` viewBox by
composing a 1/6 scale onto its transform. Because the mask keys on the blue only, the
white "LOUISIANA FIRST" type falls out as a knockout, which is the correct reversal.
Replace it if an official white vector ever turns up.

**White wordmark fallback (1 — still needs an official white SVG):**
| Outlet | Target file |
|--------|-------------|
| Unfiltered with Kiran | `unfiltered-with-kiran-white.svg` |

The wall is 3-up above 900px, so it reads cleanest at 6 or 9 cards. It currently sits
at 7, leaving one card alone on the last row.

To swap a wordmark for an official logo: save the white SVG here with the target
name, then in `press.html` replace that outlet's `<span class="press-logo-wordmark …">`
with `<img class="press-logo-image word" src="assets/logo/press/<name>" alt="<Outlet> logo">`
(use `mark` instead of `word` if the logo is square-ish).

## Source assets (reference only — NOT shown in the UI)
`*-source.png` / `*-source.jpg` / `*-source.svg` are the original full-color marks pulled
from each outlet, kept only as reference for producing approved white versions. Confirm
usage rights before shipping any official logo.

Louisiana First News has two, because the outlet uses two different lockups:
`louisiana-first-news-source.png` is the square "LA FIRST" social avatar, and
`louisiana-first-news-wide-source.png` is the wide horizontal lockup the white SVG
was traced from.
