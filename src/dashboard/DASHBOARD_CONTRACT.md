Stage 6 Dashboard Summary Contract

Endpoint
- GET /api/v1/dashboard/summary

Response shape
- totalApplications: number
- activeApplications: number
- offerCount: number
- rejectionCount: number
- applicationsByStatus:
  - SAVED, APPLIED, SCREENING, INTERVIEW, TECHNICAL_ASSESSMENT, FINAL_INTERVIEW, OFFER, REJECTED, WITHDRAWN
- upcomingReminders: array of reminder summary rows
- upcomingInterviews: array of interview summary rows
- recentEvents: array of event summary rows

Active applications definition
- Active applications are statuses currently in process:
  - APPLIED, SCREENING, INTERVIEW, TECHNICAL_ASSESSMENT, FINAL_INTERVIEW

Ordering semantics
- upcomingReminders: dueDate asc, id asc
- upcomingInterviews: scheduledAt asc, id asc
- recentEvents: createdAt desc, id desc

Ownership semantics
- All aggregates/lists are scoped to authenticated userId only.
- Cross-user data is never included.
