Stage 5.6 Reminders Security + Error Semantics

Authentication
- All reminders endpoints require JwtAuthGuard.
- Unauthenticated requests return 401.

Ownership
- Reminder records are always constrained by `userId`.
- Reminder create/update validate ownership of referenced `applicationId`.
- Cross-user record access returns 404.

Validation + semantics
- Invalid payloads return 400.
- `/reminders/upcoming` returns uncompleted reminders from now onward.
- Upcoming reminders are sorted by `dueDate` asc, then `id` asc.
