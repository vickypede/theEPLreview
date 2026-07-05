# TheEPLReview – Firebase‑Only Build Plan (PC, Next.js + Firecrawl)

> Goal: Top‑6 refresh every **3h**; other 14 refresh every **6h**; **no API keys**; local Firecrawl Docker as primary HTML fallback; Firecrawl Cloud API as rare (\~3%) backup; Next.js on Firebase Hosting; domain on Cloudflare. Numbering uses 1.0, 1.1, 1.1.1, 1.1.1.1 etc.

---

## 1.0 Prereqs (Windows PC)

1.1 Install core tools

* 1.1.1 **Node.js 20+** (LTS).
* 1.1.2 **Git**.
* 1.1.3 **Docker Desktop** for Windows (enable **WSL2 backend**).
* 1.1.4 **Firebase CLI** (`npm i -g firebase-tools`).
* 1.1.5 Optional: **Google Cloud SDK** (for Cloud Scheduler auth setup via gcloud).

**Copy/paste (PowerShell) – installs**

```
# Node LTS + Git + Docker Desktop
winget install OpenJS.NodeJS.LTS -h --accept-source-agreements --accept-package-agreements
winget install Git.Git -h --accept-source-agreements --accept-package-agreements
winget install Docker.DockerDesktop -h --accept-source-agreements --accept-package-agreements

# Firebase CLI (after Node installs)
npm i -g firebase-tools

# (Optional) Google Cloud SDK
download https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe
```

1.2 Verify versions

* 1.2.1 `node -v`, `npm -v`, `git --version`.
* 1.2.2 `firebase --version`.
* 1.2.3 Docker: open Desktop → Settings → Resources: give at least **4 CPUs**, **6–8 GB RAM**.

**Copy/paste (PowerShell) – checks**

```
node -v
npm -v
git --version
firebase --version
```

1.3 Test Gate

* 1.3.1 Create folder `theeplreview` and `cd` into it → run `git init`.
* 1.3.2 Confirm Docker starts and WSL2 enabled.

**REMINDER: Check WSL2 backend in Docker Desktop Settings → General → Use WSL 2 based engine (should be checked)**

**Copy/paste (PowerShell)**

```
mkdir theeplreview
cd theeplreview
git init
```

* 1.3.1 Create folder `theeplreview` and `cd` into it → run `git init`.
* 1.3.2 Confirm Docker starts and WSL2 enabled.

---

## 2.0 Repository & Environments

2.1 New repo

* 2.1.1 Create a **private GitHub repo** `theeplreview` → clone locally.

**Copy/paste (PowerShell)**

```
# Replace <your-username>
git clone https://github.com/<your-username>/theeplreview.git
cd theeplreview
```

2.2 Workspace layout (top‑level)

* 2.2.1 `/app` – Next.js site.
* 2.2.2 `/functions` – Firebase Functions Gen2 (ingestion orchestrator).
* 2.2.3 `/infra` – Docker compose for Firecrawl, seed JSON, scripts.
* 2.2.4 `/docs` – notes, runbooks.

**Copy/paste (PowerShell)**

```
mkdir app
mkdir functions
mkdir infrairecrawl
mkdir docs
```

* 2.2.1 `/app` – Next.js site.
* 2.2.2 `/functions` – Firebase Functions Gen2 (ingestion orchestrator).
* 2.2.3 `/infra` – Docker compose for Firecrawl, seed JSON, scripts.
* 2.2.4 `/docs` – notes, runbooks.

2.3 Test Gate

* 2.3.1 Push an initial commit with empty folders.

---

## 3.0 Firebase Project Setup

3.1 Create Firebase project

* 3.1.1 In Firebase Console: New project `theeplreview`.
* 3.1.2 Enable **Firestore (Native mode)**, **Functions**, **Hosting**, **Authentication**.

3.2 CLI init in repo root

* 3.2.1 `firebase login` → pick the account.
* 3.2.2 `firebase use --add` → select your project and alias as `prod`.
* 3.2.3 `firebase init` → choose: **Hosting**, **Functions**, **Firestore**, **Emulators (optional)**.
* 3.2.4 Functions: language **TypeScript**, **Gen2**, ESLint yes, install deps yes.
* 3.2.5 Hosting: use existing project; we’ll enable SSR detection later (see 5.5).
* 3.2.6 Firestore rules & indexes: create default files.

**Copy/paste (PowerShell)**

```
firebase login
firebase use --add
firebase init firestore functions hosting emulators
```

**Prompts (press keys):**

* Functions → **TypeScript** (↑/↓ then **Space**), **Use Gen 2** → **Y**, ESLint → **Y**, install deps → **Y**.
* Hosting → **Use existing project**, set `app` as public dir later via web-frameworks (5.5).
* Emulators (optional) → Firestore + Functions.

3.3 Regions & timeouts

* 3.3.1 Choose a single region for Functions (e.g., `us-central1` or near you).
* 3.3.2 Plan Function timeouts: **20–25 min** for HTTP jobs (under Cloud Scheduler’s \~30‑min wait).
* 3.3.1 Choose a single region for Functions (e.g., `us-central1` or near you).
* 3.3.2 Plan Function timeouts: **20–25 min** for HTTP jobs (under Cloud Scheduler’s \~30‑min wait).

3.4 Test Gate

* 3.4.1 `firebase projects:list` shows your project.
* 3.4.2 `firebase deploy --only firestore:rules` succeeds (no breaking rules yet).

---

## 4.0 Firestore Data Model

4.1 Collections (initial)

* 4.1.1 `/clubs` (20 docs): `{ id, name, isTop6, names[], ambiguous[] }`.
* 4.1.2 `/sources`: `{ club, sourceName, url, type: 'rss'|'html', isActive, includePathRegex?, includeTitle?, excludeTitle?, lastFetchedAt?, failureCount }`.
* 4.1.3 `/articles` (docId = `urlHash`): `{ title, url, source, publishedAt?, snippet?, clubs[], createdAt }`.
* 4.1.4 `/ingestion_runs`: `{ startedAt, finishedAt, job, addedCount, skippedCount, disabledSources[], errors[] }`.
* 4.1.5 `/letters_submissions`: `{ userId, name, email, title, body, status, createdAt }`.

4.2 Indexes

* 4.2.1 `articles`: `publishedAt desc`.
* 4.2.2 `articles`: `clubs array-contains` + `publishedAt desc`.
* 4.2.3 `sources`: `isActive` + order by `lastFetchedAt`.

**Copy/paste – `firestore.indexes.json` minimal**

```
{
  "indexes": [
    {"collectionGroup": "articles","queryScope": "COLLECTION","fields": [{"fieldPath": "publishedAt","order": "DESCENDING"}]},
    {"collectionGroup": "articles","queryScope": "COLLECTION","fields": [
      {"fieldPath": "clubs","arrayConfig": "CONTAINS"},
      {"fieldPath": "publishedAt","order": "DESCENDING"}
    ]},
    {"collectionGroup": "sources","queryScope": "COLLECTION","fields": [
      {"fieldPath": "isActive","order": "ASCENDING"},
      {"fieldPath": "lastFetchedAt","order": "ASCENDING"}
    ]}
  ],
  "fieldOverrides": []
}
```

4.3 Security Rules (initial)

* 4.3.1 Public read for `/articles`.
* 4.3.2 Admin‑only read/write for `/sources` and `/ingestion_runs`.
* 4.3.3 Authenticated users can **create** `/letters_submissions`, **read** only their own docs.
* 4.3.4 Admin set via custom claim.

**Copy/paste – `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Public articles (read‑only)
    match /articles/{doc} {
      allow read: if true;
      allow write: if false;
    }

    // Admin‑only operational collections
    match /{colName}/{doc} where colName in ['sources','ingestion_runs','mailboxes','config'] {
      allow read, write: if request.auth.token.admin == true; // custom claim
    }

    // Clubs are readable; writes by admin only
    match /clubs/{doc} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }

    // Letters submissions
    match /letters_submissions/{doc} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth.token.admin == true;
    }
  }
}
```

**Deploy**

```
firebase deploy --only firestore
```

* 4.3.1 Public read for `/articles`.
* 4.3.2 Admin‑only read/write for `/sources` and `/ingestion_runs`.
* 4.3.3 Authenticated users can **create** `/letters_submissions`, **read** only their own docs.
* 4.3.4 Admin set via custom claim.

4.4 Test Gate

* 4.4.1 Use Firebase Console to add one `clubs` doc and one `sources` doc.
* 4.4.2 Verify rules block writing to `/articles` from client SDK (should be server‑only via Functions).

---

## 5.0 Next.js App (SSR/ISR on Firebase Hosting)

5.1 Scaffold

* 5.1.1 `cd app && npx create-next-app@latest .` (TypeScript, App Router).
* 5.1.2 `npm i firebase` (client SDK) and `npm i cross-fetch` if needed.

5.2 Firebase Web config

* 5.2.1 In Firebase Console → **Web App** → add app → copy config.
* 5.2.2 Put config in `.env.local` with NEXT\_PUBLIC\_ vars.

5.3 Basic pages

* 5.3.1 **Home**: query last 30 `articles` by `publishedAt desc`.
* 5.3.2 **Club** `/clubs/[slug]`: `where('clubs','array-contains',slug)` + `orderBy('publishedAt','desc')` + pagination.
* 5.3.3 Design: Inter font; palette: **#696D7D, #6F9283, #8D9F87, #CDC6A5**; copy = black.

5.4 ISR/SSR

* 5.4.1 Use `fetchCache`/`revalidate` for list pages (e.g., 300–600s) or use Server Actions that read Firestore.
* 5.4.2 Keep heavy admin pages behind auth (CSR is fine there).

5.5 Firebase Hosting integration

* 5.5.1 `firebase experiments:enable webframeworks`.
* 5.5.2 From repo root: `firebase init hosting` → **detect Next.js**.
* 5.5.3 Deploy test: `firebase deploy --only hosting` (will generate Functions for SSR automatically).

5.6 Test Gate

* 5.6.1 Open preview URL; Home renders (no articles yet = empty state).
* 5.6.2 Lighthouse quick check: page loads.

5.7 Deployment notes (what you should see)

- After deploy, it is normal to see only:
  "The EPL Review – Welcome to The EPL Review – Premier League news and analysis will appear here once the system is fully set up."
  This is expected until Step 12 (seed data) and Step 7 (ingestion) are completed.
- Hosting is configured via Web Frameworks: `firebase.json` has `hosting.source = "app"` (SSR function is auto‑generated).
- Firebase client is initialized only in the browser to avoid SSR build‑time errors; SSR shows a safe placeholder if Firestore isn’t accessible.
- You may see warnings about multiple lockfiles (repo root and `/app`). They’re harmless; optionally set Turbopack/Next root to silence them.
- Node version note: integration expects Node 16/18/20; deployed Functions use Node 20. Local Node 22 may show warnings.
- Deploy output should include a Hosting URL and an SSR Function name (e.g., `ssrtheeplreview18b04`).

---

## 6.0 Local Firecrawl (Docker) – Primary HTML Fallback

6.1 Files under `/infra/firecrawl/`

* 6.1.1 `.env`

```
PORT=3002
HOST=0.0.0.0
REDIS_URL=redis://redis:6379
BLOCK_MEDIA=true
NUM_WORKERS_PER_QUEUE=2
```

* 6.1.2 `docker-compose.yml`

```
services:
  redis:
    image: redis:7
    ports: ["6379:6379"]
  api:
    image: builderio/firecrawl:latest
    env_file: .env
    ports: ["3002:3002"]
    depends_on: [redis]
  worker:
    image: builderio/firecrawl:latest
    env_file: .env
    command: ["npm","run","start:worker"]
    depends_on: [redis]
```

6.2 Start & health‑check

* 6.2.1 `cd infra/firecrawl && docker compose up -d`.
* 6.2.2 Test: `curl -X POST http://localhost:3002/v2/scrape -H "Content-Type: application/json" -d '{"url":"https://example.com","formats":["links"]}'` → expect JSON.

6.2.3 Quick PowerShell setup (Windows)

```
# Create files
mkdir infra\firecrawl -Force

# .env
Set-Content infra\firecrawl\.env @"
PORT=3002
HOST=0.0.0.0
REDIS_URL=redis://redis:6379
BLOCK_MEDIA=true
NUM_WORKERS_PER_QUEUE=2
"@

# docker-compose.yml
Set-Content infra\firecrawl\docker-compose.yml @"
services:
  redis:
    image: redis:7
    ports: ["6379:6379"]
  api:
    image: builderio/firecrawl:latest
    env_file: .env
    ports: ["3002:3002"]
    depends_on: [redis]
  worker:
    image: builderio/firecrawl:latest
    env_file: .env
    command: ["npm","run","start:worker"]
    depends_on: [redis]
"@

cd infra\firecrawl
docker compose up -d

# Health check
curl -X POST http://localhost:3002/v2/scrape -H "Content-Type: application/json" -d '{"url":"https://example.com","formats":["links"]}'
```

6.2.4 Official repo self‑host (build locally)

```
# Clone upstream (kept inside infra/firecrawl/_upstream)
git clone https://github.com/firecrawl/firecrawl infra/firecrawl/_upstream

cd infra/firecrawl/_upstream

# Minimal .env (more keys optional per SELF_HOST.md)
Set-Content .env @"
PORT=3002
HOST=0.0.0.0
USE_DB_AUTHENTICATION=false
BULL_AUTH_KEY=CHANGEME
"@

# Build & start
docker compose build
docker compose up -d

# Health check
powershell -Command "$body = @{ url = 'https://example.com'; formats = @('links') } | ConvertTo-Json; Invoke-RestMethod -Method Post -Uri http://localhost:3002/v2/scrape -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 6"
```

[Official repo reference](https://github.com/firecrawl/firecrawl)
6.3 Test Gate

* 6.3.1 Confirm links array returns for a real football page (team hub).

---

## 7.0 Ingestion Orchestrator (Functions Gen2, HTTP)

7.1 Structure (in `/functions`)

* 7.1.1 `src/ingest/` with modules: `fetchers.ts`, `normalize.ts`, `classify.ts`, `store.ts`, `run.ts`.
* 7.1.2 Expose HTTP handlers: `runTop6`, `runOther14`, `healthz`.

7.2 Core settings

* 7.2.1 Runtime Node 20; region from 3.3.
* 7.2.2 Timeouts: **25 min**; memory: **1–2 GB**.
* 7.2.3 User‑Agent: `theeplreview-bot/1.0`.

7.3 Health‑check local Firecrawl

* 7.3.1 Small POST to `http://localhost:3002/v2/scrape` (3s timeout).
* 7.3.2 If fail → `LOCAL=false` for this run.

7.4 Fetch cascade per source

* 7.4.1 If `type='rss'`: fetch with 2s connect / 8s total; 2 retries with backoff+jitter.
* 7.4.2 If `type='html'`:

  * 7.4.2.1 If `LOCAL=true`: POST to local Firecrawl with `{formats:["links"]}`.
  * 7.4.2.2 Else (rare): POST to Firecrawl Cloud API (if key present), tiny concurrency.

7.4.3 Self‑reliant HTML ingestion (no Firecrawl)

We added a built‑in HTML path in the Function that can extract headlines and timestamps directly from most sites without JS rendering.

- How it works (in `functions/src/index.ts`)
  - Tries normal HTTP fetch of the page and parses OpenGraph/JSON‑LD/meta for: **title (headline)**, **site name**, **datePublished**.
  - Optional fallback (heavier): one‑time headless Chromium render (Puppeteer) to handle JS‑only pages.
  - Only stores: `title`, `url`, `sourceName`, `publishedAt`, `clubs[]` (copyright‑safe minimal data).

- Feature flags (env)
  - `USE_SELF_HTML=1` → prefer the self HTML renderer over Firecrawl for `type="html"` sources.
  - `ENABLE_HEADLESS=1` → allow Puppeteer fallback (use only if needed due to cold‑start/memory).

- Enabling flags in prod
  - Quick path (UI): Cloud Console → Cloud Run → select the `ingestRun` service → Edit & deploy new revision → add env vars `USE_SELF_HTML=1` (and optionally `ENABLE_HEADLESS=1`) → Deploy.
  - Alternative: hard‑enable in code by setting the default to on and redeploy (useful for testing).

- Notes
  - With `USE_SELF_HTML=1`, local Docker Firecrawl is dev‑only; the deployed Function does not call your laptop.
  - Keep `ENABLE_HEADLESS` off by default; turn on only for JS‑heavy sources.

7.5 Normalize & dedupe

* 7.5.1 Normalize URL: lowercase host, remove default ports, strip `utm_*`, `fbclid`.
* 7.5.2 `urlHash = SHA-256(normalizedUrl)`; use as `/articles/{urlHash}` ID (idempotent write).

**Copy/paste – `src/ingest/normalize.ts`**

```ts
import crypto from 'crypto';
export function normalizeUrl(raw: string) {
  const u = new URL(raw);
  u.hash = '';
  u.hostname = u.hostname.toLowerCase();
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) u.port = '';
  const params = u.searchParams;
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid'].forEach(p => params.delete(p));
  u.search = params.toString() ? `?${params.toString()}` : '';
  return u.toString();
}
export function hashUrl(nu: string) { return crypto.createHash('sha256').update(nu).digest('hex'); }
```

7.6 Club classification

* 7.6.1 **Source‑bound**: if the source URL is a team section, assign that club.
* 7.6.2 Else **path regex** then **title keywords** using `/clubs` dictionaries: `{ names[], ambiguous[] }`.
* 7.6.3 If multiple clubs match (derby), store both in `clubs[]`. If none → discard.

7.7 Store article

* 7.7.1 Store `{ title, url, source, publishedAt?, snippet? (RSS only), clubs[], createdAt }`.
* 7.7.2 Update source `lastFetchedAt` and `failureCount`.

7.8 Circuit breakers

* 7.8.1 If 10 consecutive failures or paywall/blocked detected → set `isActive=false`.
* 7.8.2 Per‑host concurrency cap = **1–2**; global cap configurable.

7.9 Run summary

* 7.9.1 Write `/ingestion_runs` with counts & errors.
* 7.9.2 If any club had **0 new items** across **two runs** → send alert (email or log for now).

7.10 Test Gate (local)

* 7.10.1 `firebase deploy --only functions` (or `firebase emulators:start` for Functions).
* 7.10.2 Manually hit `runTop6` via its HTTPS URL with a small seeded set (2 clubs × 2 sources).
* 7.10.3 Verify `articles` docs created; dedupe works on second run.

7.11 Test Gate (prod, self‑reliant HTML)

Use the deployed `ingestRun` URL printed after deploy. Example flows:

```
# 1) Enable self HTML (recommended minimal)
# Cloud Console → Cloud Run → ingestRun → Edit & deploy → add env:
#   USE_SELF_HTML=1

# 2) Optional JS fallback for tough pages
#   ENABLE_HEADLESS=1

# 3) Trigger ingestion (open in browser or curl)
# Replace with your function URL
curl -sS "https://<YOUR_INGESTRUN_URL>"

# 4) Verify
# Firebase Console → Firestore → /articles (new docs appear with title, url, sourceName, publishedAt)

# 5) Re‑run to confirm dedupe (same URLs should be upserts, not duplicates)
```

If you prefer Firecrawl in prod, set `FIRECRAWL_BASE_URL` to a reachable endpoint (Cloud/VM) and leave `USE_SELF_HTML` unset.

---

## 8.0 Cloud Scheduler (two jobs)

8.1 Create jobs
*(First deploy functions and copy the HTTPS URLs for `runTop6` and `runOther14` from the deploy output.)*

* 8.1.0 **Note:** The expressions `0 */3 * * *` and `0 */6 * * *` are **standard Unix cron** supported by **Google Cloud Scheduler**. They are **not** Supabase‑specific.
* 8.1.1 Job A (Top‑6): `0 */3 * * *` → target HTTPS URL of `runTop6`.
* 8.1.2 Job B (Other‑14): `0 */6 * * *` → target HTTPS URL of `runOther14`.

**Copy/paste – create with gcloud (replace placeholders)**

```
# Login & set project
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>

# Top-6 (every 3h)
gcloud scheduler jobs create http top6 \
  --schedule="0 */3 * * *" \
  --time-zone="America/Toronto" \
  --http-method=GET \
  --uri="https://<REGION>-<YOUR_PROJECT_ID>.cloudfunctions.net/runTop6" \
  --oidc-service-account-email=<YOUR_PROJECT_NUMBER>-compute@developer.gserviceaccount.com

# Other-14 (every 6h)
gcloud scheduler jobs create http other14 \
  --schedule="0 */6 * * *" \
  --time-zone="America/Toronto" \
  --http-method=GET \
  --uri="https://<REGION>-<YOUR_PROJECT_ID>.cloudfunctions.net/runOther14" \
  --oidc-service-account-email=<YOUR_PROJECT_NUMBER>-compute@developer.gserviceaccount.com

# To run a job immediately (for testing):
gcloud scheduler jobs run top6
gcloud scheduler jobs run other14
```

8.2 Auth for Scheduler

* 8.2.1 Easiest: allow unauthenticated invoke on these two endpoints (OK if URLs are not publicized).
* 8.2.2 Better: require auth and attach OIDC token from Scheduler’s service account.

8.3 Test Gate

* 8.3.1 Trigger “Run now” for each job; confirm ingestion\_runs created and articles inserted.
* 8.3.1 Trigger “Run now” for each job; confirm ingestion\_runs created and articles inserted.

---

### 8.4 48-hour article cleanup (TTL)

- Purpose: keep only fresh headlines; purge anything with `createdAt` older than 48h.
- Function: `cleanupOldArticles` (HTTP). It's exported from Functions and included in deploys.
- Behavior: queries `/articles` where `createdAt < now - 48h`, deletes in safe 500-doc batches.

Copy/paste – create daily cleanup job (04:00 Toronto)

```bash
gcloud scheduler jobs create http articles-cleanup \
  --location us-central1 \
  --schedule="0 4 * * *" \
  --time-zone="America/Toronto" \
  --http-method=GET \
  --uri="https://<REGION>-<YOUR_PROJECT_ID>.cloudfunctions.net/cleanupOldArticles" \
  --oidc-service-account-email=<YOUR_PROJECT_NUMBER>-compute@developer.gserviceaccount.com
```

Manual test

```powershell
# Replace with your deployed function URL
Invoke-RestMethod -Method Get -Uri "https://<REGION>-<YOUR_PROJECT_ID>.cloudfunctions.net/cleanupOldArticles" | ConvertTo-Json -Depth 6
```

Run now (via gcloud)

```bash
gcloud scheduler jobs run articles-cleanup --location us-central1
```

Notes
- Uses `createdAt` (insertion time) to determine age; this enforces a rolling 48h window of freshness.
- Safe to re-run; deletions are idempotent.

## 9.0 Authentication & Mailbox Form

9.1 Firebase Auth

* 9.1.1 Enable **Google** provider (and Email/Password if desired).
* 9.1.2 Add login UI in Next.js header.

9.2 “Contribute to the Mailbox”

* 9.2.1 Button checks `auth.currentUser`; if not signed in → prompt login.
* 9.2.2 Form fields: Name (prefill from profile), Email (prefill), Title (short subject), Body (textarea).
* 9.2.3 On submit → create `/letters_submissions` doc `{ userId, name, email, title, body, status:'pending', createdAt }`.

9.3 Mailbox moderation & daily publish (Mandatory)

* 9.3.1 **Submission cleaning & moderation**

  * 9.3.1.1 On submit, write `/letters_submissions` doc `{ userId, name, email, title, body, status:'pending', createdAt }`.
  * 9.3.1.2 A Cloud Function runs OpenAI **moderation** and profanity cleaning:

    * Remove swear words from `title` and `body` → save as `cleanTitle`, `cleanBody` (these are the only fields rendered publicly).
    * Optionally keep `rawBody` for audit (never rendered); set `profanityScore` and `moderationStatus: 'safe'|'needs_review'|'rejected'`.
    * Set final `status`: `'safe'` (eligible), `'rejected'` (never show), or `'needs_review'` (admin queue).
* 9.3.2 **Daily Mailbox edition object**

  * Create `/mailboxes/{editionDate}` (YYYY‑MM‑DD, America/Toronto):
    `{ editionDate, title, introBlurb, status:'draft'|'published', letterRefs:[], itemCount, createdAt, publishedAt }`.
  * Create `/config/mailbox`: `{ publishHour:'20:00', timezone:'America/Toronto', postPublishCutoverMinutes:10 }`.
* 9.3.3 **Admin curation** (\`/admin/mailbox\`)

  * Select **10–20** letters from the **safe** queue for `{editionDate}`; allow reorder.
  * Mark each selected submission with `selectedFor: editionDate`; update the Mailbox doc with `letterRefs` + `itemCount`.
* 9.3.4 **GPT intro blurb** (3–4 lines)

  * Compose a neutral, lively paragraph summarizing a few selected voices, using **first name** and **country if supplied** (no quotes from articles, no PII beyond what the user provided). Save to `introBlurb`; admin can edit.
* 9.3.5 **Publish job** (daily)

  * Cloud Scheduler triggers `publishMailbox` at `publishHour`.
  * Function validates 10–20 selections, then sets `/mailboxes/{editionDate}.status='published'` + `publishedAt=now()`.
  * Each selected submission is updated: `{ status:'published', editionDate, publishedAt }`.
* 9.3.6 **Cutover rule (10‑minute window)**

  * After publish, set `cutoverTs = publishedAt + postPublishCutoverMinutes` under `/config/mailbox`.
  * Any new submission with `createdAt > cutoverTs` is **auto‑assigned to the next day’s candidate pool**; earlier ones remain eligible only for the current edition.
* 9.3.7 **Rendering**

  * Public route `/mailbox/:editionDate` shows `introBlurb` + ordered list of published letters (render **cleanTitle/cleanBody**, with author first name and optional country).
* 9.3.8 **Test Gate**

  * Submit two letters: one **before** publish, one **15 min after**. Publish today’s edition (10–20 items). Confirm: the first can be selected for **today**; the second appears only in **tomorrow’s** queue. Verify swear words are removed in rendered output.
* 9.3.1 Cloud Function to call OpenAI moderation on submitted text; set status accordingly.
* 9.3.2 Only store safe outputs; never send full article content to GPT.

9.4 Test Gate

* 9.4.1 Log in, submit a test letter; verify it appears under your user in Firestore and is hidden from others.

---

## 10.0 Admin & Ops

10.1 Admin claims

* 10.1.1 Use Firebase Admin SDK in a one‑off script to set `admin: true` custom claim for your user.

10.2 Admin pages (behind auth)

* 10.2.1 `/admin/feeds`: list `/sources` with `lastFetchedAt`, `failureCount`, `isActive` toggle.
* 10.2.2 `/admin/runs`: list `/ingestion_runs` with filters; show errors.

10.3 Alerts & budgets

* 10.3.1 Set GCP budget alerts (email) at a low threshold.
* 10.3.2 Add a simple alert if two consecutive runs produce 0 items for any Top‑6 club.

10.4 Test Gate

* 10.4.1 Toggle a source off → confirm it’s skipped in next run.
* 10.4.2 View latest ingestion\_runs; errors show.

---

## 11.0 Cloudflare + Firebase Hosting (custom domain)

11.1 Connect domain

* 11.1.1 In Firebase Hosting → **Add custom domain** `theeplreview.com`.
* 11.1.2 Follow DNS prompts in the console: add the shown records in **Cloudflare**. Prefer **DNS‑only** initially (no proxy) to avoid caching conflicts.

11.2 www + redirects

* 11.2.1 Add `www` subdomain (CNAME) and set redirect to root or vice‑versa.
* 11.2.2 Confirm SSL status turns **Active** in Firebase.

11.3 Test Gate

* 11.3.1 Visit `https://theeplreview.com` → site loads via Firebase Hosting.

---

## 12.0 Seed Data & Scale‑Up

12.1 Seed clubs

* 12.1.1 Import `clubs.json` with all 20 clubs and their `names[]`/`ambiguous[]`.

**Copy/paste – seed script**

```ts
// functions/scripts/seed_clubs.ts
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import clubs from './clubs.json';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();
for (const [slug, data] of Object.entries(clubs as any)) {
  await db.collection('clubs').doc(slug).set({ id: slug, ...data, createdAt: new Date() }, { merge: true });
  console.log('upsert', slug);
}
console.log('done');
```

```json
// functions/scripts/clubs.json (complete)
{
  "arsenal": {"name": "Arsenal", "isTop6": true, "names": ["Arsenal","Gunners","AFC"], "ambiguous": []},
  "chelsea": {"name": "Chelsea", "isTop6": true, "names": ["Chelsea","Blues","CFC"], "ambiguous": []},
  "liverpool": {"name": "Liverpool", "isTop6": true, "names": ["Liverpool","Reds","LFC"], "ambiguous": []},
  "manchester-city": {"name": "Manchester City", "isTop6": true, "names": ["Manchester City","Man City","MCFC","City"], "ambiguous": ["City"]},
  "manchester-united": {"name": "Manchester United", "isTop6": true, "names": ["Manchester United","Man United","Man Utd","United","MUFC"], "ambiguous": ["United"]},
  "tottenham": {"name": "Tottenham Hotspur", "isTop6": true, "names": ["Tottenham","Tottenham Hotspur","Spurs","THFC"], "ambiguous": []},
  "aston-villa": {"name": "Aston Villa", "isTop6": false, "names": ["Aston Villa","Villa","AVFC"], "ambiguous": ["Villa"]},
  "brighton": {"name": "Brighton & Hove Albion", "isTop6": false, "names": ["Brighton","Brighton & Hove Albion","Seagulls","BHAFC"], "ambiguous": []},
  "burnley": {"name": "Burnley", "isTop6": false, "names": ["Burnley","Clarets","BFC"], "ambiguous": []},
  "crystal-palace": {"name": "Crystal Palace", "isTop6": false, "names": ["Crystal Palace","Palace","CPFC"], "ambiguous": ["Palace"]},
  "everton": {"name": "Everton", "isTop6": false, "names": ["Everton","Toffees","EFC"], "ambiguous": []},
  "fulham": {"name": "Fulham", "isTop6": false, "names": ["Fulham","Cottagers","FFC"], "ambiguous": []},
  "luton": {"name": "Luton Town", "isTop6": false, "names": ["Luton","Luton Town","Hatters","LTFC"], "ambiguous": ["Luton"]},
  "newcastle": {"name": "Newcastle United", "isTop6": false, "names": ["Newcastle","Newcastle United","Magpies","NUFC"], "ambiguous": ["Newcastle"]},
  "nottingham-forest": {"name": "Nottingham Forest", "isTop6": false, "names": ["Nottingham Forest","Forest","NFFC"], "ambiguous": ["Forest"]},
  "sheffield-united": {"name": "Sheffield United", "isTop6": false, "names": ["Sheffield United","Sheff Utd","Blades","SUFC"], "ambiguous": ["United"]},
  "west-ham": {"name": "West Ham United", "isTop6": false, "names": ["West Ham","West Ham United","Hammers","WHUFC"], "ambiguous": ["West Ham"]},
  "wolves": {"name": "Wolverhampton Wanderers", "isTop6": false, "names": ["Wolves","Wolverhampton","Wolverhampton Wanderers","WWFC"], "ambiguous": ["Wolves"]},
  "brentford": {"name": "Brentford", "isTop6": false, "names": ["Brentford","Bees","BFC"], "ambiguous": []},
  "bournemouth": {"name": "AFC Bournemouth", "isTop6": false, "names": ["Bournemouth","AFC Bournemouth","Cherries","AFCB"], "ambiguous": ["Bournemouth"]}
}
```

**Run**

```
cd functions
npm i -D tsx firebase-admin
npx tsx scripts/seed_clubs.ts
```

12.2 Seed sources

* 12.2.1 Prepare a JSON file listing your sources (Top‑6 and Other‑14). Use **club‑bound** pages where possible.

**REMINDER: Research and collect actual RSS feeds and team website URLs for each club before creating sources.json**

**Copy/paste – `functions/scripts/sources.json` (template)**

```json
{
  "top6": [
    { "club": "arsenal", "sourceName": "Example – Arsenal", "url": "https://example.com/football/teams/arsenal", "type": "html", "isActive": true },
    { "club": "chelsea", "sourceName": "Example – Chelsea", "url": "https://example.com/football/teams/chelsea", "type": "html", "isActive": true }
  ],
  "other14": [
    { "club": "aston-villa", "sourceName": "Example – Villa", "url": "https://example.com/football/teams/aston-villa", "type": "html", "isActive": true }
  ],
  "general": [
    { "club": "arsenal", "sourceName": "Example – Football (All)", "url": "https://example.com/football", "type": "html", "isActive": true,
      "includePathRegex": "/arsenal|/teams/arsenal",
      "includeTitle": ["Arsenal","Gunners","AFC"],
      "excludeTitle": ["Chelsea","Manchester City","Tottenham","Liverpool","Manchester United","Everton"] }
  ]
}
```

**Copy/paste – seed script**

```ts
// functions/scripts/seed_sources.ts
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import payload from './sources.json';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function upsert(list: any[]) {
  for (const s of list) {
    const ref = db.collection('sources').doc();
    await ref.set({
      club: s.club,
      sourceName: s.sourceName,
      url: s.url,
      type: s.type,
      isActive: s.isActive ?? true,
      includePathRegex: s.includePathRegex ?? null,
      includeTitle: s.includeTitle ?? null,
      excludeTitle: s.excludeTitle ?? null,
      failureCount: 0,
      createdAt: new Date()
    });
    console.log('upserted', s.sourceName);
  }
}

(async () => {
  await upsert((payload as any).top6 || []);
  await upsert((payload as any).other14 || []);
  await upsert((payload as any).general || []);
  console.log('done');
})();
```

**Run**

```
cd functions
npx tsx scripts/seed_sources.ts
```

12.3 Test Gate

* 12.3.1 Run `runTop6` → expect new articles.
* 12.3.2 Run `runOther14` → expect new articles.
* 12.3.1 Run `runTop6` → expect new articles.
* 12.3.2 Run `runOther14` → expect new articles.

---

## 13.0 Optional: Firecrawl Cloud API (\~3%)

13.1 Enable only if needed

* 13.1.1 Add `FIRECRAWL_CLOUD_KEY` to Functions env.
* 13.1.2 Use **very low `maxConcurrency`** (2–3) and/or batch small sets.
* 13.1.3 Log how often cloud fallback is used.

13.2 Test Gate

* 13.2.1 Temporarily stop local Docker; force one HTML source; confirm Cloud API kicks in and inserts links.

---

## 14.0 QA & Launch Checklist

14.1 Functional

* 14.1.1 Dedupe works (same URL not re‑inserted).
* 14.1.2 Classification puts articles on correct Club pages (spot‑check derbies).

14.2 Performance

* 14.2.1 Ingestion for Top‑6 finishes within the 25‑min timeout.
* 14.2.2 Frontend Home/Club LCP good on mobile.

14.3 Legal & safety

* 14.3.1 Only store **title + URL (+ publisher + optional RSS snippet)**.
* 14.3.2 Respect robots for HTML fallback.

14.4 Monitoring

* 14.4.1 ingestion\_runs stable; error rate <20%; zero 500s in logs.

14.5 Go‑live

* 14.5.1 Turn on both Scheduler jobs.
* 14.5.2 24‑hour soft launch; watch logs and budgets.

---

## 16.0 Supabase Rev‑D Parity (+ Phase‑1 upgrades)

16.1 Phase‑1 essentials we’re adding **now** (moved up from Phase‑2)

* 16.1.1 **User profiles (auto‑provision on first login)** – required for Mailbox and future badges.

  * 16.1.1.1 Create `/user_profiles/{uid}` on first auth.
    **Copy/paste – Next.js client hook**

  ```ts
  // app/lib/useEnsureProfile.ts
  import { getAuth, onAuthStateChanged } from 'firebase/auth';
  import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
  const auth = getAuth(); const db = getFirestore();
  export function useEnsureProfile(){
    onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      const ref = doc(db, 'user_profiles', u.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          displayName: u.displayName || '',
          email: u.email || '',
          marketingOptIn: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    });
  }
  ```

  * 16.1.1.2 **Rules** already included in 16.3 (user can read/write their own profile).

* 16.1.2 **Mailbox form constraints (enforced)**

  * 16.1.2.1 **Email**: prefilled from profile and **read‑only** in UI; server writes must match `auth.token.email` (defence‑in‑depth).
  * 16.1.2.2 **Name**: prefilled from profile but **editable** per‑submission (stored on the letter doc alongside `userId`).
    **Copy/paste – form snippet (React)**

  ```tsx
  <input name="email" value={profile.email} readOnly className="opacity-70 cursor-not-allowed" />
  <input name="name" defaultValue={profile.displayName || ''} />
  ```

  **Copy/paste – server check (Functions)**

  ```ts
  // before creating /letters_submissions
  if (authedEmail && authedEmail !== payload.email) throw new Error('Email must match signed-in user');
  ```

* 16.1.3 **FT webhook (Now)** – trigger an immediate refresh for a single club (e.g., right after full‑time).
  **Copy/paste – set secret**

  ```
  firebase functions:secrets:set FT_REFRESH_SECRET
  ```

  **Copy/paste – function**

  ```ts
  // functions/src/ft.ts
  import { onRequest } from 'firebase-functions/v2/https';
  import { defineSecret } from 'firebase-functions/params';
  import { runJob } from './ingest/run';
  const FT_REFRESH_SECRET = defineSecret('FT_REFRESH_SECRET');
  export const refreshClubNow = onRequest({ secrets:[FT_REFRESH_SECRET], timeoutSeconds: 900 }, async (req, res) => {
    const token = req.header('x-ft-secret');
    if (token !== FT_REFRESH_SECRET.value()) return res.status(401).send('unauthorized');
    const club = (req.query.club as string)||''; if(!club) return res.status(400).send('club=? required');
    const result = await runJob({ group:'single', club });
    res.status(200).json({ ok:true, club, result });
  });
  ```

  **Copy/paste – test call**

  ```bash
  curl -X POST "https://<REGION>-<PROJECT>.cloudfunctions.net/refreshClubNow?club=chelsea" \
    -H "x-ft-secret: <YOUR_SECRET>"
  ```

* 16.1.4 **Live data panels (free APIs)** – lightweight widgets for **Table / Top Scorers / Fixtures** on Home. Use free‑tier keys; if keys absent, hide panels.

  * **Recommended sources** (choose one primary, one backup):

    * **Football‑Data.org** – standings & scorers for EPL; free tier with API key. Endpoints like `/v4/competitions/PL/standings` and `/v4/competitions/PL/scorers`.
    * **API‑Football (free plan)** – 100 req/day incl. standings, fixtures, live scores, top scorers.
    * **TheSportsDB** – free key; fixtures/standings artwork; good backup.
    * **Scorebat** – free highlights feed (video embeds) for EPL; optional sidebar.
  * **Server fetch (ISR‑friendly) example**

  ```ts
  // app/lib/epl.ts (server)
  export async function getEplTable() {
    const r = await fetch('https://api.football-data.org/v4/competitions/PL/standings', {
      headers: { 'X-Auth-Token': process.env.FD_API_KEY! }, next: { revalidate: 600 }
    });
    if (!r.ok) return null; return r.json();
  }
  ```

  * **Env secret (Functions)**: set `FD_API_KEY` (or `APIFOOTBALL_KEY` / `THESPORTSDB_KEY`) as a **Functions secret** so Next.js SSR can read it at runtime. Panels auto‑hide if missing.
    **Copy/paste**

  ```
  firebase functions:secrets:set FD_API_KEY
  # or
  firebase functions:secrets:set APIFOOTBALL_KEY
  firebase functions:secrets:set THESPORTSDB_KEY
  ```

16.2 Firestore collections (additions)

* 16.2.1 **`/user_profiles/{uid}`**

```
{ displayName: string,
  email: string,
  favoriteClub: string|null,   // new: stored slug from /clubs (e.g., 'chelsea')
  marketingOptIn: boolean,
  createdAt: ts,
  updatedAt: ts }
```

{ displayName: string, email: string, marketingOptIn: boolean, createdAt: ts, updatedAt: ts }

```
- 16.2.2 **`/contributors/{id}`** (Phase‑2)
```

{ email: string, userId: string|null, firstPublishedAt: ts|null, lastPublishedAt: ts|null, createdAt: ts }

```
  • Derived stats stored at **`/contributors/{id}/stats/summary`** → `{ publishCount: number }` (maintained by a scheduled function).
- 16.2.3 **`/clubs/{slug}`** – extend existing docs
```

{ shortCode: 'CHE', crestUrl: string|null, isActive: boolean }

```
- 16.2.4 **`/articles/{urlHash}`** – extend existing docs
```

{ snippet: string|null, thumbnail: string|null }

```
- 16.2.5 **`/letters/{id}/likes/{uid}`** (subcollection)
```

{ createdAt: ts }

```
  • Also keep `likesCount` on the parent `letters/{id}` (incremented/decremented by Function).
- 16.2.6 **`/badges/{code}`** & **`/badge_awards/{awardId}`**
```

/badges/{code}:   { code, name, iconUrl, description }
/badge\_awards/{awardId}: { userId, badgeCode, awardedAt }

```
- 16.2.7 **Comments**
```

/letters/{id}/comments/{cid}: { userId, body, createdAt }
/posts/{id}/comments/{cid}:   { userId, body, createdAt }

```

16.3 Security Rules (add to `firestore.rules`)
```

// Profiles (user can read their own, write limited fields)
match /user\_profiles/{uid} {
allow read: if request.auth != null && request.auth.uid == uid;
allow write: if request.auth != null && request.auth.uid == uid;
}

// Contributors – admin only for now
match /contributors/{id} { allow read, write: if request.auth.token.admin == true; }
match /contributors/{id}/stats/{doc} { allow read: if request.auth.token.admin == true; allow write: if false; }

// Clubs – public read; admin write
match /clubs/{doc} { allow read: if true; allow write: if request.auth.token.admin == true; }

// Articles – public read; server writes only (unchanged)
match /articles/{doc} { allow read: if true; allow write: if false; }

// Letters – public read after publish, author read own draft, admin write
match /letters/{id} {
allow read: if resource.data.status == 'published' || (request.auth != null && request.auth.uid == resource.data.userId) || request.auth.token.admin == true;
allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
allow update, delete: if request.auth.token.admin == true;
}

// Likes – user can like/unlike exactly one doc under their UID
match /letters/{id}/likes/{uid} {
allow read: if true;
allow create, delete: if request.auth != null && request.auth.uid == uid;
allow update: if false;
}

// Comments – author or admin can delete; all authed can create
match /letters/{id}/comments/{cid} {
allow read: if true;
allow create: if request.auth != null;
allow delete: if request.auth != null && (request.auth.token.admin == true || request.auth.uid == resource.data.userId);
allow update: if false;
}
match /posts/{id}/comments/{cid} {
allow read: if true;
allow create: if request.auth != null;
allow delete: if request.auth != null && (request.auth.token.admin == true || request.auth.uid == resource.data.userId);
allow update: if false;
}

// Badges & awards – public read; admin write
match /badges/{code} { allow read: if true; allow write: if request.auth.token.admin == true; }
match /badge\_awards/{doc} { allow read: if request.auth != null && request.auth.uid == resource.data.userId || request.auth.token.admin == true; allow write: if request.auth.token.admin == true; }

```
**Deploy**
```

firebase deploy --only firestore\:rules

```

16.4 Indexes (add to `firestore.indexes.json`)
```

{
"indexes": \[
{"collectionGroup":"letters","queryScope":"COLLECTION","fields":\[{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"publishedAt","order":"DESCENDING"}]},
{"collectionGroup":"articles","queryScope":"COLLECTION","fields":\[{"fieldPath":"clubs","arrayConfig":"CONTAINS"},{"fieldPath":"publishedAt","order":"DESCENDING"}]},
{"collectionGroup":"badge\_awards","queryScope":"COLLECTION","fields":\[{"fieldPath":"userId","order":"ASCENDING"},{"fieldPath":"awardedAt","order":"DESCENDING"}]}
]
}

```
**Deploy**
```

firebase deploy --only firestore\:indexes

````

16.5 Functions (mix of Now + Phase‑2)
- 16.5.1 **`toggleLetterLike(letterId)`** (HTTPS) – Phase‑2: upsert/delete `/letters/{id}/likes/{uid}` then atomically update `likesCount` on parent.
- 16.5.2 **`recomputeBadges`** (scheduled daily 01:00 Toronto) – Phase‑2 rules in 16.5.2 earlier version.
- 16.5.3 **`publishScheduledPosts`** – Phase‑2, every 5 min.
- 16.5.4 **`refreshClubNow`** – **Now** (see 16.1.3 for code & curl).

16.6 Display toggles (unchanged)
- 16.6.1 **No‑image mode (default)**; 16.6.2 **Card mode** behind env flag.

16.7 Migration steps (unchanged)
- 16.7.1 Augment clubs, 16.7.2 Backfill article fields, 16.7.3 Seed badges.

16.8 Test gates (extended)
- 16.8.1 **Profiles** auto‑create on login; profile doc appears with email.
- 16.8.2 **Mailbox form**: email read‑only & matches auth; name editable; submit succeeds; moderation runs.
- 16.8.3 **FT webhook**: invoke `refreshClubNow` for two different clubs; verify articles append; rate‑limit respected.
- 16.8.4 **Live data panels**: with `FD_API_KEY` set, display EPL table + top scorers; remove the env → panels hide gracefully.

## 16.9 UI Components (copy/paste)

16.9.1 **EPL Table panel** (uses `getEplTable()`)
```tsx
// app/components/EplTable.tsx (Server Component)
import { getEplTable } from '@/lib/epl';

export default async function EplTable() {
  const data = await getEplTable();
  if (!data) return <div className="p-4 rounded-2xl bg-[#CDC6A5]/20">Table unavailable.</div>;
  const table = data.standings?.[0]?.table ?? [];
  return (
    <div className="p-4 rounded-2xl bg-white shadow">
      <h2 className="text-xl font-semibold mb-3" style={{color:'#696D7D'}}>Premier League Table</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="py-2 pr-2">Pos</th>
              <th className="py-2 pr-2">Club</th>
              <th className="py-2 pr-2">P</th>
              <th className="py-2 pr-2">W</th>
              <th className="py-2 pr-2">D</th>
              <th className="py-2 pr-2">L</th>
              <th className="py-2 pr-2">GD</th>
              <th className="py-2 pr-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row: any) => (
              <tr key={row.team.id} className="border-b hover:bg-[#8D9F87]/10">
                <td className="py-2 pr-2">{row.position}</td>
                <td className="py-2 pr-2">{row.team.shortName || row.team.name}</td>
                <td className="py-2 pr-2">{row.playedGames}</td>
                <td className="py-2 pr-2">{row.won}</td>
                <td className="py-2 pr-2">{row.draw}</td>
                <td className="py-2 pr-2">{row.lost}</td>
                <td className="py-2 pr-2">{row.goalDifference}</td>
                <td className="py-2 pr-2 font-semibold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
````

**Use it on Home**

```tsx
// app/page.tsx
import EplTable from '@/components/EplTable';
export default function Home(){
  return (
    <main className="space-y-6">
      {/* Headlines list here */}
      <EplTable />
    </main>
  );
}
```

16.9.2 **Firebase client init** (for profile screen & form writes)

```ts
// app/lib/firebaseClient.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Paste your web app config from Firebase Console
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

16.9.3 **Profile screen** – name/email + favorite club dropdown

```tsx
// app/profile/page.tsx (Client Component)
'use client';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';

export default function ProfilePage(){
  const [user,setUser]=useState<any>(null);
  const [profile,setProfile]=useState<any>(null);
  const [clubs,setClubs]=useState<any[]>([]);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async (u)=>{
      setUser(u);
      if(!u) return;
      // ensure profile exists
      const pref = doc(db,'user_profiles',u.uid);
      const snap = await getDoc(pref);
      if(!snap.exists()){
        await setDoc(pref,{ displayName:u.displayName||'', email:u.email||'', favoriteClub:null, marketingOptIn:false, createdAt:new Date(), updatedAt:new Date() });
      }
      setProfile((await getDoc(pref)).data());
    });
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    (async()=>{
      const q = query(collection(db,'clubs'), orderBy('name'));
      const s = await getDocs(q);
      setClubs(s.docs.map(d=>({ id:d.id, ...(d.data() as any) })));
    })();
  },[]);

  const signIn=async()=>{ await signInWithPopup(auth, new GoogleAuthProvider()); };

  const save=async()=>{
    if(!user) return;
    setSaving(true);
    const pref = doc(db,'user_profiles',user.uid);
    await updateDoc(pref,{ displayName: profile.displayName||'', favoriteClub: profile.favoriteClub||null, updatedAt:new Date() });
    setSaving(false);
    alert('Saved');
  };

  if(!user) return (
    <main className="p-6">
      <h1 className="text-2xl mb-4" style={{color:'#696D7D'}}>Profile</h1>
      <button onClick={signIn} className="px-4 py-2 rounded-2xl" style={{background:'#6F9283',color:'#fff'}}>Sign in with Google</button>
    </main>
  );

  if(!profile) return <main className="p-6">Loading…</main>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl" style={{color:'#696D7D'}}>Profile</h1>
      <div className="grid gap-3 max-w-md">
        <label className="text-sm">Email</label>
        <input value={profile.email||''} readOnly className="border rounded-2xl p-2 opacity-70 cursor-not-allowed" />
        <label className="text-sm">Name</label>
        <input defaultValue={profile.displayName||''} onChange={e=>setProfile({...profile, displayName:e.target.value})} className="border rounded-2xl p-2" />
        <label className="text-sm">Favourite club</label>
        <select value={profile.favoriteClub||''} onChange={e=>setProfile({...profile, favoriteClub:e.target.value||null})} className="border rounded-2xl p-2">
          <option value="">Select club…</option>
          {clubs.map(c=> (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <button disabled={saving} onClick={save} className="mt-2 px-4 py-2 rounded-2xl" style={{background:'#6F9283',color:'#fff'}}>{saving?'Saving…':'Save'}</button>
      </div>
    </main>
  );
}
```

16.9.4 **Mailbox form (UI constraint reminder)** – email read‑only, name editable

```tsx
// Example: app/mailbox/page.tsx (snippet)
<input name="email" value={profile.email} readOnly className="opacity-70 cursor-not-allowed" />
<input name="name" defaultValue={profile.displayName || ''} />
```

---

## 17.0 Editorial Products System (Posts)

17.1 Overview

* 17.1.1 We’ll store all long‑form/editorial pieces in a single **`/posts`** collection with a `product` type.
* 17.1.2 **Live News** uses a separate **`/live_streams`** collection with an `items` subcollection for rapid short blurbs during matches or breaking events.
* 17.1.3 **Mailbox** is already covered (Section 9); it remains separate.

17.2 Products & routing

* 17.2.1 **Live News** → `/live/:streamId` (real‑time list of blurbs; can be “upgraded” into a summary post later).
* 17.2.2 **Final Whistle** (weekend conclusions) → `/final-whistle/:editionDate`.
* 17.2.3 **Matchday Radar** (weekend preview) → `/matchday-radar/:editionDate`.
* 17.2.4 **Full‑Time Verdict** (big‑match review \~2h after FT) → `/full-time-verdict/:matchId` or `/full-time-verdict/:slug`.
* 17.2.5 **Pretender List** (Fraud Watch) → `/pretender-list/:editionDate`.
* 17.2.6 **High Press** (house take/opinion) → `/high-press/:slug`.

17.3 Firestore schema

* 17.3.1 **`/posts`** (one doc per article)

```
{
  product: 'final_whistle'|'matchday_radar'|'full_time_verdict'|'pretender_list'|'high_press',
  title: string,
  slug: string,                // unique per product
  dek: string|null,            // short subhead
  body: string,                // markdown or MDX (start with markdown)
  clubs: string[],             // slugs of clubs featured
  tags: string[],              // e.g., ['tactics','var','injury']
  matchId: string|null,        // only for full_time_verdict
  editionDate: string|null,    // YYYY-MM-DD for weekly/dated products
  status: 'draft'|'scheduled'|'published',
  scheduledAt: timestamp|null,
  publishedAt: timestamp|null,
  author: { id:string|null, name:string },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

* 17.3.2 **`/live_streams`** (meta)

```
{
  title: string,                       // e.g., Arsenal v Chelsea – Live News
  clubs: string[],                     // involved clubs
  matchId: string|null,
  status: 'live'|'paused'|'closed',
  startedAt: timestamp,
  closedAt: timestamp|null,
  createdAt: timestamp
}
```

* 17.3.3 **`/live_streams/{id}/items`** (short blurbs)

```
{
  body: string,              // short blurb (<= 300 chars)
  author: { id:string|null, name:string },
  createdAt: timestamp,
  pinned: boolean,
  tags: string[]             // e.g., ['goal','sub','injury','var','breaking']
}
```

* 17.3.4 **Upgrade path**: A Cloud Function can **compose a summary** from the last N `items` into a new `/posts` doc (e.g., convert a Live News stream into a **Full‑Time Verdict** or add a “Key Moments” appendix to **Final Whistle**).

17.4 Indexes (add to `firestore.indexes.json`)

```
{
  "indexes": [
    {"collectionGroup": "posts","queryScope":"COLLECTION","fields":[{"fieldPath":"product","order":"ASCENDING"},{"fieldPath":"publishedAt","order":"DESCENDING"}]},
    {"collectionGroup": "posts","queryScope":"COLLECTION","fields":[{"fieldPath":"clubs","arrayConfig":"CONTAINS"},{"fieldPath":"publishedAt","order":"DESCENDING"}]},
    {"collectionGroup": "live_streams","queryScope":"COLLECTION","fields":[{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"startedAt","order":"DESCENDING"}]}
  ]
}
```

**Deploy**

```
firebase deploy --only firestore:indexes
```

17.5 Security Rules (extend `firestore.rules`)

```
// Public read for editorial posts & live streams
match /posts/{doc} { allow read: if true; allow write: if request.auth.token.admin == true; }
match /live_streams/{doc} { allow read: if true; allow write: if request.auth.token.admin == true; }
match /live_streams/{doc}/items/{item} { allow read: if true; allow write: if request.auth.token.admin == true; }
```

**Deploy**

```
firebase deploy --only firestore:rules
```

17.6 Admin flow (Next.js pages under `/admin`)

* 17.6.1 **Compose posts**: create drafts in `/posts`; select `product`, add `title`, `dek`, `body`, `clubs`, (and `matchId` or `editionDate` when relevant).
* 17.6.2 **Schedule/publish**: set `status='scheduled'` with `scheduledAt`; a Function promotes to `published` when time hits (Cloud Scheduler every 5 min).
* 17.6.3 **Live News**: create `/live_streams` doc with `status='live'`; writers add `items` (blurbs). On FT: set `status='closed'` and optionally run **Upgrade to Verdict** action to draft a `full_time_verdict` post using recent items.

17.7 Cloud Functions for editorial ops

* 17.7.1 `publishScheduledPosts` (HTTP or scheduled every 5 min): queries `/posts` where `status='scheduled' && scheduledAt <= now()` and sets `status='published', publishedAt=now()`.
* 17.7.2 `upgradeLiveStreamToVerdict` (HTTP): takes `streamId`, creates `/posts` with `product='full_time_verdict'`, pulls last N items, writes a **Key Moments** section into `body` (markdown).
* 17.7.3 **Optional GPT assist**: summarize top 6–8 items into a 3–4 sentence intro for the Verdict draft (admin can edit).

17.8 Next.js routing (App Router)

* 17.8.1 `/final-whistle/[editionDate]`, `/matchday-radar/[editionDate]` → query by `product` + `editionDate`.
* 17.8.2 `/full-time-verdict/[slug]` (or `[matchId]`) → query by slug or matchId.
* 17.8.3 `/pretender-list/[editionDate]` and `/high-press/[slug]`.
* 17.8.4 `/live/[streamId]` → live SSR/ISR with client hydration to poll or listen to `items` subcollection.

17.9 Testing gates

* 17.9.1 Create one post per product with dummy data; verify public read and admin‑only write.
* 17.9.2 Create a `live_streams` doc; add 3 `items`; confirm they render in real‑time; close stream.
* 17.9.3 Run `publishScheduledPosts` manually; confirm scheduled→published flip and routes render via ISR.
* 17.9.4 Run `upgradeLiveStreamToVerdict`; confirm a draft post is created with a “Key Moments” section.

---

## 15.0 Appendices

15.1 clubs.json (shape)

```
{
  "arsenal": {"name": "Arsenal", "isTop6": true, "names": ["Arsenal","Gunners","AFC"], "ambiguous": []},
  "manchester-city": {"name": "Manchester City", "isTop6": true, "names": ["Manchester City","Man City","MCFC"], "ambiguous": ["City"]}
  // ... add all 20
}
```

15.2 sources.json (two shapes)

```
{
  "club": "arsenal",
  "sourceName": "Example – Arsenal",
  "url": "https://example.com/football/teams/arsenal",
  "type": "html",
  "isActive": true
}
```

```
{
  "club": "arsenal",
  "sourceName": "Example – Football (All)",
  "url": "https://example.com/football",
  "type": "html",
  "isActive": true,
  "includePathRegex": "/arsenal|/teams/arsenal",
  "includeTitle": ["Arsenal","Gunners","AFC"],
  "excludeTitle": ["Chelsea","Manchester City","Tottenham","Liverpool","Manchester United","Everton"]
}
```

15.3 Minimal fetcher pseudo‑code

```
for each source in batch:
  body = null
  if source.type == 'rss': body = fetchRss(source.url)
  else:
    if LOCAL: body = firecrawlLocalLinks(source.url)
    else: body = firecrawlCloudLinks(source.url) // rare
  links = extractLinks(body)
  for each link in links:
    nu = normalize(link.url)
    hash = sha256(nu)
    clubs = classify(link, source, clubDict)
    if clubs.length == 0: continue
    upsert /articles/{hash}
```

15.4 Testing snippets

* Trigger Top‑6: hit HTTPS URL of `runTop6` in the browser; watch Firestore update live.
* End‑to‑end: stop Docker → confirm RSS still ingests; restart Docker → confirm HTML fallback resumes.

---

