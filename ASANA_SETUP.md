# Asana Intake Setup — Ablaze Website

When a visitor submits a website form, a Netlify Function
([`netlify/functions/submit-form.js`](netlify/functions/submit-form.js)) creates a task in the Asana
project **"Ablaze Website Intake & Booking Pipeline."** The Asana token lives only on the server.

```
Visitor → form → /.netlify/functions/submit-form → Asana task (+ checklist subtasks)
                         │
                         └─ if Asana fails: logged + optional webhook, visitor still sees success
                         └─ if function unreachable/unconfigured: native Netlify Forms capture (no loss)
```

---

> **Status (wired 2026-06-15):** The Asana object IDs in `submit-form.js` are filled in for the
> **"Ablaze Website Intake & Booking Pipeline 2026-27"** project (`1215734352659379`, Social Media Team):
> sections, Priority, Request Type, Source (= Website), Event Date, Event Location, Organization, and UTM
> Campaign — plus a new **Director Inquiry** type for the "Mark Ellis Jr. / Our Director" contact option.
> Still to do in the **Asana UI**: rename the **Budget Range** option labels to the booking-form tiers
> (Under $7,500 / $7,500–$15,000 / $15,000–$30,000 / $30,000+ — the gids are already wired, renaming
> keeps them); (optional) add a "Director Inquiry" option to the Request Type field and paste its gid
> into `REQUEST_TYPE_OPTION_IDS`; delete the near-duplicate Event Team pipeline project.

## 1. Environment variables (required)

Set this in **Netlify → Site settings → Environment variables** (production) or a local git‑ignored
`.env` for `netlify dev`. Never commit real values. See [`.env.example`](.env.example).

| Variable | What it is |
|---|---|
| `ASANA_ACCESS_TOKEN` | Asana Personal Access Token (secret) |
| `FALLBACK_WEBHOOK_URL` | *(optional)* Slack/Zapier/Make webhook alerted if Asana ever fails |

> **Workspace & project ids are in code, not env.** They live at the top of
> `netlify/functions/submit-form.js` next to the section ids they belong with — a matched set.
> (An `ASANA_PROJECT_ID` env var once pointed at the near-duplicate "…Booking Pipeline" Event Team
> project, which made every section-membership create fail with a 400 and silently routed all
> submissions to the fallback log.) Any `ASANA_WORKSPACE_ID` / `ASANA_PROJECT_ID` vars left in
> Netlify are ignored and can be deleted.

After deploy, the function lives at `https://ablazeyc.com/.netlify/functions/submit-form`.

---

## 2. How to find each Asana ID

**Personal Access Token** — Asana → profile photo → **My Settings → Apps → Personal access tokens →
Create new token**. Copy it once (it isn't shown again).

**Workspace ID** — open <https://app.asana.com/api/1.0/workspaces> while logged in, or:
```bash
curl -H "Authorization: Bearer $ASANA_ACCESS_TOKEN" https://app.asana.com/api/1.0/workspaces
```

**Project ID** — open the project in Asana and read the number in the URL:
`https://app.asana.com/0/<PROJECT_ID>/list`. Or list projects:
```bash
curl -H "Authorization: Bearer $ASANA_ACCESS_TOKEN" \
  "https://app.asana.com/api/1.0/workspaces/<WORKSPACE_ID>/projects?opt_fields=name"
```

**Section IDs** *(optional — one column per request type)* — set in the `SECTIONS` map at the top of
[`submit-form.js`](netlify/functions/submit-form.js). Find them with:
```bash
curl -H "Authorization: Bearer $ASANA_ACCESS_TOKEN" \
  "https://app.asana.com/api/1.0/projects/<PROJECT_ID>/sections?opt_fields=name"
```
Leave a section blank to let that request type land in the project's default section.

**Priority + custom field IDs** *(optional)* — set `PRIORITY_FIELD_ID` / `PRIORITY_OPTION_IDS` /
`CUSTOM_FIELDS` in `submit-form.js`. Find field and enum‑option GIDs with:
```bash
curl -H "Authorization: Bearer $ASANA_ACCESS_TOKEN" \
  "https://app.asana.com/api/1.0/projects/<PROJECT_ID>/custom_field_settings?opt_fields=custom_field.name,custom_field.enum_options.name"
```
Priority is **always** written into the task description, so this is purely for structured/sortable data.

> All the places to paste these IDs are marked with `►` comments at the top of `submit-form.js`.

---

## 3. Request types → forms

| Request type | Where it comes from | Priority |
|---|---|---|
| Booking Request | `booking.html` | High |
| Press / Media Inquiry | `press.html` | High |
| Sponsorship / Donor Inquiry | `sponsor.html` | High |
| Merch / Store Question | `contact.html` → Inquiry "Merch / Store Question" | Medium |
| General Contact | `contact.html` | Medium |
| Ablaze Society / Fan Signup | Society email signup (index / society / merch / links) | Low |
| Testimony / Story Submission | `contact.html` → Inquiry "Testimony / Story" | Medium |
| Director Inquiry | `contact.html` → Inquiry "Mark Ellis Jr. / Our Director" | Medium |

Booking tasks are titled `Booking Request: <Org> - <Event Date>`; all others
`<Request Type>: <Name or Organization>`. Each task gets its type's internal checklist as subtasks;
**Booking** gets the full 16‑step vetting checklist.

*(The scholarship application form is intentionally left on its existing Netlify‑only flow — it carries
minors' PII. To route it to Asana, add `scholarship` to `FORM_TO_TYPE` + a `REQUEST_TYPES` entry.)*

---

## 3b. "Wrong form" redirect + auto-reply

Four of the contact form's **Inquiry Type** options name a category that has its
own dedicated form. Those forms exist because each collects required fields the
contact form has no equivalent for — a booking with no date, venue or audience
size can't be answered, only chased. When someone picks one of these on the
contact form, two things happen **in addition to** the normal Asana card:

| Inquiry Type on `contact.html` | Visitor is sent to | Auto-reply links to |
|---|---|---|
| Booking | `next-step.html?to=booking` | `/booking#inquire` |
| Press / Media | `next-step.html?to=press` | `/press#media` |
| Sponsorship / Partnership | `next-step.html?to=sponsor` | `/sponsor#partner` |
| Scholarship | `next-step.html?to=scholarship` | `/scholarship-apply` |

The other five options (Merch, Testimony, Director, Fan Mail, Other) have no
dedicated form — the contact form **is** their intake — so they go to
`thank-you.html` exactly as before.

1. **On-page, immediately.** Instead of `thank-you.html` they land on
   `next-step.html`, which explains that their message was received and asks
   for two minutes on the real form. Works with no email provider configured.
2. **By email.** A templated auto-reply with the same nudge and a direct link,
   `Reply-To: worship@ucfministries.org`. **Requires channel 3 below** — with no
   `RESEND_API_KEY` / `SENDGRID_API_KEY` set, step 1 still works and this is
   silently skipped.

**The submission is never dropped.** The Asana card is created exactly as
normal, flagged at the top of its description with `⚠️ WRONG FORM` and the link
the visitor was given, so whoever works the card knows (a) a fuller submission
may arrive through the proper form and should be merged, and (b) the visitor has
already been asked once — a second "please use the booking form" reply is just
nagging.

**Where the config lives — two maps that must stay in sync:**
- `netlify/functions/submit-form.js` → `REDIRECT_FORMS` (email copy + links)
- `site/scripts.js` → `REDIRECTS` (which `next-step.html` variant to show)

Keys in both must match `contact.html`'s `<option>` text **exactly**. To add a
variant, add it to both maps *and* add a matching `<div data-variant="…">` block
in `site/next-step.html`.

The visitor auto-reply body is **fully templated — the submitter's own message is
never echoed back**. The recipient address is unverified visitor input, so
echoing arbitrary text to it would turn this endpoint into a way to send
someone else mail from our domain. Only the first name is interpolated, escaped.

---

## 4. Test a submission

**Locally:** `npm i -g netlify-cli` → put the vars in `.env` → `netlify dev` → open the local URL,
submit a form. Watch the function log in the terminal; check the Asana project for the new task.

**Production:** after setting the env vars and deploying, submit the booking form with a test event,
then confirm the task + checklist appear in the project. Or hit the endpoint directly:
```bash
curl -X POST https://ablazeyc.com/.netlify/functions/submit-form \
  -H "Content-Type: application/json" \
  -d '{"form_name":"booking","first_name":"Test","last_name":"User","email":"test@example.com","org":"Demo Church","event_date":"2026-09-01","city":"Baton Rouge","state":"LA","venue":"Main Hall","event_type":"Youth Night","tier":"Full Experience","audience":"250–750","budget":"$5,000–$10,000","vision":"Test booking","utm_source":"newsletter","utm_medium":"email"}'
```
Expected: `{"ok":true,"delivered":true,"taskUrl":"https://app.asana.com/..."}`.
- Honeypot: add `"bot-field":"x"` → `{"ok":true,"delivered":false,"spam":true}` and no task.
- Missing fields → `400` with a friendly `error`.
- Before env vars are set → `503 {fallback:true}` and the browser falls back to native Netlify Forms.

---

## 4b. Notifications — who hears about a new request

Every website request is announced over three independent channels. They overlap
on purpose: each one covers a failure the others cannot.

**Who gets what:**

| Form | markellis0404@ | worship@ucfministries.org | miracleucfm@ |
|------|:---:|:---:|:---:|
| booking | ✅ | ✅ | ✅ |
| contact | ✅ | ✅ | ✅ |
| press | ✅ | ✅ | ✅ |
| sponsor | ✅ | ✅ | ✅ |
| scholarship | — | — | ✅ |

`miracleucfm@gmail.com` (site owner) receives **all five** forms. The scholarship
form goes to the owner only — it contains minors' PII, so it is not fanned out to
the wider team, and it is not routed into Asana at all. Every hook is explicitly
scoped to one form id; there is no unscoped "any form" hook, because its scoping
semantics are ambiguous in the API and this pipeline has already lost requests to
silent behavior once.

| # | Channel | Configured where | Fires when | Needs a secret? |
|---|---------|------------------|-----------|-----------------|
| 1 | **Asana followers** | `NOTIFY_FOLLOWER_GIDS` in `submit-form.js` | A task is created — Asana emails its followers the card | No |
| 2 | **Netlify Forms notifications** | Netlify → Site settings → Forms → Notifications | A submission lands in Netlify Forms (the native fallback) | No |
| 3 | **Direct transactional email** | `RESEND_API_KEY` *or* `SENDGRID_API_KEY` | Every submission, **including ones Asana rejected** | Yes (optional) |

Why all three:

- Channel 1 is the everyday path, but it cannot fire when Asana itself is the
  thing that failed — there is no task to follow.
- Channel 2 is the one that would have caught the **2026-07-20 and 2026-07-21
  misses**, where the visitor's browser never reached the function at all and
  the submission sat unread in Netlify Forms. See the recipient table above for
  exactly which inbox gets which form.
- Channel 3 is off until a provider key is set. It is the only channel that
  emails a human on the Asana-rejected path, and it names the submitter so the
  request can be answered before anyone digs the payload out of Netlify Forms.
  It is **also** what sends the visitor-facing "wrong form" auto-reply
  (section 3b) — that email is the one thing here that goes to the public.

Check what is live without dashboard access — a GET on the endpoint reports it:

```bash
curl -s https://ablazeyc.com/.netlify/functions/submit-form
# {"ok":false,"error":"Method not allowed","v":8,
#  "notify":{"followers":2,"email":false,
#            "autoReply":["Booking","Press / Media","Sponsorship / Partnership","Scholarship"]}}
```

`email:false` just means channel 3 has no provider key — channels 1 and 2 are
still running, and the section 3b on-page redirect still works. `autoReply`
lists the Inquiry Types that trigger a redirect; the emails for them only send
once `email` is `true`.

### Turning on channel 3

1. Create a Resend account and verify the `ablazeyc.com` domain (DNS records in
   your registrar). Without a verified domain, sends from
   `noreply@ablazeyc.com` are rejected.
2. `netlify env:set RESEND_API_KEY "re_…"` (or set it in the dashboard).
3. Redeploy. Confirm `notify.email` is now `true`.
4. Submit the contact form with Inquiry Type "Booking" and a real address you
   control — you should get the auto-reply, and the Asana card should carry the
   `⚠️ WRONG FORM` flag.

### Reconciling misses — the `ablaze-intake-sync` agent

`.claude/agents/ablaze-intake-sync.md` is a subagent that sweeps Netlify Forms
for submissions that never reached the board, cross-checks Asana to avoid
duplicates, and recreates the missing cards in 📥 New in the function's own
format (title, notes, priority, checklist subtasks, both notify followers). Run
it any time, or on a schedule:

```
Use the ablaze-intake-sync agent to check for missed website requests
```

It never deletes, never re-triages, and never touches the scholarship form.

---

## 5. Spam protection

- **Honeypot** `bot-field` on every form — filled = silently dropped.
- **Required‑field validation** server‑side (in addition to the HTML `required` attributes).
- **Rate limiting** — best‑effort, ~6 submissions/min per IP per warm function instance.

---

## 6. Limitations

- **Rate limiting is per‑instance.** Serverless instances are ephemeral and not shared, so the limiter
  throttles bursts from one warm instance rather than enforcing a hard global cap. Netlify's
  platform‑level abuse protection + the honeypot cover the rest. For a hard global limit, add a shared
  store (e.g. Upstash Redis).
- **No‑loss, not real‑time delivery guarantee.** If Asana is down, the visitor still sees success and the
  submission is logged (and webhooked if configured) for manual recovery — it is not auto‑retried.
- **Checklist = subtasks, created in concurrent waves.** Netlify kills a function at 10s, and 16 serial
  subtask POSTs need ~14s — so the Booking checklist used to truncate silently. Subtasks now go out in
  waves of 8, and the whole invocation shares one time budget (`FUNCTION_BUDGET_MS`) that every outbound
  call clamps to. Measured: the full 16‑item Booking checklist completes in ~5–6.5s. If a wave still
  can't fit, it is skipped and logged (`subtask budget hit; N item(s) not created`) — the parent task
  always exists with the full description.
- **Why the budget matters more than it looks.** If the function is killed mid‑flight, the browser sees a
  dead socket and runs its native fallback, which files a *duplicate* of a booking that already has a live
  Asana card. Overshooting the limit is worse than dropping a checklist item, which is why waves only start
  when there is room to finish them.
- **Netlify Forms fallback** only applies to the `data-netlify` forms (booking/contact/press/sponsor).
  The compact email signups degrade to their previous "Sent ✓" behavior if the function is unreachable.
- **Free Netlify Forms tier is 100 submissions/month** — only *fallback* submissions count against it
  (the happy path goes straight to Asana, not Netlify Forms).
