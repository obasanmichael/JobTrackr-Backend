Stage 5.6 Interviews Security + Error Semantics

Authentication
- All interviews endpoints require JwtAuthGuard.
- Unauthenticated requests return 401.

Ownership
- Interview records are always constrained by `userId`.
- Interview create/update validate ownership of referenced `applicationId`.
- Cross-user record access returns 404.

Validation + semantics
- Invalid payloads return 400.
- `/interviews/upcoming` returns interviews from now onward.
- Upcoming interviews are sorted by `scheduledAt` asc, then `id` asc.
