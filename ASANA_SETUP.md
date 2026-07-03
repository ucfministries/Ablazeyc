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
- **Checklist = subtasks.** Created best‑effort after the task; if Asana throttles mid‑way, the parent
  task still exists with the full description and the shortfall is logged.
- **Netlify Forms fallback** only applies to the `data-netlify` forms (booking/contact/press/sponsor).
  The compact email signups degrade to their previous "Sent ✓" behavior if the function is unreachable.
- **Free Netlify Forms tier is 100 submissions/month** — only *fallback* submissions count against it
  (the happy path goes straight to Asana, not Netlify Forms).
