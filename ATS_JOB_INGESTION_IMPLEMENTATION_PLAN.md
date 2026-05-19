# ATS job ingestion & discovery layer — implementation plan

**Scope:** Pull jobs from **employer ATS / official public APIs** (not generic aggregators like Indeed/LinkedIn), normalize into **`ExternalJob`**, expose search/detail in **`GET /jobs`**, keep **apply** as outbound links to employer-hosted pages. Aligns with PRD §5.3 (`job_sources`, `external_jobs`), §6.3 (read-path jobs), §9.x (providers, sync, normalization), and existing **`JobSourceSyncPort`** (`src/job-sources/sync/`).

**Out of scope (later phases elsewhere):** `saved_jobs`, convert-to-application (**V2D**), entitlement gating (**V2F**), hosted apply flows.

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
- [ ] **A.4**: appendix below — flesh out Greenhouse/Lever payloads when adapters land.

**Exit:** At least one **`JobSource`** row can carry e.g. Greenhouse **`board_token`** or Lever **`site_slug`** in DB config.

---

## Phase B — Ingest pipeline (core backend)

**Goal:** One **`SyncRunner`** that: loads source → invokes port → normalizes → **bulk upsert** **`ExternalJob`** → updates **`JobSource` health** timestamps.

| Task | Detail |
|------|--------|
| **B.1** | **`JobIngestOrchestrationService`** (name flexible) injected with **`PrismaService`**, **`JOB_SOURCE_SYNC_PORT`** (eventually **registry/factory** of ports — see Phase C). |
| **B.2** | **`normalizeRawToExternalJob(source, raw): Omit<ExternalJob, 'id', ...>`** pure functions under e.g. `job-sources/normalization/` with unit tests per provider family. |
| **B.3** | **`persistBatch(sourceId, sourceName, rows[])`**: `upsert` on **`@@unique([sourceId, externalJobId])`**, update title/company/applicationUrl/`postedAt`/`rawPayload`/enums mapping. Wrap in **`$transaction`** for batch chunks (e.g. 100 rows) if needed. |
| **B.4** | On completion: **`lastSuccessAt`**, **`lastSyncAt`**; on failure: **`lastErrorAt`**, **`lastErrorMessage`** (truncate for DB). |

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

**Exit:** Greenhouse + at least one more provider OR USAJOBS behind feature flag env.

---

## Phase D — Trigger sync

**Goal:** Operational control without only running scripts.

| Task | Detail |
|------|--------|
| **D.1** | **`POST /api/v1/admin/job-sources/:id/sync`** guarded like list admin route. |
| **D.2** | MVP **synchronous** response (timeout risk — cap listing size); plan **§ D.3** early if boards are huge. |
| **D.3** | **Later:** return **202 Accepted** + job id (**BullMQ** / **`pgBoss`** / Cron — PRD §13); store sync run rows if needed. |

**Exit:** Single admin POST triggers ingest for one **`JobSource`**.

---

## Phase E — Public jobs API (**`jobs/`** module)

**Goal:** Replace placeholder **`GET /jobs`** with **`ExternalJob`** query + **`GET /jobs/:id`** (ownership irrelevant for public listings; enforce **anonymous read** or JWT per product choice — today controller is guarded; revisit if feeds should be public).

| Task | Detail |
|------|--------|
| **E.1** | **`JobsService`** queries **`ExternalJob`** with filters from PRD §6.3: keyword, location, remoteType, salaryMin, source, postedWithin, experienceLevel. Map enums consistently. |
| **E.2** | Pagination `{ jobs, total, page, limit }` (mirror resume-review list pattern). |
| **E.3** | Response DTOs **omit** **`rawPayload`** and **internal** **`sourceId`** unless needed — include **`sourceName`** + **`applicationUrl`**. |

**Exit:** FE can consume real aggregated listings.

---

## Phase F — Frontend (web app) — outline

_Not backend-only; tracked here for end-to-end story._

| Task | Detail |
|------|--------|
| **F.1** | Types + API client for **`GET /jobs`** / **`GET /jobs/:id`**. |
| **F.2** | Job search UI (filters parity with MVP backend query params). |
| **F.3** | Detail page: **`applicationUrl`** opens new tab / deep link disclaimer. |

---

## Phase G — Hardening

| Task | Detail |
|------|--------|
| **G.1** | Dedupe **`contentHash`** policy (normalize whitespace, optional apply URL normalization). |
| **G.2** | **Stale marking:** deactivate rows not seen in N syncs (`isActive=false`) configurable per **`JobSource`**. |
| **G.3** | Rate-limit admin sync endpoints; structured logging (source id, duration, counts). |

---

## Appendix: suggested `JobSource.config` shapes (examples)

Populate as adapters ship; validators can use **zod** per **`type`**.

### Greenhouse (illustrative)

```json
{
  "board_token": "<public_board_token>",
  "api_base_override": null
}
```

### Lever (illustrative)

```json
{
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

| Phase | Estimated effort (rough) |
|-------|---------------------------|
| A | Small |
| B | Medium |
| C.1 Greenhouse | Medium |
| C.2+ / D / E | Medium each |
| F | Medium (depends on UX) |
| G | Small–Medium |

**Next actionable coding step:** **Phase A (`config` on `JobSource`) → Phase B (orchestration + normalization + persist) → Phase C.1 (Greenhouse adapter) → Phase D (admin sync)**.

---

*Document version: drafted for JobTrackr backend V2C track; revise when Phase V2G replaces env-based admin with RBAC.*
