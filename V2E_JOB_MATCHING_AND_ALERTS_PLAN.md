# Stage V2E — job matching + alerts

This document phases **`E.1`–`E.5`** for the `src/job-matching/` area and related data.  
Implementation is intended to land incrementally; treat sections as **checkpoints**, not a single PR.

---

## Current baseline (already shipped before V2E)

| Area | Location | Notes |
|------|-----------|--------|
| **Profile resolution** | `JobMatchingService.resolveProfileForUser` | Active parsed resume → confirmed profile → latest profile. |
| **External job pool** | `externalJob` + `externalJobPublicInclude` | Batch cap `MATCH_JOB_POOL_SIZE`, active & non-suspicious only. |
| **Scoring** | `job-match-scoring.ts` | Heuristic breakdown + `matchReason`. |
| **Persistence** | `JobMatchResult` | Per `(userId, externalJobId)` cache of scores. |
| **APIs** | `GET /matches`, `POST /matches/generate`, `GET /jobs/:id/match` | List + force refresh + single-job match. |
| **On-demand vs batch** | `matchJobForUser` vs `generateAndPersistMatches` | Single job always scored; list uses cache then batch. |

---

## E.1 Data layer — profile + job snapshots, DTOs, caching

**Goal:** Stable contracts and predictable inputs to the engine.

| Task | Status | Notes |
|------|--------|--------|
| Canonical profile source of truth | Done | `CandidateProfile` + `resumeId` on `JobMatchResult`. |
| External job public projection | Done | `ExternalJobListingRow` / mappers in `jobs/`. |
| Response DTOs | Done | `job-match-response.dto.ts`. |
| HTTP caching semantics | Done | `MATCH_CACHE_TTL_MS` + profile freshness vs `JobMatchResult.updatedAt`. |
| Optional: snapshot JSON for audit/replay | Todo | Store optional `profileSnapshot` / `jobSnapshot` on `JobMatchResult` for debugging. |

**Artifacts:** `JOB_MATCHING_CONTRACT.md` (API + cache rules).

---

## E.2 Matching engine — scores, flags, batch vs on-demand

**Goal:** Tunable behavior without code changes where possible.

| Task | Status | Notes |
|------|--------|--------|
| Env-tunable pool / TTL / limit | Done | `MATCH_CACHE_TTL_HOURS`, `MATCH_JOB_POOL_SIZE`, `MATCH_RESULT_LIMIT` in `.env.example`. |
| Throttle `POST /matches/generate` | Done | `MATCHES_GENERATE_THROTTLE_*`. |
| Feature flags (e.g. LLM reason) | Todo | Introduce config service or env when second scorer is added. |
| Optional: pluggable scorer interface | Todo | Wrap `scoreJobMatch` behind `MatchScoringStrategy`. |

---

## E.3 Alert model — saved search, thresholds, persistence, dedupe

**Goal:** Users can define *when* to be notified about matches.

| Task | Status | Notes |
|------|--------|--------|
| Per-user thresholds + channels | Done | `MatchAlertPreference` + `GET/PATCH …/matches/alert-preferences`. |
| Saved-search / filter DSL | Todo | New table or JSON filter referencing `JobSearchQuery` fields. |
| Dedupe keys for sends | Todo | Recommend `(userId, externalJobId, channel, digestWindow)` in worker. |
| Background evaluation | Todo | Worker: new jobs vs profile + threshold + user opt-in. |

---

## E.4 Delivery — channels, rate limits, opt-in/out

**Goal:** Actually notify, without spam.

| Task | Status | Notes |
|------|--------|--------|
| Channel toggles | Partial | `channels` JSON on `MatchAlertPreference`. |
| Delivery implementation | Stub | `MatchAlertDeliveryService` (no SMTP/push yet). |
| Rate limits per user/channel | Todo | Align with global throttler + digest batching. |
| Unsubscribe / compliance | Todo | Link from email + respect `enabled: false`. |

---

## E.5 Observability & ops — metrics, replay, feed failures

**Goal:** Operate matching and ingestion safely.

| Task | Status | Notes |
|------|--------|--------|
| Regeneration log line | Done | `JobMatchingService` logs pool size on batch regen. |
| Delivery stub logging | Done | `MatchAlertDeliveryService` + `logFeedFailure` hook for ingest. |
| Metrics (Prometheus / OTEL) | Todo | Counters for `matches_generated`, `alerts_sent`, `feed_errors`. |
| Replay / backfill job | Todo | CLI or admin to re-score users after algorithm change. |

---

## Suggested build order (next PRs)

1. Apply migration `20260718100000_v2e_match_alert_preferences` in each environment.
2. Wire mobile/web settings UI to `GET/PATCH /matches/alert-preferences`.
3. Implement **alert evaluation worker** (new jobs vs `minMatchScore` + `enabled`).
4. Replace **delivery stub** with email/push providers and digest batching.
5. Add **saved search** rows if product needs filters beyond a global threshold.
