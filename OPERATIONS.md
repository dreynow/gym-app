# Rack — Project & Operations Guide

Single source of truth for what Rack is, how it's built, where it runs, and how
to operate it. (Product-facing overview lives in `README.md`; design system in
`design-system/BUILD.md`.)

> Contains AWS resource identifiers (not secrets). Keep the repo private if that
> matters to you.

---

## 1. What it is

Rack is a **local-first, offline-first strength + nutrition tracker** (PWA),
modelled on Hevy's fast logging loop but single-user, no account, no
subscription. All data lives on-device in IndexedDB; the app installs as a PWA
and works at the gym with no signal. An optional encrypted cloud backup and an
optional AI coach are the only things that touch the network.

- **Live app:** https://rack.daresunday.com
- **Repo:** `github.com/dreynow/gym-app`, working branch `claude/kind-clarke-exE3K`
- **AWS account:** `280012167843`, region `us-east-1`

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript + Vite 8 |
| Styling | Tailwind v4 (CSS-first theme tokens in `src/theme.css`) |
| Storage | IndexedDB via Dexie |
| PWA | `vite-plugin-pwa` (Workbox, autoUpdate) |
| Charts | Recharts |
| Icons | lucide-react (via `src/components/Icons.tsx` aliases) |
| Routing | Tiny built-in hash router (`src/lib/router.tsx`), no react-router |
| AI | Anthropic Messages API, called directly from the browser |
| Tests | Vitest (unit) + Playwright (e2e) — 49 unit, 29 e2e |

State for the active workout lives in React context; everything else reads
IndexedDB reactively via Dexie live queries.

---

## 3. Architecture: local-first

- **Source of truth is the device.** IndexedDB holds all workout + nutrition
  data. The app is fully functional offline.
- **No backend for core data.** The only network calls are: the AI coach
  (Anthropic API, user's own key) and cloud backup (user's own AWS endpoint).
- **Persistence.** `navigator.storage.persist()` is requested on load
  (`src/lib/storage.ts`) so the browser won't evict data. On iOS the real
  protection is **Add to Home Screen** (Safari evicts unused browser-tab storage
  after ~7 days; an installed PWA is exempt).
- **iOS caveat:** a Home-Screen PWA has **separate storage from the Safari tab**.
  Data does not carry over between them. Bridge via JSON export/import or cloud
  restore, then use one of them.

### Dexie schema (`src/db/db.ts`)

| Version | Tables added |
|---|---|
| v1 | `exercises`, `routines`, `sessions`, `bodyMetrics`, `settings`, `prs` |
| v2 | `coachMessages` (AI coach conversation) |
| v3 | `meals` |

---

## 4. Features

- **Routines** — create/edit/reorder/delete reusable programs; seeded with an
  Upper/Lower split.
- **Workout logging** — weight/reps/RPE/set-type, beat-your-last shown inline,
  auto-next set, one-tap repeat, rest timer (conic ring), plate calculator.
- **Exercise library** — searchable, muscle-group filter, custom exercises,
  archive (reachable from Settings; not a nav tab).
- **History** — finished sessions with duration/volume/PR badges; a
  **List / Calendar** toggle. Calendar shows trained days + week-streak stats
  (`src/lib/streaks.ts`).
- **Progress** — per-exercise charts (est 1RM / top set / volume) and a
  **Muscle groups** toggle: weekly hard sets per muscle (`src/lib/muscleVolume.ts`).
- **Body** — bodyweight / waist / body fat with trend charts.
- **Meals** — bottom-nav tab (replaced Library). Per-day meals (name, calories,
  protein) with running daily totals (`src/lib/meals.ts`).
- **PR detection** — heaviest weight, best est 1RM, best volume, auto-badged.
- **AI coach** — see §7.
- **Apple Health import** — see §8.
- **Backup** — JSON export/import (Settings → Your data) and encrypted cloud
  backup (§6). Both include all tables incl. meals + coach messages.
- **Styled confirm dialogs** — `src/components/ConfirmDialog.tsx` (`useConfirm`),
  replaced all native `window.confirm`.

---

## 5. Hosting & Deployment (the app)

Static PWA on **S3 + CloudFront**, custom domain via **Cloudflare DNS**.

### Resources

| Resource | Identifier |
|---|---|
| S3 (site) | `rack-app-280012167843` (private, OAC, no public access) |
| CloudFront | `E3ITMFSEAL4BIY` → `dvsu6d2zq5p1.cloudfront.net` |
| ACM cert | `rack.daresunday.com` (us-east-1, DNS-validated) |
| Domain | `rack.daresunday.com` (CNAME → CloudFront, **DNS-only / grey cloud**) |
| DNS | Cloudflare (no Route 53 on the account) |

### CI/CD (`.github/workflows/deploy.yml`)

On push to the branch: **test** (unit + e2e, gates everything) → **deploy**
(build root base → `aws s3 sync dist/` → CloudFront invalidate `/*`).

- Auth: scoped IAM user **`rack-app-deployer`** (S3 sync + CloudFront invalidate
  only), keys in repo secrets `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
- Build base path: **root** (`BASE_PATH` unset → `/`). The old `/gym-app/` Pages
  base is gone.
- GitHub Pages is **retired** (no longer deployed; old URL is stale).

### Manual deploy (if ever needed)

```bash
BASE_PATH=/ npm run build
aws s3 sync dist/ s3://rack-app-280012167843/ --delete
aws cloudfront create-invalidation --distribution-id E3ITMFSEAL4BIY --paths '/*'
```

---

## 6. Encrypted cloud backup

Single-user, passphrase-encrypted, **on the user's own AWS** — isolated from the
Kanoniv business stack.

### How it works

- Data is encrypted **on-device** with the passphrase: AES-GCM, key stretched
  via PBKDF2 (`src/lib/cloudBackup.ts`). The storage id is a SHA-256 of the
  passphrase, so the server only stores opaque ciphertext keyed by an
  unguessable id. No accounts.
- **Settings → Cloud backup**: endpoint URL + passphrase, Back up now / Restore.
- **Auto-backup** on app load, throttled to ~once a day (`src/main.tsx`).

### Backend (`infra/cloud-backup/`)

| Resource | Identifier |
|---|---|
| Endpoint | `https://xbih5t41wg.execute-api.us-east-1.amazonaws.com` |
| Lambda | `rack-backup` (nodejs20.x, `handler.handler`, env `BUCKET`) |
| API Gateway | HTTP API `xbih5t41wg` (CORS for the app origins) |
| S3 | `rack-backup-280012167843` (private, SSE-AES256) |
| IAM role | `rack-backup-lambda-role` (S3 Get/Put/List + logs) |

API: `POST` `{action:"put"|"get", id, blob}`.

> **Why API Gateway, not a Lambda Function URL:** the account blocks public
> auth-`NONE` function URLs (org SCP). Gotchas fixed: API GW needs an explicit
> `lambda:InvokeFunction` permission; the role needs `s3:ListBucket` or a missing
> key returns 403 instead of 404.

Update the handler:
```bash
cd infra/cloud-backup
zip -q /tmp/rack-backup.zip handler.mjs
aws lambda update-function-code --function-name rack-backup --region us-east-1 \
  --zip-file fileb:///tmp/rack-backup.zip
```

---

## 7. AI coach

In-app Claude chat that knows the user's data (`src/lib/coach.ts`,
`src/screens/CoachScreen.tsx`). Option A (backendless).

- **Key + model** in Settings, stored on-device only. Default `claude-opus-4-8`
  (Sonnet/Haiku options). Browser calls the Anthropic Messages API directly with
  `anthropic-dangerous-direct-browser-access`.
- **Context** (`assembleCoachContext`): training (muscle volume, est 1RMs, last
  15 sessions, routines), nutrition (today + 7-day avg calories/protein),
  bodyweight/waist/body-fat. Sent in a `cache_control` system block (prompt
  caching), so follow-ups are cheap.
- **Tool use:** `log_meal` — natural-language meal logging ("I had a chicken
  wrap"), estimates macros, saved only after the styled confirm dialog. Agentic
  loop in `CoachScreen.send` (stream → run tools w/ confirm → tool_result →
  repeat, capped at 4).
- **Conversation persists** in Dexie `coachMessages`.
- A Pro/Max **subscription cannot** power browser API calls (separate auth +
  ToS) and can't serve a phone, so a per-token API key is the path; cost is cents
  per chat.

---

## 8. Apple Health import

Settings → Apple Health. Streams `export.xml` (can be hundreds of MB) without
loading it whole — `Blob.slice` chunked reading (`src/lib/appleHealth.ts`), which
is also the mobile-safe path (iOS Safari `File.stream()` is unreliable). Shows a
progress %.

- Per workout: avg/max HR + active calories attach to the overlapping logged
  session.
- **Backfill** (on by default): workouts that overlap no session become
  standalone history sessions (date/duration/HR/calories, no lifts — Apple
  stores no set data), tagged `importedFrom: 'apple-health'` and bulk-removable.
- Bodyweight records merge into the Body log (one per day).
- Fixed: a real 824 MB export crashed the old whole-string read (V8 ~512 MB max
  string); BMI records were imported as bodyweight (substring vs exact type).

---

## 9. AWS resource inventory (account 280012167843, us-east-1)

| Purpose | Type | Name / ID |
|---|---|---|
| App hosting | S3 | `rack-app-280012167843` |
| App CDN/TLS | CloudFront | `E3ITMFSEAL4BIY` (`dvsu6d2zq5p1.cloudfront.net`) |
| App cert | ACM | `rack.daresunday.com` |
| App deploy auth | IAM user | `rack-app-deployer` |
| Backup compute | Lambda | `rack-backup` |
| Backup ingress | API Gateway HTTP API | `xbih5t41wg` |
| Backup storage | S3 | `rack-backup-280012167843` |
| Backup auth | IAM role | `rack-backup-lambda-role` |

DNS for `daresunday.com` (and `kanoniv.com`) is on **Cloudflare**; there are no
Route 53 hosted zones on the account.

---

## 10. Operations runbook

- **Deploy app:** push to the branch (CI does it) or run the manual deploy in §5.
- **Roll back app:** `git revert` + push, or re-sync a previous `dist/` to S3 +
  invalidate.
- **Update backup Lambda:** see §6.
- **Add a DNS record:** Cloudflare dashboard (no API token stored here). Records
  pointing at AWS should be **DNS-only (grey cloud)**.
- **Rotate deploy keys:** `aws iam create-access-key --user-name rack-app-deployer`,
  update repo secrets, delete the old key.
- **Secrets:** repo `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (deploy user).
  No app secrets are committed. The user's Anthropic key and backup passphrase
  live only on-device.

---

## 11. Testing

- **Unit (`npm test`)** — Vitest over pure logic: 1RM/volume maths, PR detection,
  plate calc, Apple Health parser, muscle volume, streaks, meals, backup crypto.
- **E2E (`npm run test:e2e`)** — Playwright drives the real app: logging loop,
  charts, settings, Apple Health import, muscle volume, calendar, meals, the AI
  coach (mocked SSE incl. the meal tool), and the cloud-backup round trip.
- Both gate the deploy in CI. `gotoHome` clears per-user tables via a DEV-only
  `window.__rackDb` handle so tests start clean.

---

## 12. Known constraints & gotchas

- Single-device by design (no multi-device sync). Cloud backup is for safety +
  migration, not live sync.
- Meal logging is manual or AI-estimated (no food database / barcode).
- iOS Home-Screen vs Safari storage isolation (§3).
- Account SCP blocks public Lambda Function URLs (§6).
- Pushing `.github/workflows/**` needs a `workflow`-scoped token; the `gh` token
  here only has `repo`.

---

## 13. Pending / roadmap

- **Double-progression helper** (hit top of rep range → suggest a weight bump;
  also a future coach tool).
- Optional **`backup.daresunday.com`** custom domain for the backup API.
- Food database / barcode for meals.
- Promote the coach's memory to a longer-term store if desired.
