Stage 5.0 Interviews Contract Freeze

Endpoints
- POST /api/v1/interviews
- GET /api/v1/interviews
- GET /api/v1/interviews/upcoming
- PATCH /api/v1/interviews/:id
- DELETE /api/v1/interviews/:id

Ownership semantics
- Interview records are always user-owned.
- Interview create/update requires an application owned by the same user.
- Cross-user access returns 404.

Validation
- `applicationId` must be a valid UUID.
- `stage` and `interviewType` must be valid enum values.
- `scheduledAt` must be a valid date.
