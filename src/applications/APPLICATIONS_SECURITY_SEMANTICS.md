Stage 3.6 Security + Error Semantics

Route protection
- All `/api/v1/applications` endpoints require `JwtAuthGuard`.
- Unauthenticated requests return `401 Unauthorized`.

Ownership semantics
- Every applications query is constrained by `userId`.
- Cross-user record access returns `404 Application not found`.
- The API never trusts client-supplied `userId`.

Validation semantics
- Invalid DTO payloads return `400 Bad Request`.
- Invalid enums, URLs, dates, and sort values are rejected.

Response safety
- Error messages avoid leaking internal DB details.
- Application responses expose only safe fields.
