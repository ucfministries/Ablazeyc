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
const ASANA_PROJECT_ID   = '1215734352659379'; // "Ablaze Website Intake & Booking Pipeline 2026-27" (Social Media Team)

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
const SECTIONS = {
  'Booking Request':              '1215734059591377', // Booking Review
  'Press / Media Inquiry':        '1215734059591376', // Needs Triage
  'Sponsorship / Donor Inquiry':  '1215734059591376', // Needs Triage
  'Merch / Store Question':       '1215734059591376', // Needs Triage
  'General Contact':              '1215734352659405', // New Website Submission
  'Ablaze Society / Fan Signup':  '1215734352659405', // New Website Submission
  'Testimony / Story Submission': '1215734059591376', // Needs Triage
  'Director Inquiry':             '1215734059591376', // Needs Triage (you assign Mark Ellis Jr.)
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
const PRIORITY_FIELD_ID = '1215734059591405'; // "Priority" single-select
const PRIORITY_OPTION_IDS = {
  High:   '1215734263172337', // "High"
  Medium: '1215734059591407', // Asana has no "Medium" — mapped to "Normal"
  Low:    '1215734059591406', // "Low"
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
  org:          '1215734263172365', // Organization / Church / School (text)
  utm_campaign: '1215734054708848', // UTM Campaign (text)
};

// ► STRUCTURED FIELDS (enum / date / composed text) — set in addition to the
//   description so the board is filterable and the Request-Type automation rules
//   can fire. These need value resolution (an enum option gid, a { date } object,
//   etc.) that the plain-text CUSTOM_FIELDS map above can't do. Applied in
//   createAsanaTask().
const REQUEST_TYPE_FIELD_ID = '1215734059591392'; // "Request Type" single-select
const REQUEST_TYPE_OPTION_IDS = {
  'Booking Request':              '1215734059591393',
  'Press / Media Inquiry':        '1215734059591394',
  'Sponsorship / Donor Inquiry':  '1215734059591395',
  'Merch / Store Question':       '1215734059591396',
  'General Contact':              '1215734059591397',
  'Ablaze Society / Fan Signup':  '1215734059591398', // Asana option "Ablaze Society Signup"
  'Testimony / Story Submission': '1215734059591399',
  // 'Director Inquiry': '',  // ← add a "Director Inquiry" option in Asana, then paste its gid
};

// Source is ALWAYS "Website" for these submissions. (The booking form's "How did
// you hear about us?" answer is marketing attribution and stays in the notes.)
const SOURCE_FIELD_ID          = '1215734352680016'; // "Source" single-select
const SOURCE_WEBSITE_OPTION_ID = '1215734352680017'; // "Website"

const EVENT_DATE_FIELD_ID     = '1215734263172355'; // "Event Date" (date) — bookings only
const EVENT_LOCATION_FIELD_ID = '1215734263172360'; // "Event Location" (text) — venue, city, state

// ► BUDGET — keys must match the booking form's <option> text EXACTLY (note the
//   en-dash "–"). Mapped rank-for-rank onto the project's 5 "Budget Range"
//   options. ⚠️ The Asana option LABELS still show the old $5k/$10k/$20k tiers —
//   rename them in the Asana UI to the values below (renaming keeps the same
//   gids, so nothing here changes): Under $7,500 · $7,500–$15,000 ·
//   $15,000–$30,000 · $30,000+ · Flexible / Open.
const BUDGET_FIELD_ID = '1215734270464338'; // "Budget Range" single-select
const BUDGET_OPTION_IDS = {
  'Under $7,500':     '1215734270464339', // Asana label (rename me): "Under $5,000"
  '$7,500–$15,000':   '1215734270464340', // Asana label (rename me): "5,000–$10,000"
  '$15,000–$30,000':  '1215734270464341', // Asana label (rename me): "$10,000–$20,000"
  '$30,000+':         '1215734270464342', // Asana label (rename me): "$20,000+"
  'Flexible / Open':  '1215734270464343',
};

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 8000);
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

  // Place the task: into its section if configured, else just the project.
  const sectionId = SECTIONS[requestType];
  if (sectionId) {
    data.memberships = [{ project: ASANA_PROJECT_ID, section: sectionId }];
  } else if (ASANA_PROJECT_ID) {
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

  const res = await asanaFetch('/tasks?opt_fields=permalink_url,name', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
  return res.data; // { gid, permalink_url, name, ... }
}

// Create the checklist as ordered subtasks. Best-effort: a failure here never
// fails the whole request (the parent task already exists with full details).
async function createChecklistSubtasks(parentGid, requestType) {
  const items = (REQUEST_TYPES[requestType] || {}).checklist || [];
  const deadline = Date.now() + 6500; // keep us comfortably under the 10s budget
  const created = [];
  for (const item of items) {
    if (Date.now() > deadline) {
      console.warn(`[asana-intake] subtask budget hit; ${items.length - created.length} item(s) not created for ${parentGid}`);
      break;
    }
    // Each item is a plain string (normal subtask) OR { name, approval: true },
    // which becomes an Asana approval task (Approve / Request changes / Reject).
    const name = typeof item === 'string' ? item : item.name;
    const data = { name };
    if (item && item.approval) data.resource_subtype = 'approval';
    try {
      await asanaFetch(`/tasks/${parentGid}/subtasks`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      }, 5000);
      created.push(name);
    } catch (err) {
      console.warn(`[asana-intake] subtask failed (${name}):`, err.message);
    }
  }
  return created.length;
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
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  // `v` is a deploy marker so a plain GET can confirm which revision is live.
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed', v: 2 });

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
    console.log(`[asana-intake] created task ${task.gid} (${requestType}, ${checklistCount} checklist items)`);
    return json(200, { ok: true, delivered: true, taskUrl: task.permalink_url || null });
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

    const hook = process.env.FALLBACK_WEBHOOK_URL;
    if (hook) {
      try {
        await fetch(hook, {
          method: 'POST',
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
      }
    }

    return json(503, { ok: false, delivered: false, fallback: true });
  }
};
