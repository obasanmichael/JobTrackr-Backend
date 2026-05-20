# Job matching — API & data contract

Base path: **`/api/v1`** (global prefix). All routes require JWT unless noted.

## Matching endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/matches` | List cached matches for the current user (see cache rules below). |
| POST | `/matches/generate` | Force recomputation over the configured job pool; throttled. |
| GET | `/jobs/:id/match` | Score one active, non-suspicious job against the user profile. |
| GET | `/matches/alert-preferences` | Read alert thresholds/channels (defaults if never saved). |
| PATCH | `/matches/alert-preferences` | Upsert `MatchAlertPreference`. |

## Data sources

1. **Profile** — `JobMatchingService` resolves a `CandidateProfile` from:
   - active resume with `PARSED` status, else
   - latest confirmed profile, else
   - latest profile for the user.
2. **Jobs** — `ExternalJob` rows with `isActive` and `!isSuspicious`, using the same public projection as job search (`externalJobPublicInclude`).

## Cache semantics (`GET /matches`)

Results may be reused when:

- There is at least one `JobMatchResult` for the user, and  
- The newest `updatedAt` among those rows is **newer** than the profile’s `updatedAt`, and  
- Cache age is within **`MATCH_CACHE_TTL_MS`** (from **`MATCH_CACHE_TTL_HOURS`** env, default 24h).

Otherwise the service recomputes (same as `POST /matches/generate` without throttle).

## Scores

Scores are integers **0–100** per dimension; `overallScore` is the weighted combination defined in `job-match-scoring.ts`. Rows are stored in **`JobMatchResult`** for list endpoints.

## Alert preferences (V2E)

- **`enabled`** — master switch for future alert delivery.  
- **`minMatchScore`** — only matches at or above this overall score should be considered for notifications.  
- **`channels`** — JSON map of channel → boolean (e.g. `email`, `push`).

Delivery workers are **not** part of this contract; they read preferences and `JobMatchResult` / ingest feeds separately.
