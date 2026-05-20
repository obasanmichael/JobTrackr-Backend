Stage V2D Saved Jobs — contract

Purpose
- Persist user bookmarks (`saved_jobs`) for normalized **`ExternalJob`** listings and convert them into **V1 `JobApplication`** rows.

Ownership
- All endpoints require Jwt auth.
- Rows are keyed by **`userId`** (= JWT subject). Accessing another user's bookmark id yields **404** (mirrors **`APPLICATIONS_CONTRACT`**).

Identifiers
- **POST `/saved-jobs`** body field **`externalJobId`** refers to **`ExternalJob.id`** (UUID from **`GET /jobs/:id`**), **not** the ATS provider string **`ExternalJob.externalJobId`**.

Endpoints
- `POST /api/v1/saved-jobs` → **200** upsert/idempotent (**dismiss → save** restores **`SAVED`**).
- `GET /api/v1/saved-jobs` → **`{ items, total, page, limit }`** default **`status=SAVED`** bookmarks only.
  - **`includeConverted=true`**: **`SAVED`** + **`CONVERTED_TO_APPLICATION`**.
  - **`dismissedOnly=true`**: only **`DISMISSED`**.
- `PATCH /api/v1/saved-jobs/:savedJobId` — **notes** / **status** (cannot PATCH to **`CONVERTED_TO_APPLICATION`**).
- `DELETE /api/v1/saved-jobs/:savedJobId` → **204**.
- `POST /api/v1/saved-jobs/:savedJobId/convert-to-application` → **200** `{ application, savedJob }`, idempotent (repeat returns stored application).

Eligibility
- **Save**: listing must **`isActive` && !`isSuspicious`**.
- **Convert**: same eligibility; otherwise **404** even if bookmark exists.

Conversion semantics
- Application fields inferred from **`ExternalJob`** (+ optional **`notesAppend`** + saved **notes**) via **`ApplicationsService.create`** (no client-supplied **`userId`**).
- Writes timeline **`GENERAL_UPDATE`** referencing listing id (**`APPLICATION_EVENTS_CONTRACT`** enums).
