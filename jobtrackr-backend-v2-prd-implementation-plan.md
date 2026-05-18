# JobTrackr Backend V2 PRD + Implementation Plan

## 1. Document Purpose

This document defines the Product Requirements Document (PRD) and implementation plan for **JobTrackr V2 Backend**.

The V1 backend serves as the source of truth for:

- users
- authentication
- job applications
- application timelines
- reminders
- interviews
- dashboard summaries

V2 expands the backend into the intelligence and SaaS foundation for JobTrackr. It will power:

- resume upload, storage, parsing, and candidate profile extraction
- AI resume review and job-specific CV scoring
- job board aggregation and normalized job search
- AI job matching and alerts
- subscription/beta plan infrastructure
- admin dashboard and internal roles
- browser extension APIs
- calendar sync infrastructure
- notifications foundation

The backend remains the source of truth for both web and mobile clients. Mobile and web must consume the same APIs and business rules.

---

## 2. V2 Backend Product Goal

The backend should evolve from a tracker API into a platform API that supports the full job search lifecycle:

```txt
User account
→ Resume upload
→ Candidate profile extraction
→ External job ingestion/search
→ Job matching
→ Resume scoring
→ Saved jobs
→ Tracked applications
→ Calendar/interview sync
→ Extension capture
→ Subscription entitlement
→ Admin oversight
```

---

## 3. V2 Backend Principles

## 3.1 Backend owns business logic

The backend must own:

- authentication and authorization
- user data ownership
- admin permissions
- resume file validation
- resume parsing orchestration
- AI prompt orchestration
- structured AI output validation
- job aggregation normalization
- match scoring
- subscription status
- entitlement checks
- calendar OAuth/token management
- extension API authorization
- notification scheduling
- audit logging

Frontend and mobile clients should only display data and submit user actions.

## 3.2 Expand without breaking V1

V1 endpoints should continue working unless explicitly migrated.

V2 should add modules and endpoints while preserving:

- existing auth flows
- application CRUD
- timeline
- reminders
- interviews
- dashboard summary

## 3.3 Build V2 in slices

Do not implement all modules in one unstructured push.

Recommended sequence:

```txt
V2A: Resume intelligence foundation
V2B: Job board aggregation
V2C: AI matching and review
V2D: Billing/beta entitlements
V2E: Admin dashboard APIs
V2F: Browser extension APIs
V2G: Calendar sync
V2H: Notifications/workers foundation
```

---

## 4. V2 Backend Modules

Recommended NestJS modules:

```txt
resumes
candidate-profiles
resume-reviews
jobs
job-sources
saved-jobs
job-matching
job-alerts
subscriptions
plans
entitlements
billing
admin
admin-team
calendar-integrations
extension
notifications
workers
audit-logs
storage
ai
```

Not every module needs to be fully complex immediately, but the boundaries should be clear.

---

## 5. Data Model Expansion

## 5.1 Resume and Candidate Profile Models

### resumes

Purpose:

Stores uploaded resume file metadata and parsing status.

Suggested fields:

```txt
id
userId
fileName
fileType
fileSize
fileUrl
storageKey
status
parsedText
parseError
isActive
createdAt
updatedAt
```

Statuses:

```txt
UPLOADED
PARSING
PARSED
FAILED
ARCHIVED
```

### candidate_profiles

Purpose:

Stores structured, editable profile extracted from resume.

Suggested fields:

```txt
id
userId
resumeId
headline
summary
skills
tools
roles
industries
yearsOfExperience
locations
workModes
education
certifications
projects
experience
rawExtractedData
isConfirmed
createdAt
updatedAt
```

Important:

The parsed candidate profile should be user-editable. The system should not treat AI extraction as perfect.

---

## 5.2 Resume Review Models

### resume_reviews

Purpose:

Stores AI review outputs.

Suggested fields:

```txt
id
userId
resumeId
jobId
applicationId
type
overallScore
atsScore
keywordScore
structureScore
clarityScore
strengths
weaknesses
missingKeywords
suggestions
improvedBullets
summary
rawAiOutput
status
errorMessage
createdAt
updatedAt
```

Review types:

```txt
GENERAL
JOB_SPECIFIC
```

Status:

```txt
PENDING
COMPLETED
FAILED
```

---

## 5.3 Job Aggregation Models

### job_sources

Purpose:

Tracks external job providers.

Suggested fields:

```txt
id
name
type
baseUrl
isActive
requiresApiKey
lastSyncAt
lastSuccessAt
lastErrorAt
lastErrorMessage
createdAt
updatedAt
```

Source types:

```txt
API
ATS_FEED
MANUAL
SCRAPER_LATER
```

### external_jobs

Purpose:

Stores normalized jobs imported from providers.

Suggested fields:

```txt
id
sourceId
sourceName
externalJobId
title
company
location
country
remoteType
salaryMin
salaryMax
currency
description
requirements
employmentType
experienceLevel
applicationUrl
postedAt
expiresAt
rawPayload
contentHash
isActive
createdAt
updatedAt
```

Important:

Use `contentHash` or provider-specific unique keys to reduce duplicates.

### saved_jobs

Purpose:

Connects a user to a job they saved.

Suggested fields:

```txt
id
userId
externalJobId
status
notes
createdAt
updatedAt
```

Statuses:

```txt
SAVED
DISMISSED
CONVERTED_TO_APPLICATION
```

---

## 5.4 Job Matching Models

### job_match_results

Purpose:

Stores computed match results between a user profile/resume and a job.

Suggested fields:

```txt
id
userId
resumeId
candidateProfileId
externalJobId
applicationId
overallScore
skillScore
experienceScore
locationScore
salaryScore
semanticScore
missingSkills
matchedSkills
reason
recommendation
rawAiOutput
createdAt
updatedAt
```

Reasoning:

This allows the frontend to show match history without recalculating every time.

### job_alert_preferences

Purpose:

Stores user's desired job alert settings.

Suggested fields:

```txt
id
userId
roles
keywords
locations
workModes
salaryMin
salaryCurrency
experienceLevel
frequency
isEnabled
createdAt
updatedAt
```

Frequency:

```txt
DAILY
WEEKLY
REALTIME_LATER
```

---

## 5.5 Subscription and Entitlement Models

### plans

Purpose:

Defines product plans.

Suggested fields:

```txt
id
code
name
description
priceMonthly
currency
isActive
isBeta
createdAt
updatedAt
```

Plan codes:

```txt
BETA_FREE
FREE
PRO
PREMIUM
```

### subscriptions

Purpose:

Stores user's current plan/subscription state.

Suggested fields:

```txt
id
userId
planId
status
provider
providerCustomerId
providerSubscriptionId
betaStartedAt
betaEndsAt
trialEndsAt
currentPeriodStart
currentPeriodEnd
cancelAt
createdAt
updatedAt
```

Statuses:

```txt
BETA
ACTIVE
TRIALING
PAST_DUE
CANCELLED
EXPIRED
```

### feature_entitlements

Purpose:

Defines what each plan can access.

Suggested fields:

```txt
id
planId
featureKey
limitValue
isEnabled
createdAt
updatedAt
```

Feature keys:

```txt
AI_RESUME_REVIEW
JOB_MATCHING
JOB_ALERTS
RESUME_UPLOADS
SAVED_JOBS
CALENDAR_SYNC
BROWSER_EXTENSION
ADMIN_ACCESS
```

### usage_counters

Purpose:

Tracks feature usage.

Suggested fields:

```txt
id
userId
featureKey
period
count
limitValue
createdAt
updatedAt
```

---

## 5.6 Admin Models

### admin_memberships

Purpose:

Allows internal admin team access.

Suggested fields:

```txt
id
userId
role
invitedById
status
createdAt
updatedAt
```

Roles:

```txt
OWNER
ADMIN
SUPPORT
ANALYST
```

### audit_logs

Purpose:

Records sensitive admin/system actions.

Suggested fields:

```txt
id
actorUserId
targetUserId
action
resourceType
resourceId
metadata
ipAddress
userAgent
createdAt
```

---

## 5.7 Calendar Integration Models

### calendar_integrations

Purpose:

Stores connected calendar provider state.

Suggested fields:

```txt
id
userId
provider
providerAccountEmail
accessTokenEncrypted
refreshTokenEncrypted
scope
expiresAt
isActive
lastSyncAt
lastError
createdAt
updatedAt
```

Providers:

```txt
GOOGLE
OUTLOOK_LATER
```

### calendar_events

Purpose:

Maps JobTrackr records to external calendar events.

Suggested fields:

```txt
id
userId
integrationId
sourceType
sourceId
providerEventId
syncStatus
lastSyncedAt
createdAt
updatedAt
```

Source types:

```txt
INTERVIEW
REMINDER_LATER
DEADLINE_LATER
```

---

## 5.8 Browser Extension Models

### extension_sessions

Purpose:

Tracks extension authorization/device sessions.

Suggested fields:

```txt
id
userId
tokenHash
name
lastUsedAt
revokedAt
createdAt
updatedAt
```

### extension_captures

Purpose:

Stores jobs captured from browser extension.

Suggested fields:

```txt
id
userId
url
title
company
description
sourceDomain
status
rawExtractedData
createdApplicationId
createdAt
updatedAt
```

---

## 6. API Endpoint Plan

## 6.1 Resume Endpoints

```txt
POST /api/v1/resumes/upload
GET /api/v1/resumes
GET /api/v1/resumes/:id
PATCH /api/v1/resumes/:id
DELETE /api/v1/resumes/:id
POST /api/v1/resumes/:id/set-active
GET /api/v1/resumes/:id/profile
PATCH /api/v1/resumes/:id/profile
```

Responsibilities:

- validate file
- upload to storage
- create resume record
- start parsing job
- return status
- allow profile editing

---

## 6.2 Resume Review Endpoints

```txt
POST /api/v1/resume-reviews
GET /api/v1/resume-reviews
GET /api/v1/resume-reviews/:id
GET /api/v1/resumes/:id/reviews
```

Request examples:

```txt
type = GENERAL
resumeId = selected resume

type = JOB_SPECIFIC
resumeId = selected resume
externalJobId or applicationId = target job
```

Responsibilities:

- verify ownership
- check entitlements
- check usage limits
- run AI review
- validate structured output
- store result

---

## 6.3 Jobs Endpoints

```txt
GET /api/v1/jobs
GET /api/v1/jobs/:id
POST /api/v1/jobs/:id/save
DELETE /api/v1/saved-jobs/:id
GET /api/v1/saved-jobs
POST /api/v1/saved-jobs/:id/convert-to-application
```

Query filters:

```txt
keyword
location
remoteType
salaryMin
source
postedWithin
experienceLevel
```

Responsibilities:

- return normalized jobs
- expose source metadata
- support filters
- save jobs per user
- convert saved job to tracked application

---

## 6.4 Matching Endpoints

```txt
GET /api/v1/matches
POST /api/v1/matches/generate
GET /api/v1/jobs/:id/match
POST /api/v1/job-alerts/preferences
GET /api/v1/job-alerts/preferences
PATCH /api/v1/job-alerts/preferences
```

Responsibilities:

- compute or retrieve job matches
- rank jobs
- explain recommendation
- store match result
- support alert preferences

---

## 6.5 Billing/Subscription Endpoints

```txt
GET /api/v1/billing/me
GET /api/v1/billing/plans
POST /api/v1/billing/create-checkout-session
POST /api/v1/billing/customer-portal
POST /api/v1/billing/webhook
```

During beta:

- `/billing/me` should show `BETA_FREE`
- checkout can remain disabled or guarded
- admin can manually change plan/beta state

Responsibilities:

- manage plan visibility
- expose entitlement state
- integrate Stripe later/partially
- receive Stripe webhooks when enabled

---

## 6.6 Admin Endpoints

```txt
GET /api/v1/admin/overview
GET /api/v1/admin/users
GET /api/v1/admin/users/:id
PATCH /api/v1/admin/users/:id/role
PATCH /api/v1/admin/users/:id/beta
GET /api/v1/admin/subscriptions
GET /api/v1/admin/jobs
GET /api/v1/admin/job-sources
POST /api/v1/admin/job-sources/:id/sync
GET /api/v1/admin/resumes
GET /api/v1/admin/ai-usage
GET /api/v1/admin/team
POST /api/v1/admin/team/invite
PATCH /api/v1/admin/team/:id
```

Responsibilities:

- require admin role
- return aggregate metrics
- manage beta access
- inspect users
- monitor AI/job source usage
- manage internal admin team

---

## 6.7 Browser Extension Endpoints

```txt
POST /api/v1/extension/connect-token
DELETE /api/v1/extension/connect-token/:id
GET /api/v1/extension/me
POST /api/v1/extension/capture
POST /api/v1/extension/captures/:id/create-application
GET /api/v1/extension/captures
```

Responsibilities:

- authorize extension safely
- capture job pages
- save current job URL
- convert capture to application
- prevent abuse

---

## 6.8 Calendar Endpoints

```txt
GET /api/v1/calendar/status
GET /api/v1/calendar/google/connect
GET /api/v1/calendar/google/callback
POST /api/v1/calendar/disconnect
PATCH /api/v1/calendar/settings
POST /api/v1/calendar/sync/interviews
```

Responsibilities:

- start OAuth flow
- receive OAuth callback
- store encrypted refresh token
- sync interviews to calendar
- disconnect/revoke integration

---

## 7. AI Architecture

## 7.1 AI responsibilities

AI can be used for:

- resume profile extraction
- general resume review
- job-specific resume review
- job description parsing
- recommendation explanation
- missing skills analysis

## 7.2 Structured output required

AI responses should be requested in structured JSON format and validated before storing.

Example structured review shape:

```json
{
  "overallScore": 78,
  "atsScore": 82,
  "strengths": ["Clear technical stack", "Good project descriptions"],
  "weaknesses": ["Limited measurable achievements"],
  "missingKeywords": ["Kubernetes", "CI/CD"],
  "suggestions": [
    {
      "section": "Experience",
      "issue": "Bullet points are task-focused",
      "recommendation": "Rewrite bullets to include impact and metrics"
    }
  ]
}
```

Important:

Never store raw AI output as the only trusted object. Store parsed structured fields plus raw output for debugging.

## 7.3 AI cost controls

Implement:

- entitlement checks
- usage counters
- admin usage monitoring
- request size limits
- retry limits
- caching of review/match results where possible

---

## 8. Job Matching Architecture

Use a hybrid scoring approach:

```txt
Structured profile matching
+ keyword matching
+ semantic similarity
+ AI explanation
```

## 8.1 Matching factors

```txt
Skills match
Role/title match
Experience level fit
Location/work mode fit
Salary fit if available
Education/certification fit if relevant
Semantic similarity between resume and job description
```

## 8.2 Match output

Return:

```txt
overallScore
matchedSkills
missingSkills
reason
recommendation
confidence
```

## 8.3 Important rule

The match score should be framed as an estimate, not a guarantee.

---

## 9. Job Aggregation Architecture

## 9.1 First providers

Start with providers that offer APIs or accessible feeds.

Avoid violating job board terms.

## 9.2 Sync strategy

For V2:

```txt
Manual sync endpoint
Scheduled sync worker later
Store normalized jobs
Deduplicate jobs
Mark stale jobs inactive
```

## 9.3 External job normalization

External jobs from different providers should be normalized into one internal `external_jobs` structure.

Do not expose raw provider format directly to clients.

---

## 10. Subscription/Beta Architecture

## 10.1 Beta plan

All early users can be assigned:

```txt
BETA_FREE
```

With:

```txt
requiresPayment = false
betaEndsAt = configurable
featureAccess = generous limits
```

## 10.2 Stripe integration

Implement foundations:

- provider customer ID
- provider subscription ID
- webhook endpoint
- plan mapping
- subscription status
- billing events

But actual charging can remain disabled until beta ends.

## 10.3 Entitlement checks

Before premium-like actions:

```txt
resume upload
AI resume review
job matching
job alerts
calendar sync
extension usage
```

Backend should check:

```txt
user subscription
plan entitlement
usage counter
```

---

## 11. Admin and Permissions

## 11.1 User roles

Existing normal users should have:

```txt
USER
```

Admin roles:

```txt
OWNER
ADMIN
SUPPORT
ANALYST
```

## 11.2 Permission examples

OWNER:

- full access
- manage admins
- manage billing
- change roles

ADMIN:

- view/manage users
- manage beta/subscriptions
- view AI/job metrics

SUPPORT:

- view users
- limited support actions

ANALYST:

- read-only metrics

## 11.3 Backend guards

Create guards/decorators:

```txt
@Roles('OWNER', 'ADMIN')
RolesGuard
AdminGuard
EntitlementsGuard
```

Frontend guards are not enough.

---

## 12. Security Requirements

## 12.1 File upload security

Backend must enforce:

- max file size
- allowed file types
- scan or restrict executable types
- storage outside public uncontrolled access
- signed URLs if needed
- ownership checks
- rate limits

Allowed initial file types:

```txt
application/pdf
application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

## 12.2 Resume privacy

Resumes contain personal data.

Backend must:

- restrict access to owner/admin with role
- encrypt sensitive integration tokens
- avoid exposing resume file URLs publicly
- log admin access if necessary
- allow deletion

## 12.3 AI security

Backend must:

- avoid sending unnecessary user data to AI provider
- validate AI output
- prevent prompt injection from job descriptions/resumes where possible
- limit input size
- sanitize stored/displayed output
- separate raw content from executable commands

## 12.4 Calendar token security

Calendar refresh/access tokens must be encrypted at rest.

Never return tokens to frontend.

## 12.5 Extension security

Extension APIs must use restricted scoped tokens or normal auth with device/session control.

Do not allow extension tokens to access admin APIs.

Allow revocation.

## 12.6 Admin security

Admin actions require:

- role guard
- audit log
- confirmation on frontend
- backend validation
- no privilege escalation bugs

## 12.7 Billing webhook security

Stripe webhook endpoint must verify webhook signature before trusting events.

---

## 13. Worker/Background Job Requirements

V2 will need background jobs for:

```txt
resume parsing
AI review processing
job aggregation sync
job matching generation
job alert sending
calendar sync
email notifications later
```

For the first V2 pass, these can be simple service methods triggered by endpoints. But the architecture should be ready for workers.

Recommended later:

```txt
BullMQ + Redis
or managed queues
```

Immediate approach:

```txt
Synchronous where fast
Async job status where slow
```

Resume parsing and AI review should ideally have status fields to avoid long request blocking.

---

## 14. Notifications Foundation

Notifications should support:

```txt
in-app notification
email notification later
push notification later
```

Initial notification triggers:

```txt
matched jobs available
resume review completed
job alert digest
calendar sync failed
reminder due
interview upcoming
```

V2 can start with in-app notification records only.

Suggested model:

```txt
notifications
- id
- userId
- type
- title
- message
- readAt
- metadata
- createdAt
```

---

## 15. Implementation Plan

## Phase V2A: Resume Upload, Parsing, and Candidate Profile

### Goal

Build the data foundation for AI matching and resume review.

### Backend tasks

1. Create `resumes` module
2. Create `candidate-profiles` module
3. Add Prisma models and migration
4. Add file upload handling
5. Add file validation
6. Add storage service abstraction
7. Store resume metadata
8. Extract text from PDF/DOCX
9. Store parsed text
10. Create candidate profile extraction service
11. Save structured candidate profile
12. Allow user to edit candidate profile
13. Add active resume support
14. Add ownership checks
15. Add tests

### Acceptance criteria

```txt
Authenticated user can upload resume
Unsupported files are rejected
Resume record is created
Text is extracted
Candidate profile is generated
User can retrieve and edit profile
User can mark active resume
Users cannot access other users' resumes
```

---

## Phase V2B: AI Resume Review

### Goal

Allow users to receive structured AI review.

### Backend tasks

1. Create `resume-reviews` module
2. Add review model/migration
3. Add AI service abstraction
4. Add structured output schema
5. Add general review endpoint
6. Add job-specific review endpoint
7. Add usage counter check
8. Store review result
9. Return review history
10. Add error handling
11. Add tests

### Acceptance criteria

```txt
User can request general review
User can request job-specific review
AI output is structured and validated
Review is stored
User can view review history
Usage limits are respected
```

---

## Phase V2C: Job Aggregation and Search

### Goal

Store and expose normalized external jobs.

### Backend tasks

1. Create `job-sources` module
2. Create `jobs` module
3. Add external jobs schema
4. Add source provider abstraction
5. Add first provider integration
6. Normalize provider data
7. Deduplicate jobs
8. Add job search endpoint
9. Add job detail endpoint
10. Add admin job source health endpoints
11. Add tests

### Acceptance criteria

```txt
External jobs can be imported
Jobs are normalized
Duplicate jobs are reduced
User can search jobs
User can view job detail
Admin can inspect source status
```

---

## Phase V2D: Saved Jobs and Convert to Application

### Goal

Connect job discovery to existing tracker.

### Backend tasks

1. Create `saved-jobs` module
2. Add saved jobs schema
3. Add save/unsave endpoints
4. Add convert-to-application endpoint
5. Ensure converted application uses V1 application module
6. Add timeline event on conversion
7. Add tests

### Acceptance criteria

```txt
User can save external job
User can view saved jobs
User can convert saved job to application
Converted application appears in V1 application tracker
Ownership checks are enforced
```

---

## Phase V2E: Job Matching and Alerts

### Goal

Rank jobs against candidate profile and support alert preferences.

### Backend tasks

1. Create `job-matching` module
2. Add match result schema
3. Build scoring service
4. Add skill match scoring
5. Add location/work mode scoring
6. Add semantic/AI explanation layer
7. Add matches endpoint
8. Add job-specific match endpoint
9. Create job alert preferences schema
10. Add preferences endpoints
11. Add tests

### Acceptance criteria

```txt
User can generate/view matched jobs
Each match has score and reason
Missing skills are shown
User can configure job alert preferences
Matching requires active profile or handles missing profile clearly
```

---

## Phase V2F: Subscription/Beta and Entitlements

### Goal

Prepare SaaS model while keeping beta free.

### Backend tasks

1. Create plans model
2. Create subscriptions model
3. Create entitlements model
4. Seed BETA_FREE, FREE, PRO, PREMIUM
5. Assign BETA_FREE to users
6. Add `/billing/me`
7. Add feature entitlement service
8. Add usage counters
9. Add Stripe customer fields
10. Add checkout endpoint as disabled/feature-flagged or test-only
11. Add webhook endpoint
12. Add tests

### Acceptance criteria

```txt
User has a plan
User can retrieve billing status
Beta access is represented
Entitlement checks work
Premium actions can check access
Stripe foundation exists but charging can remain disabled
```

---

## Phase V2G: Admin APIs

### Goal

Provide internal admin oversight.

### Backend tasks

1. Add roles/admin model if not present
2. Create admin module
3. Add admin guard
4. Add overview metrics endpoint
5. Add users list endpoint
6. Add user detail endpoint
7. Add beta/subscription management endpoint
8. Add job source status endpoint
9. Add AI usage endpoint
10. Add admin team endpoints
11. Add audit logs
12. Add tests

### Acceptance criteria

```txt
Only admins can access admin APIs
Admin can view overview metrics
Admin can view users
Admin can manage beta status
Admin actions are audit logged
Non-admins are forbidden
```

---

## Phase V2H: Browser Extension APIs

### Goal

Support external job capture from browser extension.

### Backend tasks

1. Create extension module
2. Add extension session model
3. Add connect token endpoint
4. Add extension auth guard
5. Add capture endpoint
6. Add create application from capture
7. Add revoke endpoint
8. Add rate limits
9. Add tests

### Acceptance criteria

```txt
User can create extension session
Extension can identify user
Extension can capture current job page
User can convert capture to application
Extension token can be revoked
Extension cannot access admin APIs
```

---

## Phase V2I: Calendar Integration

### Goal

Sync interviews to Google Calendar.

### Backend tasks

1. Create calendar-integrations module
2. Add integration schema
3. Add Google OAuth start endpoint
4. Add OAuth callback endpoint
5. Encrypt tokens before storage
6. Add calendar status endpoint
7. Add disconnect endpoint
8. Add sync interview service
9. Store provider event mapping
10. Add tests

### Acceptance criteria

```txt
User can connect Google Calendar
Tokens are not exposed to frontend
Interview can sync to calendar
Calendar event mapping is stored
User can disconnect integration
```

---

## Phase V2J: Notifications Foundation

### Goal

Prepare for alerts and system notifications.

### Backend tasks

1. Add notifications model
2. Add notification service
3. Add create/read/list endpoints
4. Add mark-as-read endpoint
5. Emit notifications for resume review complete and job matches later
6. Add tests

### Acceptance criteria

```txt
User can see notifications
User can mark notifications read
System can create notifications for key events
```

---

## 16. Testing Plan

## 16.1 Backend Test Types

Use:

- unit tests for services
- integration tests for controllers
- authorization tests
- entitlement tests
- AI output validation tests
- file upload validation tests
- admin permission tests

## 16.2 Required Test Areas

Resume:

```txt
Upload requires auth
Unsupported file type rejected
Oversized file rejected
Resume belongs to current user
Parsed profile can be edited
Other user cannot access resume
```

AI review:

```txt
Review requires entitlement
Review requires resume ownership
Structured output validation works
Failed AI response stored as failed
Usage counter increments
```

Jobs:

```txt
Job provider normalization works
Duplicate jobs handled
Search filters work
Job detail returns normalized data
```

Saved jobs:

```txt
User can save job
User cannot save same job twice incorrectly
User can convert saved job to application
Other user cannot access saved job
```

Matching:

```txt
Match score returns expected structure
Missing profile handled
Missing skills generated
Match result belongs to user
```

Billing:

```txt
New beta user has BETA_FREE
Entitlements returned correctly
Usage limit check works
Webhook rejects invalid signature
```

Admin:

```txt
Non-admin gets 403
Admin can view overview
Support cannot perform owner-only actions
Admin actions create audit logs
```

Extension:

```txt
Extension token is hashed
Revoked token fails
Extension capture creates record
Extension cannot access non-extension APIs beyond allowed scope
```

Calendar:

```txt
OAuth status works
Tokens are encrypted before storage
Sync creates event mapping
Disconnect disables integration
```

---

## 17. Observability and Logging

Add structured logs for:

```txt
resume upload failure
resume parsing failure
AI review failure
job source sync failure
calendar sync failure
billing webhook failure
admin action
extension capture failure
```

Avoid logging:

```txt
raw resume text
access tokens
refresh tokens
passwords
full AI prompts containing sensitive data
```

---

## 18. Environment Variables

Add V2 env variables:

```txt
STORAGE_PROVIDER
STORAGE_BUCKET
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY

OPENAI_API_KEY
AI_MODEL
AI_TIMEOUT_MS

ADZUNA_APP_ID
ADZUNA_APP_KEY

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO
STRIPE_PRICE_PREMIUM

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI

EXTENSION_TOKEN_SECRET
ENCRYPTION_KEY
```

Rules:

- never expose backend secrets to frontend/mobile
- keep `.env.example` updated
- production secrets must be configured in hosting provider dashboard

---

## 19. Deployment Considerations

V2 introduces heavier backend operations.

Consider:

```txt
file storage
AI API latency
job aggregation frequency
worker queue
database indexing
rate limiting
usage limits
admin access control
```

Database indexes to consider:

```txt
external_jobs(title)
external_jobs(company)
external_jobs(location)
external_jobs(sourceId)
external_jobs(postedAt)
saved_jobs(userId)
resumes(userId)
resume_reviews(userId)
job_match_results(userId)
subscriptions(userId)
audit_logs(actorUserId)
```

---

## 20. Final V2 Backend Acceptance Criteria

V2 backend is acceptable when:

```txt
Resume upload/parsing works
Candidate profile extraction and editing works
AI resume review works
Job aggregation/search works
Saved jobs work
Saved jobs convert to applications
Job matching works
Job alerts preferences exist
Beta subscription model exists
Entitlement checks exist
Admin APIs work
Admin roles are enforced
Extension capture APIs exist
Calendar sync foundation exists
Core V2 features have tests
Sensitive data is protected
```

---

## 21. Future V3 Backend Features

After V2:

```txt
Recruiter/company accounts
Multi-tenant workspaces
Workspace billing
Full Stripe customer portal
Advanced notification workers
Email inbox integration
Outlook Calendar integration
Two-way calendar sync
AI cover letter generator
AI interview prep
Public company/job pages
Advanced admin audit log viewer
Abuse/fraud detection
Advanced analytics warehouse
```

---

## 22. Final Notes

V2 should build on the V1 tracker instead of replacing it.

The most important backend principle:

> Every new feature should connect back to the existing user-owned job application system.

Jobs, resumes, AI scores, extension captures, calendar events, subscriptions, and admin oversight should all reinforce the same product story: helping a job seeker move from job discovery to final offer with structure, intelligence, and accountability.
