# Deploy Guide — ablazeyc.com

Step-by-step deployment to Netlify, plus form setup for booking, scholarship, sponsor, press, contact, and the Ablaze Society newsletter.

---

## 1. Deploy to Netlify (5 minutes)

### Easiest path — drag and drop

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the **entire `Ablaze Web/` folder** onto the page (not just `site/` — the parent folder)
3. Netlify reads `netlify.toml` and automatically uses `site/` as the publish directory
4. You'll get a live URL in seconds (something like `nimble-fire-xxx.netlify.app`)

### For ongoing updates — connect Git

If you want every code change to auto-deploy:

1. Push the `Ablaze Web/` folder to a GitHub repo
2. In Netlify dashboard → "Add new site" → "Import from Git"
3. Connect the repo. Netlify reads `netlify.toml` automatically.
4. Every git push triggers a new deploy.

---

## 2. Custom domain — ablazeyc.com

1. In Netlify dashboard → Site settings → Domain management → Add custom domain
2. Enter `ablazeyc.com`
3. Update DNS at your domain registrar (GoDaddy/Namecheap/etc):
   - Either point nameservers to Netlify's nameservers (easiest)
   - Or add A/CNAME records as Netlify shows you
4. Netlify auto-provisions free HTTPS via Let's Encrypt

---

## 3. Forms — Netlify Forms (already wired)

The booking, scholarship, sponsor, press, and contact forms are already wired up. As soon as you deploy, Netlify will detect them and start capturing submissions.

### Set up email notifications

1. Netlify dashboard → Forms → click any form
2. Settings & usage → Form notifications → Add notification
3. Choose "Email notification"
4. Enter the email address that should receive submissions:
   - Booking form → `booking@ablazeyc.com`
   - Scholarship form → `scholarship@ablazeyc.com`
   - Sponsor form → `partner@ablazeyc.com`
   - Press form → `press@ablazeyc.com`
   - Contact form → `hello@ablazeyc.com`
5. Save. Submissions now land in your inbox.

### Where to view submissions

Netlify dashboard → Forms → click any form. You'll see all submissions, can export CSV, mark as spam, etc.

### Free tier limits

- **100 submissions/month** across all forms combined
- Plenty for ~3 forms/day average
- Upgrade to $19/month if you exceed it

---

## 4. Ablaze Society newsletter — Klaviyo (separate from Netlify)

The Society email signup is **not** wired to Netlify yet — it should go to Klaviyo so you can build automated drip campaigns and segment fans.

### Setup steps

1. Create free account at [klaviyo.com](https://www.klaviyo.com) (250 contacts free)
2. Klaviyo → Audience → Lists & Segments → Create List → name it "Ablaze Society"
3. Klaviyo → Sign-up Forms → Embed Form → select the Society list
4. Copy the embedded form code (it's an HTML snippet)
5. Replace the existing Society form in these files:
   - `site/index.html` (search for `Join the<br>Fan Family`)
   - `site/society.html` (search for `Join Free`)
   - `site/links.html` (search for `Join The Society`)

For each, swap the `<form>` block for the Klaviyo embed, keep the surrounding wrapper styling intact.

### What you can do with Klaviyo

- Welcome email when someone joins
- Pre-save campaign for upcoming releases
- Segment by location (find Baton Rouge fans for local shows)
- Automated re-engagement for inactive subscribers
- Send drops + behind-the-scenes content

---

## 5. Email aliases — recommended setup

The forms route to placeholder addresses. Set these up at your domain provider (Google Workspace, iCloud+ Custom Domain, or simple aliases):

```
hello@ablazeyc.com         → forwards to your main inbox
booking@ablazeyc.com       → forwards to booking team / main inbox
press@ablazeyc.com         → forwards to PR / main inbox
partner@ablazeyc.com       → forwards to sponsorship / main inbox
scholarship@ablazeyc.com   → forwards to scholarship committee / main inbox
```

**Easiest setup**: Google Workspace ($6/user/month) — gives you a Gmail-style inbox at `hello@ablazeyc.com` plus unlimited free aliases for the others.

**Cheapest setup**: Most domain registrars include free email forwarding. All five aliases can forward to the same Gmail account.

---

## 6. Pretty URLs (already configured)

The `netlify.toml` config enables clean URLs with no `.html` extensions:

| Pretty URL | Goes to |
|---|---|
| `ablazeyc.com/booking` | booking.html |
| `ablazeyc.com/links` | links.html |
| `ablazeyc.com/l` | links.html (short bio link) |
| `ablazeyc.com/bio` | links.html |
| `ablazeyc.com/book` | booking.html |
| `ablazeyc.com/apply` | scholarship-apply.html |

Use `ablazeyc.com/l` in social bios — shortest possible link.

---

## 7. Final pre-launch checklist

- [ ] Update booking prices in `booking.html` and `index.html` (currently "starting at $3,500 / $7,500 / $15,000")
- [ ] Confirm email aliases are working (send a test to each)
- [ ] Set up Netlify form notifications for all 5 forms
- [ ] Embed Klaviyo form for Society newsletter (3 places)
- [ ] Connect custom domain (ablazeyc.com)
- [ ] Test booking form submission end-to-end
- [ ] Add Google Analytics or Plausible (optional but recommended)
- [ ] Submit sitemap to Google Search Console for SEO
