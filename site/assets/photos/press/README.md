# Press gallery photos

Web-optimized choir / performance photos for the **Press → Visuals** gallery
(`press.html`). Each is a real, browser-viewable URL, e.g.
`https://ablazeyc.com/assets/photos/press/choir-red-group.jpg`.

## In use now (added 2026-06-17)
Camera originals were 28–30 MB; these are resampled to 2200px / ~600 KB for web.
Full-res originals are preserved outside the deploy folder in
`Ablaze Web/press-photo-originals/`.

| filename                   | photo                                          |
|----------------------------|------------------------------------------------|
| `choir-red-group.jpg`      | Full ensemble, red & black, white backdrop     |
| `choir-fire-stage.jpg`     | Choir performing live, orange ties / fire screen |
| `choir-red-ensemble.jpg`   | Smaller ensemble, red & black, cream backdrop  |

(The blue-stage shot is already represented on page 1 by `hero-canttellitall.jpg`.)

## Adding more
Save as **.jpg / .png / .webp** (NOT .heic). If a file is over ~1.5 MB, resample:
`sips -Z 2200 -s format jpeg -s formatOptions 78 in.jpg --out out.jpg`
Then add one `.gallery-cell` per photo in `press.html` (copy an existing cell:
`data-full` + `data-caption` + `<img>`). Six cells per `.gallery-page`.
