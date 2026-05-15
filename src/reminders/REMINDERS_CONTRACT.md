Stage 5.0 Reminders Contract Freeze

Endpoints
- POST /api/v1/reminders
- GET /api/v1/reminders
- GET /api/v1/reminders/upcoming
- PATCH /api/v1/reminders/:id
- DELETE /api/v1/reminders/:id

Ownership semantics
- Reminder records are always user-owned.
- Reminder create/update requires an application owned by the same user.
- Cross-user access returns 404.

Validation
- `applicationId` must be a valid UUID.
- `title` is required.
- `dueDate` must be a valid date.
