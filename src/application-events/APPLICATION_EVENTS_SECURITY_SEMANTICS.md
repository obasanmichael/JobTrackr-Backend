Stage 4.5 Security + Error Semantics

Authentication
- All timeline endpoints require JwtAuthGuard.
- Unauthenticated requests return 401.

Ownership
- Event create/list is allowed only for owned applications.
- Event delete is allowed only for owned events.
- Cross-user access returns 404 to avoid record enumeration.

Automatic timeline integrity
- Application status transitions create STATUS_CHANGE events.
- No STATUS_CHANGE event is created when status does not change.

Validation and response safety
- Invalid event payloads return 400.
- Event responses return safe fields only.
- Backend does not trust client-supplied userId/application ownership claims.
