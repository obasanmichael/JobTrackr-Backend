Stage 3.0 Applications Contract Freeze

Resource
- JobApplication is the core Stage 3 entity and is always owned by a user.
- Ownership is represented by `userId` and enforced server-side only.

Enums
- ApplicationStatus: SAVED, APPLIED, SCREENING, INTERVIEW, TECHNICAL_ASSESSMENT, FINAL_INTERVIEW, OFFER, REJECTED, WITHDRAWN
- WorkMode: REMOTE, HYBRID, ONSITE, UNSPECIFIED
- ApplicationSource: LINKEDIN, COMPANY_WEBSITE, REFERRAL, INDEED, TWITTER, EMAIL, OTHER

Endpoints
- POST /api/v1/applications
- GET /api/v1/applications
- GET /api/v1/applications/:id
- PATCH /api/v1/applications/:id
- DELETE /api/v1/applications/:id

Query Contract
- status: ApplicationStatus
- search: matches `jobTitle` and `companyName` (case-insensitive)
- sort: `deadline` or `createdAt`
- default sort: `createdAt` descending
- `deadline` sort behavior: ascending with null deadlines last
- deterministic fallback ordering: `createdAt` desc, then `id` desc

Validation Rules
- Invalid enums are rejected.
- Invalid URL/date payloads are rejected.
- Salary fields are non-negative.
- `salaryMax` must be >= `salaryMin` when both are provided.

Response Contract
- Returns safe application fields only.
- Does not rely on client-supplied userId in any payload.
- Returns 404 when record is not found for the authenticated user context.
- DELETE returns 204 No Content on success.
