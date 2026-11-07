// =============================================================================
//  ABLAZE — WEBSITE FORM → ASANA INTAKE FUNCTION
// =============================================================================
//  Receives a JSON form submission from the site (see site/scripts.js), builds
//  a richly-formatted task, and creates it inside the Asana project
//  "Ablaze Website Intake & Booking Pipeline".
//
//  WHY A SERVER FUNCTION?  The Asana Personal Access Token is a secret. It is
//  read here from an environment variable and NEVER sent to the browser. The
//  frontend only ever talks to this endpoint.
//
//  RUNTIME: Netlify Functions (Node 18+). Uses the global `fetch` (built into
//  Node 18+), so this file has zero npm dependencies.
//
//  ENDPOINT (after deploy):  /.netlify/functions/submit-form
// =============================================================================

'use strict';

// -----------------------------------------------------------------------------
//  1) SECRETS — from environment variables only. Set these in:
//     Netlify dashboard → Site settings → Environment variables
//     (or a local, git-ignored .env when running `netlify dev`).
//     See .env.example and ASANA_SETUP.md.
// -----------------------------------------------------------------------------
const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN || '';
// The project + section gids below are a MATCHED SET — the sections belong to
// this exact project — so the project id lives in code next to them, not in an
// env var where it can drift to a different project (a stale ASANA_PROJECT_ID
// pointing at the near-duplicate "…Booking Pipeline" Event Team project makes
// every section-membership create fail with a 400). Object ids aren't secrets;
// only the token is, and the token stays env-only.
const ASANA_WORKSPACE_ID = '1207597362503037'; // UCF Ministries
// The original "…2026-27" Social Media Team project (1215734352659379) was
// deleted in Asana in July 2026 — the Event Team project below is the only
// surviving intake board, and the Netlify token's user is a member of it.
const ASANA_PROJECT_ID   = '1215734657480092'; // "Ablaze Website Intake & Booking Pipeline" (Event Team, public to workspace)

// -----------------------------------------------------------------------------
//  2) PROJECT CONFIG — paste your Asana IDs here.
//     These are NOT secrets (they're just object IDs), so it's fine to keep
//     them in code. How to find each ID is documented in ASANA_SETUP.md.
// -----------------------------------------------------------------------------

// ► SECTION IDs — one column/section per request type. A task for each request
//   type drops into its matching section. Leave a value as '' to let the task
//   land in the project's default (top) section.
//
//   HOW TO FIND A SECTION ID: open the project in Asana, switch to Board view,
//   click a section's header (or any task in it) and read the number in the URL,
//   OR call:  GET https://app.asana.com/api/1.0/projects/<PROJECT_ID>/sections
//   BOARD (July 2026): consolidated to 5 lanes — 📥 New · 🔍 In Review ·
//   📤 Respond / Follow-Up · ✅ Booked / Confirmed · 🗂 Closed. Every website
//   submission lands in 📥 New for triage; a human moves it right from there
//   (vetting stages live in each booking card's subtask checklist, not in
//   separate columns). The old per-type sections were deleted.
const SECTION_NEW = '1215734608666528'; // 📥 New (was "New Website Submission" — same gid)
const SECTIONS = {
  'Booking Request':              SECTION_NEW,
  'Press / Media Inquiry':        SECTION_NEW,
  'Sponsorship / Donor Inquiry':  SECTION_NEW,
  'Merch / Store Question':       SECTION_NEW,
  'General Contact':              SECTION_NEW,
  'Ablaze Society / Fan Signup':  SECTION_NEW,
  'Testimony / Story Submission': SECTION_NEW,
  'Director Inquiry':             SECTION_NEW, // (you assign Mark Ellis Jr. at triage)
};

// ► PRIORITY (optional) — Asana "priority" is a custom field, so it has a
//   workspace-specific field ID and per-option IDs. If your project has a
//   single-select "Priority" field, paste its field ID and the option IDs and
//   each task's priority (decided by request type, see REQUEST_TYPES below)
//   will be set automatically. Leave PRIORITY_FIELD_ID = '' to skip — the
//   priority is ALSO written into the task description either way.
//
//   HOW TO FIND THESE: GET https://app.asana.com/api/1.0/projects/<PROJECT_ID>/custom_field_settings
//   The response lists each custom field's gid and, for enum fields, every
//   option's gid.
// ⚠️ All custom-field IDs below are DISABLED ('') as of July 2026: they belonged
// to the deleted "…2026-27" project and died with it. The current Event Team
// project has NO custom fields — sending any of these gids would 400 the whole
// task create. Every value still lands in the task description. To re-enable:
// add the fields to the project in Asana, then paste the new gids here
// (GET /projects/1215734657480092/custom_field_settings).
const PRIORITY_FIELD_ID = ''; // was "Priority" single-select on the deleted project
const PRIORITY_OPTION_IDS = {
  High:   '',
  Medium: '',
  Low:    '',
};

// ► CUSTOM FIELDS (optional) — map a submitted form field name to an Asana
//   custom field ID to also store it as structured data on the task (in
//   addition to the description). Example:
//     const CUSTOM_FIELDS = {
//       email:      '1201111111111111',  // a text custom field
//       event_date: '1202222222222222',  // a date custom field
//     };
//   (Same lookup as priority: .../custom_field_settings)
const CUSTOM_FIELDS = {
  // org / utm_campaign field gids died with the deleted project — see note above.
};

// ► STRUCTURED FIELDS (enum / date / composed text) — set in addition to the
//   description so the board is filterable and the Request-Type automation rules
//   can fire. These need value resolution (an enum option gid, a { date } object,
//   etc.) that the plain-text CUSTOM_FIELDS map above can't do. Applied in
//   createAsanaTask().
const REQUEST_TYPE_FIELD_ID = ''; // disabled — see note above
const REQUEST_TYPE_OPTION_IDS = {};

// Source is ALWAYS "Website" for these submissions. (The booking form's "How did
// you hear about us?" answer is marketing attribution and stays in the notes.)
const SOURCE_FIELD_ID          = ''; // disabled — see note above
const SOURCE_WEBSITE_OPTION_ID = '';

const EVENT_DATE_FIELD_ID     = ''; // disabled — see note above
const EVENT_LOCATION_FIELD_ID = ''; // disabled — see note above

// ► BUDGET — keys must match the booking form's <option> text EXACTLY (note the
//   en-dash "–"). Mapped rank-for-rank onto the project's 5 "Budget Range"
//   options. ⚠️ The Asana option LABELS still show the old $5k/$10k/$20k tiers —
//   rename them in the Asana UI to the values below (renaming keeps the same
//   gids, so nothing here changes): Under $7,500 · $7,500–$15,000 ·
//   $15,000–$30,000 · $30,000+ · Flexible / Open.
const BUDGET_FIELD_ID = ''; // disabled — see note above
const BUDGET_OPTION_IDS = {};

// -----------------------------------------------------------------------------
//  2b) NOTIFICATIONS — who gets emailed about every website request
//
//  TWO INDEPENDENT CHANNELS, on purpose. Either one alone is enough to know a
//  request came in; together they survive the failure of the other.
//
//   A) ASANA FOLLOWERS (always on, no extra secrets). Both addresses below are
//      real members of the UCF Ministries Asana workspace, so adding them as
//      followers makes Asana itself send them a "new task" email containing the
//      full submission and a link to the card. Added AFTER the task is created
//      (see createAsanaTask) so a bad/removed user gid can never 400 the create
//      and cost us a submission — the same lesson the custom-field gids taught.
//
//   B) DIRECT TRANSACTIONAL EMAIL (opt-in). Set RESEND_API_KEY *or*
//      SENDGRID_API_KEY in Netlify and this function also sends its own branded
//      notification — including on the Asana-failed path, where channel A can't
//      fire by definition. Unset = silently skipped, nothing breaks.
//
//  A third safety net lives OUTSIDE this file: Netlify form-submission email
//  notifications to the same two addresses (Site settings → Forms →
//  Notifications). Those cover the one case neither channel here can — the
//  browser never reaching this function at all, so the submission lands in
//  Netlify Forms via the native fallback. See ASANA_SETUP.md → Notifications.
// -----------------------------------------------------------------------------
const NOTIFY_EMAILS = [
  'markellis0404@gmail.com',      // Mark Ellis Jr. — Director
  'worship@ucfministries.org',    // Worship (Sandra McKinley)
];

// Asana user gids for the addresses above (workspace 1207597362503037). Gids are
// used rather than emails so a display-name/email change in Asana can't silently
// stop the notifications. Verified 2026-07-22 via GET /users.
const NOTIFY_FOLLOWER_GIDS = [
  '1208682055693742', // markellis0404@gmail.com
  '1208531377541012', // worship@ucfministries.org (Sandra McKinley)
];

// Envelope sender for channel B. Must be a verified sender/domain at whichever
// provider you configured, or the send will be rejected.
const NOTIFY_FROM = process.env.NOTIFY_FROM_EMAIL || 'Ablaze Website <noreply@ablazeyc.com>';

// -----------------------------------------------------------------------------
//  3) REQUEST TYPE REGISTRY
//     Drives the task name, section, priority, and internal checklist.
//     The 7 supported request types map 1:1 to the keys below.
// -----------------------------------------------------------------------------
const REQUEST_TYPES = {
  'Booking Request': {
    priority: 'High',
    // Detailed vetting checklist (created as Asana subtasks, in order).
    checklist: [
      'Confirm contact information is complete',
      'Confirm event date and location',
      'Confirm event type and purpose',
      'Confirm audience and expected attendance',
      'Confirm requested Ablaze format',
      'Review ministry fit',
      'Review logistics fit',
      'Review budget/honorarium',
      'Check travel/lodging needs',
      'Check sound/stage/media requirements',
      'Send more info request if needed',
      { name: 'Leadership Sign-Off — Approve / Request changes / Decline', approval: true },
      'Send response',
      'Send proposal/agreement if approved',
      'Set follow-up date',
      'Mark final decision',
    ],
  },
  'Press / Media Inquiry': {
    priority: 'High',
    checklist: [
      'Confirm outlet and reporter credentials',
      'Confirm coverage type and angle',
      'Confirm deadline / publish window',
      'Review fit with Ablaze brand & messaging',
      'Gather requested assets (bio, photos, logos)',
      'Coordinate interview / quotes if needed',
      'Send response',
      'Set follow-up date',
    ],
  },
  'Sponsorship / Donor Inquiry': {
    priority: 'High',
    checklist: [
      'Confirm contact and organization details',
      'Confirm sponsorship tier of interest',
      'Review organization fit & values alignment',
      'Review budget & deliverables',
      'Prepare custom partnership proposal',
      'Send proposal / agreement',
      'Set follow-up date',
      'Mark final decision',
    ],
  },
  'Merch / Store Question': {
    priority: 'Medium',
    checklist: [
      'Confirm order / product details',
      'Check Shopify order status if applicable',
      'Draft response',
      'Send response',
      'Escalate to fulfillment if needed',
      'Set follow-up date',
    ],
  },
  'General Contact': {
    priority: 'Medium',
    checklist: [
      'Review message and intent',
      'Route to the correct team if needed',
      'Draft response',
      'Send response',
      'Set follow-up date',
    ],
  },
  'Ablaze Society / Fan Signup': {
    priority: 'Low',
    checklist: [
      'Confirm email is valid',
      'Add to Ablaze Society list / Klaviyo',
      'Send welcome message',
    ],
  },
  'Testimony / Story Submission': {
    priority: 'Medium',
    checklist: [
      'Read and review the testimony / story',
      'Confirm permission to share publicly',
      'Tag for content / social use',
      'Thank the submitter',
      'Set follow-up date',
    ],
  },
  'Director Inquiry': {
    priority: 'Medium',
    checklist: [
      'Confirm contact details and the nature of the request',
      'Assign to Mark Ellis Jr. / the Director',
      'Check calendar / availability if a meeting or appearance is requested',
      'Draft response',
      'Send response',
      'Set follow-up date',
    ],
  },
};

// Map a form's `name` attribute → request type. (Forms without a name default
// to the fan signup type.) The contact form is refined further below.
const FORM_TO_TYPE = {
  booking:      'Booking Request',
  press:        'Press / Media Inquiry',
  sponsor:      'Sponsorship / Donor Inquiry',
  contact:      'General Contact',
  'fan-signup': 'Ablaze Society / Fan Signup',
  // NOTE: the scholarship application form is intentionally NOT integrated here
  // (it keeps its existing Netlify Forms flow and contains minors' PII). To
  // route it to Asana, add:  scholarship: 'Scholarship Application'  and a
  // matching entry in REQUEST_TYPES + SECTIONS.
};

// The contact form has an "Inquiry Type" dropdown. Two of those values map to
// dedicated request types that have no page of their own; everything else
// stays a General Contact.
const CONTACT_INQUIRY_TO_TYPE = {
  'Merch / Store Question':        'Merch / Store Question',
  'Testimony / Story':             'Testimony / Story Submission',
  'Mark Ellis Jr. / Our Director': 'Director Inquiry',
  // Booking / Press / Media / Sponsorship / Scholarship / Fan Mail / Other → General
  // Contact (default). Those types' dedicated forms collect required fields the
  // contact form doesn't, so contact-form versions are triaged from General Contact
  // rather than rejected for missing data.
};

// -----------------------------------------------------------------------------
//  3b) "WRONG FORM" AUTO-REPLY
//  Four Inquiry Type values on the contact form name a category that has a
//  dedicated form elsewhere on the site. Those forms exist because each one
//  collects fields the contact form has no equivalent for — a booking with no
//  date, venue or audience size can't be answered, only chased. When someone
//  picks one of these on the contact form we still take the submission (the
//  card below is created exactly as normal — never drop a lead over a routing
//  mistake) and additionally email them a nudge to the real form.
//
//  Keys must match contact.html's <option> text EXACTLY.
//  ⚠️ Mirrored client-side in site/scripts.js → REDIRECTS, which sends the
//  visitor to next-step.html?to=<variant> instead of thank-you.html. The two
//  maps must list the same options — change both together.
const SITE_URL = 'https://ablazeyc.com';
const REDIRECT_FORMS = {
  'Booking': {
    variant: 'booking',
    label: 'booking request',
    url: `${SITE_URL}/booking#inquire`,
    cta: 'Open the Booking Form',
    needs: 'your event date, venue, expected attendance, and which Ablaze format you want',
  },
  'Press / Media': {
    variant: 'press',
    label: 'press or media inquiry',
    url: `${SITE_URL}/press#media`,
    cta: 'Open the Media Form',
    needs: 'your outlet, coverage type, and deadline',
  },
  'Sponsorship / Partnership': {
    variant: 'sponsor',
    label: 'sponsorship or partnership inquiry',
    url: `${SITE_URL}/sponsor#partner`,
    cta: 'Open the Partnership Form',
    needs: 'your organization details and the tier you have in mind',
  },
  'Scholarship': {
    variant: 'scholarship',
    label: 'scholarship inquiry',
    url: `${SITE_URL}/scholarship-apply`,
    cta: 'Open the Application',
    needs: 'the applicant details our review team works from',
  },
};

// The redirect config for a submission, or null. Contact form only — the
// dedicated forms are already the right form, and a booking submitted through
// booking.html must never be told to go fill out booking.html.
function redirectFormFor(fields) {
  const formName = clean(fields.form_name) || clean(fields['form-name']);
  if (formName !== 'contact') return null;
  return REDIRECT_FORMS[clean(fields.inquiry)] || null;
}

// -----------------------------------------------------------------------------
//  4) DESCRIPTION LAYOUT
//     Per-type ordered list of [label, fieldName | (fields) => string].
//     Empty values are skipped. Anything submitted but not listed is appended
//     under "Additional details" so no data is ever dropped.
// -----------------------------------------------------------------------------
const fullName = (f) => [f.first_name, f.last_name].filter(Boolean).join(' ').trim();

const DESCRIPTION_LAYOUT = {
  'Booking Request': [
    ['Contact name', fullName],
    ['Email', 'email'],
    ['Phone', 'phone'],
    ['Organization / Church', 'org'],
    ['Role', 'role'],
    ['Event type', 'event_type'],
    ['Event date', (f) => f.event_date + (f.backup_date ? `  (backup: ${f.backup_date})` : '')],
    ['Location', (f) => [f.venue, f.city, f.state].filter(Boolean).join(', ')],
    ['Expected attendance', 'audience'],
    ['Requested Ablaze format', 'tier'],
    ['Budget range', 'budget'],
    ['Travel / lodging', 'travel'],
    ['Sound / stage / media', 'stage_media'],
    ['How they heard about us', 'referral'],
    ['Message', 'vision'],
    ['Confirmed pricing is "starting at"', (f) => (f.agree ? 'Yes' : 'No')],
  ],
  'Press / Media Inquiry': [
    ['Name', 'name'],
    ['Outlet', 'outlet'],
    ['Email', 'email'],
    ['Phone', 'phone'],
    ['Coverage type', 'type'],
    ['Deadline / publish window', 'deadline'],
    ['Brief', 'brief'],
  ],
  'Sponsorship / Donor Inquiry': [
    ['Contact name', 'name'],
    ['Title / role', 'title'],
    ['Email', 'email'],
    ['Phone', 'phone'],
    ['Organization', 'org'],
    ['Website', 'website'],
    ['Tier of interest', 'tier'],
    ['Organization type', 'type'],
    ['Why they want to partner', 'why'],
  ],
  // Merch / Testimony / General all come through the contact form's fields.
  'Merch / Store Question': [
    ['Name', fullName],
    ['Email', 'email'],
    ['Inquiry type', 'inquiry'],
    ['Message', 'message'],
  ],
  'Testimony / Story Submission': [
    ['Name', fullName],
    ['Email', 'email'],
    ['Inquiry type', 'inquiry'],
    ['Testimony / story', 'message'],
  ],
  'General Contact': [
    ['Name', fullName],
    ['Email', 'email'],
    ['Inquiry type', 'inquiry'],
    ['Message', 'message'],
  ],
  'Director Inquiry': [
    ['Name', fullName],
    ['Email', 'email'],
    ['Inquiry type', 'inquiry'],
    ['Message', 'message'],
  ],
  'Ablaze Society / Fan Signup': [
    ['Email', 'email'],
    ['Name', fullName],
  ],
};

// Fields that are internal plumbing and should not appear in "Additional
// details" (they're either rendered explicitly or are meta).
const INTERNAL_FIELDS = new Set([
  'form-name', 'form_name', 'bot-field', 'request_type', 'source_page',
  'submitted_at', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
  'utm_term', 'fbclid', 'ttclid', 'gclid', 'agree',
]);

// -----------------------------------------------------------------------------
//  5) SMALL HELPERS
// -----------------------------------------------------------------------------
const ASANA_BASE = 'https://app.asana.com/api/1.0';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ► INVOCATION TIME BUDGET
//   Netlify hard-kills a function at 10s. Every outbound call used to carry its
//   own independent timeout (8s create + 5s section + 5s followers + a 6.5s
//   subtask loop + 5s mail), which sums to ~29s — so on a slow Asana day the
//   platform could kill us mid-flight. That is the worst possible outcome: the
//   browser sees a dead socket, runs its native fallback, and files a DUPLICATE
//   of a booking that already has a live Asana card.
//
//   So the budget is now owned by the invocation, not by each call. Every call
//   is clamped to whatever is actually left, and best-effort work is skipped
//   once the remaining time is too small to be useful.
const FUNCTION_BUDGET_MS = 8800;  // leaves ~1.2s to serialize + return the response

// Reserve time for the notification email ONLY if a provider is actually
// configured. With no key, notifyByEmail returns immediately, so holding back
// 1.8s would just be time stolen from the checklist for nothing — that alone
// was costing the Booking Request its last four subtasks.
const MAIL_CONFIGURED   = Boolean(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
const NOTIFY_RESERVE_MS = MAIL_CONFIGURED ? 1800 : 0;

let invocationDeadline = 0;       // set at the top of the handler, per request

// Milliseconds left in this invocation, minus anything the caller wants reserved.
function msLeft(reserveMs) {
  return invocationDeadline - Date.now() - (reserveMs || 0);
}

function json(statusCode, payload, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign(
      {
        'Content-Type': 'application/json',
        // Same-origin in production; permissive here keeps previews/embeds working.
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store',
      },
      extraHeaders || {}
    ),
    body: JSON.stringify(payload),
  };
}

function clientIp(event) {
  const h = event.headers || {};
  return (
    h['x-nf-client-connection-ip'] ||
    (h['x-forwarded-for'] || '').split(',')[0].trim() ||
    h['client-ip'] ||
    'unknown'
  );
}

function clean(v) {
  return typeof v === 'string' ? v.trim() : v;
}

// Resolve the canonical request type from the submission.
function resolveRequestType(fields) {
  const formName = clean(fields.form_name) || clean(fields['form-name']) || 'fan-signup';
  let type = FORM_TO_TYPE[formName] || 'General Contact';
  // If the explicit request_type the client sent is a known type, trust it.
  if (fields.request_type && REQUEST_TYPES[clean(fields.request_type)]) {
    type = clean(fields.request_type);
  }
  // Contact form refinement (Merch / Testimony share the contact form).
  if (formName === 'contact' && fields.inquiry && CONTACT_INQUIRY_TO_TYPE[clean(fields.inquiry)]) {
    type = CONTACT_INQUIRY_TO_TYPE[clean(fields.inquiry)];
  }
  return REQUEST_TYPES[type] ? type : 'General Contact';
}

// Required-field validation per request type. Lenient enough to never reject a
// genuine submission, strict enough to catch empties/bots. Returns [] if ok.
function validate(requestType, f) {
  const missing = [];
  const has = (k) => clean(f[k]);
  const hasName = has('name') || has('first_name') || has('last_name');

  if (!has('email')) missing.push('Email');
  else if (!EMAIL_RE.test(clean(f.email))) missing.push('a valid Email');

  switch (requestType) {
    case 'Booking Request':
      if (!hasName) missing.push('Name');
      if (!has('org')) missing.push('Organization / Church');
      if (!has('event_date')) missing.push('Event Date');
      break;
    case 'Press / Media Inquiry':
      if (!hasName) missing.push('Name');
      if (!has('brief')) missing.push('Brief');
      break;
    case 'Sponsorship / Donor Inquiry':
      if (!hasName) missing.push('Contact Name');
      if (!has('org')) missing.push('Organization');
      break;
    case 'Merch / Store Question':
    case 'Testimony / Story Submission':
    case 'General Contact':
    case 'Director Inquiry':
      if (!hasName) missing.push('Name');
      if (!has('message')) missing.push('Message');
      break;
    case 'Ablaze Society / Fan Signup':
      // email-only is fine
      break;
  }
  return missing;
}

// Task title. Booking gets the special format; everything else the generic one.
function deriveTitle(requestType, f) {
  if (requestType === 'Booking Request') {
    const org = clean(f.org) || fullName(f) || 'New inquiry';
    const date = clean(f.event_date) || 'date TBD';
    return `Booking Request: ${org} - ${date}`;
  }
  let who = '';
  switch (requestType) {
    case 'Press / Media Inquiry':
      who = clean(f.name) + (clean(f.outlet) ? ` (${clean(f.outlet)})` : '');
      break;
    case 'Sponsorship / Donor Inquiry':
      who = clean(f.org) || clean(f.name);
      if (clean(f.org) && clean(f.name)) who = `${clean(f.org)} (${clean(f.name)})`;
      break;
    default:
      who = fullName(f) || clean(f.name) || clean(f.email);
  }
  who = (who || clean(f.email) || 'Website submission').trim();
  return `${requestType}: ${who}`;
}

// Build the plain-text task description (notes).
function buildDescription(requestType, f, priority) {
  const lines = [];
  lines.push(`🔥 New ${requestType} from the Ablaze website`);
  lines.push('');

  // Flag misrouted submissions at the TOP, not in the meta block — this is the
  // one thing about the card that changes what a human should do with it. It
  // warns that a near-duplicate may arrive shortly through the proper form (so
  // the two get merged instead of worked twice), and it tells whoever replies
  // that the visitor has already been asked to re-submit, so a second "please
  // use the booking form" reply would just be nagging.
  const redirect = redirectFormFor(f);
  if (redirect) {
    lines.push(`⚠️ WRONG FORM — they selected "${clean(f.inquiry)}" on the contact form.`);
    lines.push(`   Auto-reply sent pointing them to: ${redirect.url}`);
    lines.push(`   Expect a fuller submission through that form. Merge if it arrives.`);
    lines.push('');
  }

  const layout = DESCRIPTION_LAYOUT[requestType] || DESCRIPTION_LAYOUT['General Contact'];
  const usedKeys = new Set(['first_name', 'last_name']);
  for (const [label, accessor] of layout) {
    let value;
    if (typeof accessor === 'function') {
      value = accessor(f);
    } else {
      value = f[accessor];
      usedKeys.add(accessor);
    }
    value = clean(value);
    if (value !== undefined && value !== null && value !== '') {
      lines.push(`${label}: ${value}`);
    }
  }

  // Anything submitted that we didn't explicitly render — keep it, never drop.
  const extras = Object.keys(f).filter(
    (k) => !usedKeys.has(k) && !INTERNAL_FIELDS.has(k) && clean(f[k]) !== '' && clean(f[k]) != null
  );
  if (extras.length) {
    lines.push('');
    lines.push('Additional details:');
    extras.forEach((k) => lines.push(`• ${k}: ${clean(f[k])}`));
  }

  // Meta block — request type, priority, source page, UTMs, timestamp.
  lines.push('');
  lines.push('— — — — — — — — — — — — — — — — — — — —');
  lines.push(`Request type: ${requestType}`);
  lines.push(`Priority: ${priority}`);
  if (clean(f.source_page)) lines.push(`Source page: ${clean(f.source_page)}`);

  const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .map((k) => (clean(f[k]) ? `${k.replace('utm_', '')}: ${clean(f[k])}` : null))
    .filter(Boolean);
  if (utm.length) lines.push(`UTM — ${utm.join(' | ')}`);
  else lines.push('UTM — none captured');

  lines.push(`Submitted: ${new Date().toISOString()}`);
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
//  6) ASANA API
// -----------------------------------------------------------------------------
async function asanaFetch(path, options, timeoutMs) {
  // Clamp the caller's timeout to the time this invocation actually has left, so
  // no single call can run past the platform limit. A floor of 400ms means a
  // doomed call fails fast and cleanly instead of being killed by Netlify.
  const want = timeoutMs || 8000;
  const budget = invocationDeadline ? Math.max(400, Math.min(want, msLeft(0))) : want;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    const res = await fetch(`${ASANA_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${ASANA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options && options.headers),
      },
    });
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; } catch (_) { body = { raw: text }; }
    if (!res.ok) {
      const detail = body && body.errors ? JSON.stringify(body.errors) : text;
      throw new Error(`Asana ${res.status}: ${detail}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function createAsanaTask(requestType, f) {
  const cfg = REQUEST_TYPES[requestType];
  const data = {
    name: deriveTitle(requestType, f),
    notes: buildDescription(requestType, f, cfg.priority),
  };

  // Place the task in the project. Asana's create-task API only accepts
  // `projects`/`workspace`/`parent` for placement (`memberships` is rejected
  // with a 400) — the section move happens after creation via addTask.
  const sectionId = SECTIONS[requestType];
  if (ASANA_PROJECT_ID) {
    data.projects = [ASANA_PROJECT_ID];
  } else if (ASANA_WORKSPACE_ID) {
    // No project configured — fall back to creating in the workspace.
    data.workspace = ASANA_WORKSPACE_ID;
  }

  // Custom fields (priority + any explicitly mapped fields).
  const customFields = {};
  if (PRIORITY_FIELD_ID && PRIORITY_OPTION_IDS[cfg.priority]) {
    customFields[PRIORITY_FIELD_ID] = PRIORITY_OPTION_IDS[cfg.priority];
  }
  for (const [formField, asanaGid] of Object.entries(CUSTOM_FIELDS)) {
    const v = clean(f[formField]);
    if (asanaGid && v !== undefined && v !== '') customFields[asanaGid] = v;
  }

  // Structured fields (enum / date / composed text) — see the config block up top.
  if (REQUEST_TYPE_FIELD_ID && REQUEST_TYPE_OPTION_IDS[requestType]) {
    customFields[REQUEST_TYPE_FIELD_ID] = REQUEST_TYPE_OPTION_IDS[requestType];
  }
  if (SOURCE_FIELD_ID && SOURCE_WEBSITE_OPTION_ID) {
    customFields[SOURCE_FIELD_ID] = SOURCE_WEBSITE_OPTION_ID;
  }
  if (EVENT_DATE_FIELD_ID && clean(f.event_date)) {
    customFields[EVENT_DATE_FIELD_ID] = { date: clean(f.event_date) };
  }
  if (EVENT_LOCATION_FIELD_ID) {
    const loc = [clean(f.venue), clean(f.city), clean(f.state)].filter(Boolean).join(', ');
    if (loc) customFields[EVENT_LOCATION_FIELD_ID] = loc;
  }
  if (BUDGET_FIELD_ID && BUDGET_OPTION_IDS[clean(f.budget)]) {
    customFields[BUDGET_FIELD_ID] = BUDGET_OPTION_IDS[clean(f.budget)];
  }

  if (Object.keys(customFields).length) data.custom_fields = customFields;

  // Reserve the notification budget up front. If Asana is hanging, we would
  // rather give up on the create with time left to email a human than spend the
  // entire invocation waiting and have the request vanish silently.
  const res = await asanaFetch('/tasks?opt_fields=permalink_url,name', {
    method: 'POST',
    body: JSON.stringify({ data }),
  }, Math.max(2000, msLeft(NOTIFY_RESERVE_MS)));

  // Best-effort section move — a failure leaves the task in the project's
  // default section, which still counts as delivered.
  if (sectionId && res.data && res.data.gid) {
    try {
      await asanaFetch(`/sections/${sectionId}/addTask`, {
        method: 'POST',
        body: JSON.stringify({ data: { task: res.data.gid } }),
      }, 5000);
    } catch (err) {
      console.warn(`[asana-intake] section move failed (${requestType}):`, err.message);
    }
  }

  // Notification channel A — add the standing followers so Asana emails them.
  // Best-effort and deliberately AFTER the create: if a gid is stale the task
  // still exists with every detail, we just lose one notification hop (channel
  // B and the Netlify Forms notification still cover it).
  if (NOTIFY_FOLLOWER_GIDS.length && res.data && res.data.gid) {
    try {
      await asanaFetch(`/tasks/${res.data.gid}/addFollowers`, {
        method: 'POST',
        body: JSON.stringify({ data: { followers: NOTIFY_FOLLOWER_GIDS } }),
      }, 5000);
    } catch (err) {
      console.warn('[asana-intake] addFollowers failed:', err.message);
    }
  }

  return res.data; // { gid, permalink_url, name, ... }
}

// Create the checklist as ordered subtasks. Best-effort: a failure here never
// fails the whole request (the parent task already exists with full details).
async function createChecklistSubtasks(parentGid, requestType) {
  const items = (REQUEST_TYPES[requestType] || {}).checklist || [];

  // Created in WAVES, not one-at-a-time. Booking Request has 16 items and each
  // POST costs ~700-900ms, so a serial loop needs ~14s — it could never finish
  // inside a 10s invocation and was quietly truncating the checklist to whatever
  // fit. Waves of SUBTASK_WAVE run concurrently (~1 round trip each), so all 16
  // land in ~3 round trips instead of 16.
  //
  // Why waves rather than one big Promise.all: Asana orders subtasks by creation,
  // and firing all 16 at once scrambles the checklist completely. Sequential waves
  // keep the list in order at wave granularity — items 1-6, then 7-12, then 13-16 —
  // which keeps the vetting steps readable top-to-bottom.
  // 8 per wave means the 16-item Booking checklist needs only 2 round trips.
  const SUBTASK_WAVE = 8;
  const SUBTASK_TIMEOUT_MS = 2500;
  // A wave costs up to SUBTASK_TIMEOUT_MS (calls run concurrently, so the wave
  // is as slow as its slowest member). Only START a wave if there is room to
  // FINISH it — checking for a token 900ms was how a wave beginning at 7.9s
  // pushed a real submission to 9.6s, within a rounding error of the platform
  // kill that produces duplicate cards.
  const WAVE_HEADROOM_MS = SUBTASK_TIMEOUT_MS + 100;
  let created = 0;

  for (let i = 0; i < items.length; i += SUBTASK_WAVE) {
    if (msLeft(NOTIFY_RESERVE_MS) < WAVE_HEADROOM_MS) {
      console.warn(`[asana-intake] subtask budget hit; ${items.length - created} item(s) not created for ${parentGid}`);
      break;
    }
    const wave = items.slice(i, i + SUBTASK_WAVE);
    const results = await Promise.all(
      wave.map(async (item) => {
        // Each item is a plain string (normal subtask) OR { name, approval: true },
        // which becomes an Asana approval task (Approve / Request changes / Reject).
        const name = typeof item === 'string' ? item : item.name;
        const data = { name };
        if (item && item.approval) data.resource_subtype = 'approval';
        try {
          await asanaFetch(`/tasks/${parentGid}/subtasks`, {
            method: 'POST',
            body: JSON.stringify({ data }),
          }, SUBTASK_TIMEOUT_MS);
          return true;
        } catch (err) {
          console.warn(`[asana-intake] subtask failed (${name}):`, err.message);
          return false;
        }
      })
    );
    created += results.filter(Boolean).length;
  }
  return created;
}

// -----------------------------------------------------------------------------
//  6b) NOTIFICATION EMAIL (channel B — see the notes in section 2b)
//      Provider-agnostic and entirely optional: with no API key configured this
//      is a no-op, and it is ALWAYS best-effort — a mail failure must never turn
//      a good submission into an error for the visitor.
// -----------------------------------------------------------------------------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Send one email to every address in NOTIFY_EMAILS. `taskUrl` is null when Asana
// rejected the task — in that case the email doubles as the failure alert, since
// nothing landed on the board to notify anyone about.
async function notifyByEmail(requestType, f, taskUrl, errorMessage) {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (!resendKey && !sendgridKey) return false; // channel B not configured

  const priority = (REQUEST_TYPES[requestType] || {}).priority || 'Medium';
  const title = deriveTitle(requestType, f);
  const body = buildDescription(requestType, f, priority);
  const subject = taskUrl
    ? `🔥 ${title}`
    : `⚠️ ACTION NEEDED — ${title} (not saved to Asana)`;

  const footer = taskUrl
    ? `Open in Asana: ${taskUrl}`
    : `This submission could NOT be saved to Asana (${errorMessage || 'unknown error'}).\n` +
      `It was captured in Netlify Forms instead — recover it there, or run the ablaze-intake-sync agent.`;

  const text = `${body}\n\n— — — — — — — — — — — — — — — — — — — —\n${footer}\n`;
  const html =
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a">` +
    `<h2 style="margin:0 0 4px;font-size:18px">${escapeHtml(title)}</h2>` +
    `<p style="margin:0 0 16px;color:#666;font-size:13px">Priority: ${escapeHtml(priority)} · via ablazeyc.com</p>` +
    `<pre style="white-space:pre-wrap;font-family:inherit;margin:0 0 20px">${escapeHtml(body)}</pre>` +
    (taskUrl
      ? `<p><a href="${escapeHtml(taskUrl)}" style="background:#c0392b;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Open in Asana</a></p>`
      : `<p style="background:#fff4f4;border-left:4px solid #c0392b;padding:12px">${escapeHtml(footer)}</p>`) +
    `</div>`;

  return sendMail({
    to: NOTIFY_EMAILS,
    subject,
    text,
    html,
    tag: taskUrl ? 'team notification' : 'team FAILURE alert',
  });
}

// Low-level provider send — Resend if its key is set, else SendGrid, else a
// no-op. Every caller is best-effort: this returns false rather than throwing,
// because no mail problem is worth turning a good submission into an error for
// the visitor.
async function sendMail({ to, subject, text, html, replyTo, tag }) {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (!resendKey && !sendgridKey) return false;

  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length) return false;

  // Clamped to the invocation budget for the same reason every Asana call is:
  // a hanging mail provider must never be what gets the function killed.
  const mailBudget = invocationDeadline ? msLeft(300) : 5000;
  if (mailBudget < 500) {
    console.warn(`[asana-intake] skipped ${tag} email — only ${mailBudget}ms left in budget`);
    return false;
  }
  const withTimeout = (url, options) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(5000, mailBudget));
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  try {
    let res;
    if (resendKey) {
      res = await withTimeout('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: NOTIFY_FROM,
          to: recipients,
          subject,
          text,
          html,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });
    } else {
      res = await withTimeout('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: recipients.map((email) => ({ email })) }],
          // SendGrid needs the address split out of the "Name <addr>" form.
          from: { email: (NOTIFY_FROM.match(/<(.+)>/) || [null, NOTIFY_FROM])[1], name: 'Ablaze Website' },
          ...(replyTo ? { reply_to: { email: replyTo } } : {}),
          subject,
          content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }],
        }),
      });
    }
    if (!res.ok) {
      console.warn(`[asana-intake] ${tag} email rejected:`, res.status, (await res.text()).slice(0, 300));
      return false;
    }
    console.log(`[asana-intake] sent ${tag} to ${recipients.join(', ')}`);
    return true;
  } catch (err) {
    console.warn(`[asana-intake] ${tag} email failed:`, err && err.message);
    return false;
  }
}

// -----------------------------------------------------------------------------
//  6c) "WRONG FORM" AUTO-REPLY TO THE VISITOR
//      Sent when someone uses the contact form for a request that has its own
//      form (see REDIRECT_FORMS). They ALSO see this as a page immediately on
//      submit (next-step.html) — the email is the durable copy, since the page
//      is gone the moment they close the tab and the link needs to survive.
//
//      SAFETY: the body is entirely templated. The visitor's own message is
//      NEVER echoed back, because the recipient address is unverified user
//      input — echoing arbitrary text to an arbitrary address would turn this
//      endpoint into a way to send someone else mail through our domain. Only
//      their first name is interpolated, and only as escaped text. Volume is
//      bounded by the per-IP rate limit in section 7.
// -----------------------------------------------------------------------------
async function sendAutoReply(fields, redirect) {
  const to = clean(fields.email);
  if (!to || !EMAIL_RE.test(to)) return false;

  const first = clean(fields.first_name) || clean(fields.name) || '';
  const greeting = first ? `Hey ${first},` : 'Hey,';

  const subject = `Thanks for reaching out — one quick step for your ${redirect.label}`;

  const text =
    `${greeting}\n\n` +
    `Thank you for the contact — we got your message.\n\n` +
    `It looks like a ${redirect.label}, though, and we have a dedicated form for those. ` +
    `It asks for ${redirect.needs} — the details we need to actually process and answer you. ` +
    `Please take two minutes to fill it out here:\n\n` +
    `${redirect.url}\n\n` +
    `Your message is already with our team, so nothing is lost. The form just gets you a real answer faster.\n\n` +
    `Grace and peace,\n` +
    `Ablaze Youth Choir\n` +
    `${SITE_URL}\n`;

  const html =
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;max-width:560px">` +
    `<p style="margin:0 0 16px">${escapeHtml(greeting)}</p>` +
    `<p style="margin:0 0 16px">Thank you for the contact — we got your message.</p>` +
    `<p style="margin:0 0 16px">It looks like a <strong>${escapeHtml(redirect.label)}</strong>, though, and we have a dedicated form for those. ` +
    `It asks for ${escapeHtml(redirect.needs)} — the details we need to actually process and answer you.</p>` +
    `<p style="margin:0 0 24px"><a href="${escapeHtml(redirect.url)}" style="background:#c0392b;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">${escapeHtml(redirect.cta)} &rarr;</a></p>` +
    `<p style="margin:0 0 16px;color:#666;font-size:14px">Your message is already with our team, so nothing is lost. The form just gets you a real answer faster.</p>` +
    `<p style="margin:24px 0 0;color:#666;font-size:14px">Grace and peace,<br><strong>Ablaze Youth Choir</strong><br>` +
    `<a href="${SITE_URL}" style="color:#c0392b">ablazeyc.com</a></p>` +
    `</div>`;

  // Replies land with a human, not the unmonitored noreply@ envelope sender.
  return sendMail({
    to,
    subject,
    text,
    html,
    replyTo: 'worship@ucfministries.org',
    tag: `auto-reply (${redirect.variant})`,
  });
}

// -----------------------------------------------------------------------------
//  7) RATE LIMITING (best-effort)
//     In-memory, per warm instance. Serverless instances are ephemeral and not
//     shared, so this throttles bursts from a single instance — it is NOT a
//     global limiter. Netlify also applies platform-level abuse protection, and
//     the honeypot below stops most bots. See ASANA_SETUP.md → Limitations.
// -----------------------------------------------------------------------------
const RATE = { windowMs: 60 * 1000, max: 6, hits: new Map() };
function isRateLimited(ip) {
  const now = Date.now();
  const arr = (RATE.hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  arr.push(now);
  RATE.hits.set(ip, arr);
  if (RATE.hits.size > 5000) RATE.hits.clear(); // crude memory guard
  return arr.length > RATE.max;
}

// -----------------------------------------------------------------------------
//  8) HANDLER
// -----------------------------------------------------------------------------
exports.handler = async (event) => {
  // Start the clock before anything else — every outbound call clamps to it.
  invocationDeadline = Date.now() + FUNCTION_BUDGET_MS;

  if (event.httpMethod === 'OPTIONS') return json(204, {});
  // `v` is a deploy marker so a plain GET can confirm which revision is live.
  if (event.httpMethod !== 'POST') {
    return json(405, {
      ok: false,
      error: 'Method not allowed',
      v: 8,
      // Surfaced so the ablaze-intake-sync agent can check notification wiring
      // without needing dashboard access. No secrets, just on/off.
      notify: {
        followers: NOTIFY_FOLLOWER_GIDS.length,
        email: Boolean(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY),
        // The visitor auto-reply rides the same provider as `email` above — if
        // that is false, misrouted contact submissions still get the on-page
        // redirect but no email. See ASANA_SETUP.md → Notifications.
        autoReply: Object.keys(REDIRECT_FORMS),
      },
    });
  }

  // Parse JSON body.
  let fields;
  try {
    fields = JSON.parse(event.body || '{}');
  } catch (_) {
    return json(400, { ok: false, error: 'We couldn’t read that submission. Please try again.' });
  }
  if (!fields || typeof fields !== 'object') {
    return json(400, { ok: false, error: 'We couldn’t read that submission. Please try again.' });
  }

  // Honeypot — a real user never fills the hidden "bot-field". Pretend success
  // so we don't tip off bots, but create nothing.
  if (clean(fields['bot-field'])) {
    return json(200, { ok: true, delivered: false, spam: true });
  }

  const requestType = resolveRequestType(fields);

  // Required-field validation → friendly, specific error.
  const missing = validate(requestType, fields);
  if (missing.length) {
    return json(400, {
      ok: false,
      error: `Please add: ${missing.join(', ')}.`,
      fields: missing,
    });
  }

  // Rate limiting.
  if (isRateLimited(clientIp(event))) {
    return json(429, {
      ok: false,
      error: 'That’s a lot of submissions in a short time — please wait a minute and try again.',
    }, { 'Retry-After': '60' });
  }

  // If Asana isn't configured yet, tell the client to fall back to its native
  // Netlify Forms submission so NOTHING is lost during rollout.
  if (!ASANA_ACCESS_TOKEN || (!ASANA_PROJECT_ID && !ASANA_WORKSPACE_ID)) {
    console.warn('[asana-intake] Not configured (missing ASANA_ACCESS_TOKEN / project). Asking client to fall back.');
    return json(503, { ok: false, fallback: true, error: 'Intake is warming up — falling back.' });
  }

  // Create the task, then the checklist subtasks.
  try {
    const task = await createAsanaTask(requestType, fields);
    let checklistCount = 0;
    try {
      checklistCount = await createChecklistSubtasks(task.gid, requestType);
    } catch (subErr) {
      console.warn('[asana-intake] checklist creation issue:', subErr.message);
    }
    // Channel B, plus the visitor's "wrong form" auto-reply when one applies.
    // Best-effort and awaited (the function is about to return, so a
    // fire-and-forget promise would be killed with the invocation). Run
    // CONCURRENTLY: two sends then cost one round trip, so they still fit inside
    // the same NOTIFY_RESERVE_MS the single send was budgeted for.
    const redirect = redirectFormFor(fields);
    try {
      await Promise.all([
        notifyByEmail(requestType, fields, task.permalink_url || null, null),
        redirect ? sendAutoReply(fields, redirect) : null,
      ]);
    } catch (mailErr) {
      console.warn('[asana-intake] notify issue:', mailErr && mailErr.message);
    }
    console.log(`[asana-intake] created task ${task.gid} (${requestType}, ${checklistCount} checklist items)`);
    // `redirect` tells the client which next-step variant to show. The browser
    // computes this itself (scripts.js → REDIRECTS) and does not depend on the
    // response, so this is advisory — it keeps the server the source of truth
    // for anything that submits without our JS.
    return json(200, {
      ok: true,
      delivered: true,
      taskUrl: task.permalink_url || null,
      nextStep: redirect ? redirect.variant : null,
    });
  } catch (err) {
    // -------------------------------------------------------------------------
    //  NO-LOSS FAILURE PATH
    //  Asana rejected/timed out. We do NOT lose the submission:
    //   1) Log the full payload as structured JSON — recoverable from the
    //      Netlify function logs (dashboard → Functions → submit-form → logs,
    //      or `netlify functions:log submit-form`). Note: log retention is
    //      short (~24h on starter plans) — logs are the backstop, not the store.
    //   2) Optionally forward it to FALLBACK_WEBHOOK_URL (Slack/Zapier/email)
    //      if that env var is set.
    //   3) Return { fallback:true } with a 503 so the browser re-submits the
    //      native form and Netlify Forms captures it DURABLY (dashboard →
    //      Forms). The visitor lands on the same thank-you page either way —
    //      returning 200 here would skip that fallback and strand the
    //      submission in expiring logs.
    // -------------------------------------------------------------------------
    console.error('[asana-intake] ASANA_DELIVERY_FAILED', err && err.message);
    console.error('[asana-intake] SUBMISSION_PAYLOAD ' + JSON.stringify({ requestType, fields, at: new Date().toISOString() }));

    // ORDER MATTERS HERE. By the time we reach this block the Asana call has
    // already burned most of the invocation, so whatever runs first is the only
    // thing that reliably runs at all. Alerting a human beats diagnosing a
    // machine: this is the ONE path where the Asana follower notification cannot
    // fire (there is no task), and the alert names the submitter so the request
    // can be answered by hand before anyone digs the payload out of Netlify Forms.
    // The visitor's auto-reply rides along here too. Our Asana being down is not
    // their problem, and the browser is about to land them on next-step.html
    // regardless (the form's action was already rewritten before submit), so the
    // email must match what the page told them.
    try {
      const redirect = redirectFormFor(fields);
      await Promise.all([
        notifyByEmail(requestType, fields, null, err && err.message),
        redirect ? sendAutoReply(fields, redirect) : null,
      ]);
    } catch (mailErr) {
      console.warn('[asana-intake] failure-alert email issue:', mailErr && mailErr.message);
    }

    // Diagnostic: on "Unknown object" errors the token authenticates but can't
    // see the project — log whose token this is so access can be granted. Only
    // worth attempting if there is real time left; the alert above is what the
    // team actually needs.
    if (msLeft(600) > 800) {
      try {
        const me = await asanaFetch('/users/me?opt_fields=name,email,workspaces.name', { method: 'GET' }, 2500);
        console.error('[asana-intake] TOKEN_IDENTITY ' + JSON.stringify(me && me.data));
      } catch (idErr) {
        console.error('[asana-intake] TOKEN_IDENTITY_FAILED', idErr && idErr.message);
      }
    } else {
      console.error('[asana-intake] TOKEN_IDENTITY skipped — out of time budget');
    }

    const hook = process.env.FALLBACK_WEBHOOK_URL;
    if (hook && msLeft(600) > 500) {
      // This was the one outbound call with no timeout of its own — an
      // unreachable webhook host could hang until the platform killed us, which
      // would swallow the 503 the browser needs to trigger its native fallback.
      const hookController = new AbortController();
      const hookTimer = setTimeout(() => hookController.abort(), Math.min(2500, msLeft(600)));
      try {
        await fetch(hook, {
          method: 'POST',
          signal: hookController.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ Ablaze intake: Asana create failed for "${requestType}". Submission logged.`,
            requestType,
            fields,
            error: err && err.message,
          }),
        });
      } catch (hookErr) {
        console.error('[asana-intake] fallback webhook failed:', hookErr && hookErr.message);
      } finally {
        clearTimeout(hookTimer);
      }
    }

    return json(503, { ok: false, delivered: false, fallback: true });
  }
};
