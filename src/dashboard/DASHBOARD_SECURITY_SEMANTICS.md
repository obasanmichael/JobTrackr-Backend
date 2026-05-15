Stage 6 Dashboard Security + Error Semantics

Authentication
- /api/v1/dashboard/summary requires JwtAuthGuard.
- Unauthenticated requests return 401.

Ownership
- Every aggregation and list query is constrained by userId.
- The endpoint never includes cross-user reminders/interviews/events/applications.

Response stability
- applicationsByStatus always includes every status key, defaulting to 0.
- upcoming/reminder/interview/event arrays default to [].
