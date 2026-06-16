# Hero background video

The homepage hero (`index.html`) plays a muted, looping performance clip behind
the headline. Until the files below exist, the poster still
(`assets/photos/hero-sing.jpg`) shows instead — so the hero is never broken.

## Drop in these files

| Path | Required | Notes |
|------|----------|-------|
| `assets/video/hero-loop.mp4`  | ✅ yes | H.264 / yuv420p — universal support |
| `assets/video/hero-loop.webm` | optional | VP9 — smaller; modern browsers prefer it |

Filenames must match exactly (the `<video>` tag references them).

## Footage specs

- **Orientation:** landscape 16:9. Frame so the *action sits center/right* —
  the headline and buttons cover the left third.
- **Resolution:** 1920×1080 is plenty; 1280×720 is fine and lighter.
- **Length:** 8–15s, chosen to loop seamlessly (start and end on a similar frame).
- **Frame rate:** 24–30 fps.
- **Audio:** none — strip it. The video is muted and audio just adds weight.
- **File size:** target **≤ 6 MB** (3–5 MB ideal). It's an ambient background,
  not a feature film — compress hard.
- **No baked-in text/captions/logos** — the headline already sits on top.
- **Content:** stage, raised hands, crowd, worship motion. Avoid fast cuts;
  one continuous slow-moving shot reads the most premium.

## Make web-ready files with ffmpeg

From your source export (e.g. `source.mov`). Use `-ss` (start) and `-t`
(duration) to trim to your loop section.

```bash
# MP4 (required) — trims 12s starting at 00:05, strips audio, web-optimized
ffmpeg -ss 00:00:05 -t 12 -i source.mov -an \
  -vf "scale=1920:-2,fps=30" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 24 \
  -movflags +faststart assets/video/hero-loop.mp4

# WebM (optional, smaller) — same trim
ffmpeg -ss 00:00:05 -t 12 -i source.mov -an \
  -vf "scale=1920:-2,fps=30" \
  -c:v libvpx-vp9 -b:v 0 -crf 33 assets/video/hero-loop.webm
```

Raise `-crf` (e.g. 26–28 for H.264, 35–38 for VP9) if the file is still over
~6 MB. Check the result: `ls -lh assets/video/`.

## How it's wired

- Markup: `<video class="hero-video" autoplay muted loop playsinline …>` in
  `index.html`.
- Styling/grade + slow zoom: `.hero-video` in `styles.css`.
- Reduced-motion and Data Saver users get the static poster (no playback) —
  handled in `scripts.js`.
