Stage 4.0 Application Events Contract Freeze

Purpose
- Track CRM-style timeline history for each application.

Endpoints
- POST /api/v1/applications/:id/events
- GET /api/v1/applications/:id/events
- DELETE /api/v1/application-events/:eventId

Ownership Rules
- Every timeline event belongs to a user and an application.
- User can only create/list/delete events for resources they own.
- Cross-user access returns 404.

Event Types
- STATUS_CHANGE
- NOTE
- RECRUITER_UPDATE
- INTERVIEW_UPDATE
- REMINDER_CREATED
- GENERAL_UPDATE

Create Event Request
- type: required enum value
- title: required string
- description: optional string

Ordering
- Event list is returned newest-first by createdAt (and id as tie-breaker).
