# ATS job ingestion, job search & matching — implementation plan

**Scope:** Pull jobs from **employer ATS / official public APIs** (not generic aggregators like Indeed/LinkedIn), normalize into **`ExternalJob`**, expose search/detail in **`GET /jobs`**, rank jobs against **`CandidateProfile`** in **`GET /matches`**, keep **apply** as outbound links to employer-hosted pages. Aligns with PRD §5.3 (`job_sources`, `external_jobs`), §6.3–6.4 (jobs + matching), §8–9 (matching + aggregation), and existing **`JobSourceSyncPort`** (`src/job-sources/sync/`).

**Out of scope (later phases elsewhere):** `saved_jobs`, convert-to-application (**V2D**), entitlement gating (**V2F**), hosted apply flows, realtime alerts delivery.

---

## Launch market & niche (IT / SWE / Product)

Define the **launch market** up front so ingestion, filters, and matching score against the same assumptions.

| Dimension | Launch choice | Implementation note |
|-----------|---------------|----------------------|
| **Geography** | Nigeria, UK, US | Filter/search by `location` string + optional country tags on `JobSource` / `ExternalJob` when adapters expose them; do not hard-filter at ingest until geo normalization exists (Phase **H.2**). |
| **Role families** | Software Engineering, Product Management, Product Design, Data | Seed `JobSource` rows toward employers known to hire these families; matching boosts title/keyword overlap with profile `roles` + `skills`. |
| **Job levels** | Intern, Junior, Mid, Senior, Lead | Map to **`ExternalExperienceLevel`** at normalization time (heuristics from title text where ATS omits level). |

**Starter employer list (100–200 targets):** maintain as versioned data (e.g. `data/launch-employers.json` or admin CSV import), not only ad-hoc DB rows.

Per employer row:

```txt
companyName
careersUrl          # human reference
atsType             # GREENHOUSE | LEVER | ASHBY | …
config              # board_token / site slug (provider-specific)
sourceStatus        # CANDIDATE | ACTIVE | PAUSED | REJECTED
priority            # 1 = sync first in daily batch
notes               # optional
```

Prioritize **active hiring** employers first (fastest user-visible value). Batch onboarding: ~50 sources → sync → validate search → next batch.

---

## Source policy (non-negotiable)

| Rule | Enforcement |
|------|-------------|
| Ingest only from **legal/public** ATS APIs | Greenhouse, Lever, Ashby, SmartRecruiters, USAJOBS (when relevant) via official endpoints — **no** unauthorized scraping of ToS-restricted platforms. |
| Always persist **source URL** + **apply URL** | `applicationUrl` required on active listings; `JobSource` name/type surfaced on read APIs. |
| Provider-specific shapes stay internal | Adapters → **`genericJobListingSchema`** → **`ExternalJob`**; clients never see raw Greenhouse/Lever JSON. |
| Terms documented per source | `JobSource` notes / config documents caching and attribution expectations. |

---

## What the agent can do alone vs what needs you

For **job search** and **job matching** specifically:

| Workstream | Agent can implement end-to-end | Needs your intervention |
|------------|--------------------------------|-------------------------|
| **`GET /jobs` + filters + pagination** | Yes — Phase **E** (`JobsService`, Prisma queries, DTOs, tests). | Product call: public vs JWT-only search (today: JWT). |
| **Mobile/web Job Search UI** | Yes — wire existing screens to real API; add missing filters (`postedWithin`, `experienceLevel`, `source`). | UX review on filter defaults for NG/UK/US. |
| **Admin sync trigger** | Yes — Phase **D** (`POST …/sync`). | Run first sync in deployed env; add your user id to `ADMIN_USER_IDS`. |
| **Dedupe + stale marking** | Yes — Phase **G**. | Threshold tuning (e.g. inactive after N syncs). |
| **Matched Jobs MVP (heuristic)** | Yes — Phase **M** (scores + `matchReason` string, no LLM required for v1). | Confirm scoring weights; optional later: semantic/AI layer per PRD §8. |
| **`job_match_results` persistence** | Yes — migration + read/write in matching module. | None for MVP. |
| **Starter 100–200 employers** | Partial — can generate **template** list + import script + first ~20–30 well-known tech boards with public tokens. | **You must validate** careers URLs, slugs/tokens, and hiring relevance; wrong `board_token`/`site` fails sync silently or with `lastError`. |
| **Daily sync schedule** | Code cron/worker + docs. | Infra: where cron runs (Railway/Fly/k8s), secrets, monitoring alerts. |
| **Submit careers page form** | Yes — Phase **I** (API + ATS auto-detect + admin queue). | Moderation policy: who approves, SLA, spam rules. |
| **Trust/quality weekly cleanup** | Yes — scheduled job + admin flags. | Define “suspicious” thresholds (salary, missing apply URL). |

**Bottom line:** Job search and a **heuristic** Matched Jobs MVP are largely **implementable without you in the loop** once the repo is runnable. **Useful launch data** (correct employer ATS configs, ops sync in production, legal/market sign-off) **requires you** — the agent cannot reliably discover 200 valid board tokens or operate production cron from this environment alone.

---

## Principles

| Principle | Meaning |
|-----------|---------|
| **Adapter-per-ATS** | One sync implementation per platform family (Greenhouse, Lever, Ashby…), selected by **`JobSource.type`** + **`config`**. |
| **Normalize centrally** | Adapters emit **structured raw DTOs**; a single normalization path maps → **`ExternalJob`** fields (+ **`rawPayload`**). |
| **Idempotent ingest** | Upsert keyed by **`(sourceId, externalJobId)`**; **`contentHash`** optional for anomaly detection later. |
| **Discovery-only product** | **`applicationUrl`** always points off-site; UI/API copy reflects “Apply on employer site”. |
| **Terms-first** | Each **`JobSource`** documents allowed use (caching TTL, attribution); no scraping official APIs unless explicitly allowed. |

---

## Phase 0 — Prerequisites (already partly done)

- [x] **`JobSource` / `ExternalJob`** schema + migration.
- [x] **`job-sources`** module + **`GET /api/v1/admin/job-sources`** + **`ADMIN_USER_IDS`** gate.
- [x] **`JobSourceSyncPort`** + **`NoopJobSourceSyncProvider`** + **`JOB_SOURCE_SYNC_PORT`** token.
- [x] **`JobSource.config`** nullable JSON (`prisma/migrations/20260619104500_job_source_config`).

---

## Phase A — Source configuration & admin ergonomics

**Goal:** Operators can define *which* ATS board to sync without redeploy.

| Task | Detail |
|------|--------|
| **A.1** | Add `config Json?` on **`JobSource`** (or typed columns if you strongly prefer migrations per field — JSON is flexible for heterogeneous ATS). |
| **A.2** | Migration + Prisma regenerate. |
| **A.3** | Extend **`JobSourceAdminResponseDto`** (+ future **`PATCH/POST`** if needed) to surface **`config`** for admins only (**never** expose secrets on public **`GET /jobs`**). |
| **A.4** | Document config keys per ATS in this file under **§ Appendix: provider config schemas** (populate as adapters land). |

### Phase A completion (implemented)

- [x] **A.1–A.2**: `JobSource.config` (`Json?`) + migration **`20260619104500_job_source_config`**.
- [x] **A.3**: **`config`** on **`JobSourceAdminResponseDto`**; **`POST /api/v1/admin/job-sources`**; **`PATCH /api/v1/admin/job-sources/:id`** (explicit **`config: null`** clears SQL column).
- [x] **A.4**: appendix lists Greenhouse/Lever **`provider` / slug** keys (**§ Appendix**).

**Exit:** At least one **`JobSource`** row can carry Greenhouse **`board_token`** / Lever **`site`** (slug) in **`config`** and route to ingest adapters (**Phase C**).

---

## Phase B — Ingest pipeline (core backend)

**Goal:** One **`SyncRunner`** that: loads source → invokes port → normalizes → **bulk upsert** **`ExternalJob`** → updates **`JobSource` health** timestamps.

| Task | Detail |
|------|--------|
| **B.1** | **`JobIngestOrchestrationService`** (name flexible) injected with **`PrismaService`**, **`JOB_SOURCE_SYNC_PORT`** (eventually **registry/factory** of ports — see Phase C). |
| **B.2** | **`normalizeRawToExternalJob(source, raw): Omit<ExternalJob, 'id', ...>`** pure functions under e.g. `job-sources/normalization/` with unit tests per provider family. |
| **B.3** | **`persistBatch(sourceId, sourceName, rows[])`**: `upsert` on **`@@unique([sourceId, externalJobId])`**, update title/company/applicationUrl/`postedAt`/`rawPayload`/enums mapping. Wrap in **`$transaction`** for batch chunks (e.g. 100 rows) if needed. |
| **B.4** | On completion: **`lastSuccessAt`**, **`lastSyncAt`**; on failure: **`lastErrorAt`**, **`lastErrorMessage`** (truncate for DB). |

### Phase B completion (implemented)

- [x] **B.1** — **`JobIngestOrchestrationService`** (`job-ingest-orchestration.service.ts`): **`PrismaService`** + **`JOB_SOURCE_SYNC_PORT`**.
- [x] **B.2** — **`genericJobListingSchema` / `parseGenericJobListing`** + **`buildExternalJobUpsertArgs`** under **`job-sources/normalization/`**.
- [x] **B.3** — Chunked **`$transaction`** (default chunk size **50**) of **`externalJob.upsert`** on **`@@unique([sourceId, externalJobId])`**; persists **`rawPayload`** per listing.
- [x] **B.4** — Success clears **`lastError*`** and sets **`lastSyncAt`** + **`lastSuccessAt`**; failures set **`lastError*`** + throw **`502`** (**`BadGatewayException`**); invalid rows increment **`skippedInvalid`** only.

**Exit:** Runner can be invoked from Nest with a **`JobSource` id** and writes real **`ExternalJob`** rows (wired to first real adapter in Phase C).

---

## Phase C — Provider adapters (incremental rollout)

**Goal:** **`JobSourceSyncPort`** implementations that return **typed listing batches** before normalization.

| Order | Provider | Typical config | Notes |
|-------|----------|----------------|--------|
| **C.1** | **Greenhouse Job Board API** | `board_token` | Wide adoption; GET job list by public board token pattern. First **reference implementation**. |
| **C.2** | **Lever** | `site` / company slug | Public postings endpoint by site. |
| **C.3** | **Ashby** | public board key / slug (per docs) | Add when Ashby onboarding is prioritized. |
| **C.4** | **USAJOBS** | api key env + query params | Good for demos; normalize federal schema differently. |
| **C.5** | **SmartRecruiters** | `api_key` + company identifier | Explicit key management; **`requiresApiKey: true`**. |

| Task | Detail |
|------|--------|
| **C.x.1** | HTTP client (**`axios`**, already dependency) + timeouts + user-agent identifying JobTrackr. |
| **C.x.2** | Adapter **`fetchSnapshot`** returns **`rawListings`** as **validated internal DTOs** (not `unknown[]`) inside that adapter’s folder. |
| **C.x.3** | Unit tests using **fixture JSON** captured from sandbox responses (sanitize PII before commit). |
| **C.x.4** | **`JobSourceRegistry`** maps **`JobSource.type`** (+ optional subtype) → correct **`JobSourceSyncPort`** implementation (**multi-provider injection**via Nest factories or **`Map`** of implementations). Replace single **`NoopJobSourceSyncProvider`** as sole binding when wiring real providers. |

**Exit:** Greenhouse + Lever wired via **`RegistryJobSourceSyncProvider`** (**`JOB_SOURCE_SYNC_PORT`**); further providers stay optional.

### Phase C completion (**C.1 + C.2** implemented)

- [x] **C.x.1–C.x.2** — **`GreenhouseJobSourceSyncProvider`** + **`LeverJobSourceSyncProvider`**: **`axios`** + timeout + **`User-Agent`**; map HTTP payloads → **`genericJobListingSchema`**-compatible **`rawListings`**.
- [x] **C.x.3** — Unit tests (**axios** mocks, Greenhouse JSON fixture under **`sync/fixtures/`**, mapper coverage).
- [x] **C.x.4** — **`RegistryJobSourceSyncProvider`** + **`resolveJobSourceIngestProvider`**; unknown / unconfigured **`config`** delegates to **`NoopJobSourceSyncProvider`** (no **`JobSource`** type enum explosion).
- [ ] **C.3–C.5** — Ashby, USAJOBS, SmartRecruiters (later).

---

## Phase D — Trigger sync

**Goal:** Operational control without only running scripts.

| Task | Detail |
|------|--------|
| **D.1** | **`POST /api/v1/admin/job-sources/:id/sync`** guarded like list admin route. |
| **D.2** | MVP **synchronous** response (timeout risk — cap listing size); plan **§ D.3** early if boards are huge. |
| **D.3** | **Later:** return **202 Accepted** + job id (**BullMQ** / **`pgBoss`** / Cron — PRD §13); store sync run rows if needed. |

### Phase D completion (implemented)

- [x] **D.1** — **`POST /api/v1/admin/job-sources/:id/sync`** on **`AdminJobSourcesController`** (`JwtAuthGuard` + **`AdminGuard`**); delegates to **`JobIngestOrchestrationService.syncExternalJobs`**.
- [x] **D.2** — Synchronous **`200`** with **`JobSourceSyncResponseDto`**: `jobSourceId`, `upsertedCount`, `skippedInvalid`, `syncedAt` (matches DB health timestamps). **`502`** on ingest failure with source **`lastError*`** updated.

**Exit:** Single admin POST triggers ingest for one **`JobSource`**.

---

## Phase G — Hardening (dedupe + freshness)

| Task | Detail |
|------|--------|
| **G.1** | Dedupe **`contentHash`** policy (normalize title+company+location+apply URL; hash on upsert; optional cross-source duplicate flag for admin). |
| **G.2** | **Stale marking:** after each successful sync, set `isActive=false` on `ExternalJob` rows for that `sourceId` whose `externalJobId` was **not** in the latest snapshot (soft-delete; retain row for history). |
| **G.3** | Rate-limit admin sync endpoints; structured logging (source id, duration, upserted/skipped/inactivated counts). |
| **G.4** | **Re-activate** jobs that reappear in a later sync (`isActive=true`, refresh fields). |

**Exit:** Same job re-synced updates in place; jobs missing from later syncs become inactive, not deleted.

---

## Phase H — Launch data & ops

**Goal:** Go from zero listings to a credible NG/UK/US IT niche feed.

| Task | Detail |
|------|--------|
| **H.1** | Add `data/launch-employers.seed.json` + script `npm run seed:job-sources` (idempotent upsert by `companyName` + ATS config). |
| **H.2** | Optional: `launchMarkets: ["NG","GB","US"]` on `JobSource` or derived from employer metadata for admin filtering. |
| **H.3** | Document runbook: enable source → `POST …/sync` → verify `lastSuccessAt` → spot-check `GET /jobs`. |
| **H.4** | Daily sync: MVP = admin/cron hits sync-all-active endpoint; later = queue worker per source with concurrency cap. |

**Exit:** ≥1 board per ATS type synced; search returns non-empty results for at least one filter combo.

---

## Phase E — Job Search API release

**Goal:** Replace placeholder **`GET /jobs`** with real **`ExternalJob`** discovery. Mobile (`jobs-search.screen.tsx`) and web (`jobs-board-screen.tsx`) already call this contract.

| Task | Detail |
|------|--------|
| **E.1** | **`JobsService.search()`** — Prisma query on `isActive=true` with filters: `q` (title/company/description `ILIKE` or Postgres `tsvector` later), `location`, `remoteType` (align DTO **`workMode`** → DB **`remoteType`**), `experienceLevel`, `salaryMin`, `source` (job source name/id), `postedWithin` (e.g. 7d/30d on `postedAt`). |
| **E.2** | Pagination `{ jobs, total, page, limit }` — mirror resume-review list pattern; cap `limit` (e.g. 50). |
| **E.3** | **`GET /jobs/:id`** — single listing; 404 if inactive unless admin. |
| **E.4** | Response DTOs: include `applicationUrl`, `sourceName`, `postedAt`, enums; **omit** `rawPayload`, internal `sourceId`. |
| **E.5** | E2e tests: empty DB, seeded jobs, filter combinations, pagination boundaries. |
| **E.6** | **FE (mobile + web):** map new query params; “Apply on company site” uses `applicationUrl`; optional pagination UI. |

**Exit:** User can keyword search, filter, paginate, open employer apply link from listing and detail.

---

## Phase M — Matched Jobs MVP

**Goal:** Rank active jobs for the authenticated user using **existing `CandidateProfile`** (from resume extraction) — no LLM required for v1.

### Scoring model (v1 — weighted heuristic)

| Signal | Weight (tunable) | Source |
|--------|-------------------|--------|
| Title / role match | High | `CandidateProfile.roles` vs `ExternalJob.title` |
| Skill overlap | High | `skills` ∩ job title + description tokens |
| Experience level fit | Medium | `yearsOfExperience` vs `experienceLevel` |
| Location / remote fit | Medium | `locations`, `workModes` vs job location + `remoteType` |
| Recency | Low–medium | `postedAt` decay |

Return per job:

```txt
overallScore        # 0–100
matchReason         # human string, e.g. "Strong skill overlap in React + Node"
matchedSkills       # string[]
missingSkills       # string[] (optional, top gaps only)
```

### Backend tasks

| Task | Detail |
|------|--------|
| **M.1** | Prisma: **`JobMatchResult`** (or `job_match_results` per PRD §5.4) — `userId`, `candidateProfileId`, `externalJobId`, scores, `matchReason`, `matchedSkills`, `missingSkills`, timestamps. |
| **M.2** | **`job-matching` module**: `JobMatchingService.computeMatches(userId, { limit, refresh })` — loads latest confirmed profile + active jobs (respect launch filters). |
| **M.3** | **`GET /api/v1/matches`** — returns cached rows if fresh (e.g. &lt;24h) else recompute; sorted by `overallScore` desc. |
| **M.4** | **`POST /api/v1/matches/generate`** — force refresh (rate-limited). |
| **M.5** | **`GET /api/v1/jobs/:id/match`** — on-demand score for job detail. |
| **M.6** | Clear UX when no profile: `409` or empty state with “Upload resume to see matches”. |
| **M.7** | Unit tests for scoring pure functions; integration test with fixture profile + jobs. |

### Frontend tasks (mobile primary; web parity)

| Task | Detail |
|------|--------|
| **M.8** | Replace `MatchedJobsPlaceholderScreen` with list: score badge, title, company, **`matchReason`**, apply CTA. |
| **M.9** | `useMatchedJobsQuery` + `matches.service.ts` + DTO mapper (mirror job search patterns). |
| **M.10** | Pull-to-refresh → `POST …/matches/generate` or query invalidation. |

**Exit:** User with a profile sees a ranked list with visible match reason; scores are deterministic and test-covered.

**Later (post-MVP):** semantic similarity + AI explanation (PRD §8), `job_alert_preferences`, behavior signals (saved/applied/ignored).

---

## Phase I — Organic source growth (“Submit careers page”)

| Task | Detail |
|------|--------|
| **I.1** | Public/authenticated **`POST /api/v1/job-source-submissions`** — `companyName`, `careersUrl`, submitter email optional. |
| **I.2** | Auto-detect ATS: parse URL host/path for Greenhouse (`boards.greenhouse.io`, `job-boards.greenhouse.io`), Lever (`jobs.lever.co`), Ashby (`jobs.ashbyhq.com`) → prefill `atsType` + slug/token when parseable. |
| **I.3** | Admin queue: list pending → approve creates/updates **`JobSource`** + queues first sync. |
| **I.4** | Reject/spam states; rate limit by IP/user. |

**Exit:** Employers (or users) can suggest sources without manual discovery forever.

---

## Phase J — Trust & quality controls

| Task | Detail |
|------|--------|
| **J.1** | Weekly job: mark suspicious rows — missing/invalid `applicationUrl`, salary outliers, duplicate `contentHash`. |
| **J.2** | Admin dashboard fields already on **`JobSource`**: surface `lastSyncAt`, `lastErrorAt`, `lastErrorMessage` in UI. |
| **J.3** | Alerting hook (log/metric) when source fails N consecutive syncs. |
| **J.4** | Inactive job retention policy (e.g. purge `isActive=false` older than 90d) — optional, configurable. |

---

## Phase K — Scale after proof

| Milestone | Action |
|-----------|--------|
| 200 → 1,000+ employers | Import in batches of 50–100; stabilize error rate before next batch. |
| New ATS connectors | Ashby → SmartRecruiters → USAJOBS only after Greenhouse/Lever sync health is green. |
| Matching v2 | Weight adjustments from save/apply/ignore events; optional embeddings on description. |
| Search v2 | Postgres full-text / dedicated search index if `ILIKE` degrades. |

---

## Recommended implementation order

```txt
[D] Admin sync trigger          ← unblock real data
[H] Seed script + first batch   ← you validate employer list
[G] Stale + contentHash         ← data quality before users see feed
[E] Job Search API + FE wire    ← Job Search MVP
[M] Matched Jobs MVP            ← depends on E + CandidateProfile
[I] Careers page submissions    ← growth loop
[C.3+] Ashby, etc.              ← only when ops stable
[K] Scale batches               ← after metrics prove retention
```

---

## Appendix: suggested `JobSource.config` shapes (examples)

Populate as adapters ship; validators can use **zod** per **`type`**.

Routing today:

- Omit **`provider`**: ingest infers **`GREENHOUSE`** when **`board_token`** is set (non‑empty string) and **`LEVER`** when **`site`** slug is set. If both conflict, prefer setting explicit **`provider`**.
- Prefer explicit **`provider`**: **`"GREENHOUSE"`** \| **`"LEVER"`** (aliases: **`ingestProvider`**).

### Greenhouse

```json
{
  "provider": "GREENHOUSE",
  "board_token": "<public_board_token>",
  "api_base_override": null
}
```

`api_base_override` is optional HTTPS root (e.g. alternate board API host); defaults to `https://boards-api.greenhouse.io/v1`.

### Lever

```json
{
  "provider": "LEVER",
  "site": "<company_lever_slug>"
}
```

### USAJOBS (illustrative)

```json
{
  "organization": "Treasury",
  "keyword_hint": ""
}
```

---

## Tracking

| Phase | Status | Effort (rough) |
|-------|--------|----------------|
| A — Source config & admin | Done | Small |
| B — Ingest orchestration | Done | Medium |
| C.1–C.2 Greenhouse + Lever | Done | Medium |
| C.3–C.5 Ashby / USAJOBS / SmartRecruiters | Not started | Medium each |
| D — Admin sync trigger | Done | Small |
| E — Job Search API + FE | Not started (stub controller) | Medium |
| G — Dedupe + stale | Not started | Small–Medium |
| H — Launch employer seed + ops | Not started | Small (+ your list validation) |
| M — Matched Jobs MVP | Not started | Medium |
| I — Careers page submissions | Not started | Medium |
| J — Trust / quality jobs | Not started | Small |
| K — Scale | Ongoing | Large |

**Next actionable coding step:** **H.1** seed script → **G** → **E** → **M**.

---

*Document version: v2 — adds launch market, job search release, matched jobs MVP, growth loop, and autonomy vs operator table; revise when Phase V2G replaces env-based admin with RBAC.*
