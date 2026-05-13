# JobTrackr NestJS Backend PRD + Implementation Plan

## 1. Document Purpose

This document defines the Product Requirements Document (PRD) and implementation plan for the **JobTrackr NestJS backend application**.

The backend will be a monolithic REST API used by both the JobTrackr web application and the future mobile companion app. It will handle authentication, user-owned data, job applications, timelines, reminders, interviews, and dashboard analytics.

This document should guide backend development over the next 3 to 4 days while working simultaneously with the Next.js web frontend.

---

## 2. Product Context

### 2.1 Product Name

**JobTrackr**

### 2.2 Product Positioning

> JobTrackr is a personal CRM for job seekers that helps candidates track job applications, interviews, follow-ups, reminders, and outcomes from one organized dashboard.

### 2.3 Backend Role

The backend is the core business logic layer for JobTrackr.

It is responsible for:

- Authentication
- Authorization
- User management
- Job application data
- Application timeline events
- Follow-up reminders
- Interview tracking
- Dashboard analytics
- Data validation
- Security enforcement

The backend must not trust the frontend. All user ownership checks, validation, and authorization must happen server-side.

---

## 3. MVP Backend Scope

The MVP backend should support:

1. User registration and login
2. JWT authentication
3. Protected routes
4. User-owned job applications
5. CRUD operations for job applications
6. Status pipeline management
7. Automatic timeline event creation on status change
8. Manual timeline event creation
9. Reminder creation and management
10. Interview creation and management
11. Dashboard summary endpoint
12. Basic security hardening
13. Clean API error responses
14. Prisma migrations
15. Deployment readiness

---

## 4. Non-MVP Backend Scope

Do not build these in the first backend version:

- Job board aggregation
- AI CV scoring
- Resume upload/parsing
- Payment subscriptions
- Browser extension APIs
- Email scraping
- Calendar sync
- Advanced notification workers
- Admin dashboard
- Multi-tenant teams
- Recruiter/company accounts

However, the backend structure should not block these future additions.

---

## 5. Backend Architecture

### 5.1 Architecture Style

Use a **modular monolith**.

This means the backend is one deployable NestJS application, but the codebase is separated into clear feature modules.

This is the best approach for the MVP because:

- It is faster than microservices
- It is easier to deploy
- It is easier to reason about
- It still teaches proper backend architecture
- It can later evolve if the product grows

### 5.2 API Style

Use REST API.

REST is appropriate because the MVP is mainly CRUD-based and will be consumed by both web and mobile clients.

### 5.3 Backend Stack

- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT
- **Password Hashing:** Argon2 or bcrypt
- **Validation:** class-validator/class-transformer
- **Security Headers:** Helmet
- **Rate Limiting:** Nest throttler
- **Deployment:** Render, Railway, or Fly.io

---

## 6. Backend Folder Structure

Recommended structure:

```txt
apps/api/
  src/
    auth/
    users/
    applications/
    application-events/
    reminders/
    interviews/
    dashboard/
    prisma/
    common/
      decorators/
      guards/
      filters/
      interceptors/
      enums/
      dto/
    main.ts
    app.module.ts
  prisma/
    schema.prisma
    migrations/
  .env.example
```

---

## 7. Core Backend Modules

## 7.1 Auth Module

### Purpose

Handles user authentication and identity verification.

### Responsibilities

- Register new users
- Login existing users
- Hash passwords
- Validate credentials
- Generate JWT access tokens
- Return authenticated user profile
- Protect routes with JWT guard

### Endpoints

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/auth/me
POST /api/v1/auth/logout
```

### Register Request

```json
{
  "name": "Tolu Obasan",
  "email": "tolu@example.com",
  "password": "StrongPassword123"
}
```

### Login Request

```json
{
  "email": "tolu@example.com",
  "password": "StrongPassword123"
}
```

### Auth Response

```json
{
  "user": {
    "id": "uuid",
    "name": "Tolu Obasan",
    "email": "tolu@example.com"
  },
  "accessToken": "jwt-token"
}
```

If using HttpOnly cookie auth for web, the backend may set the token in a cookie instead of returning it directly. For mobile, the API can return the token so the mobile app can store it securely using Expo SecureStore.

### Reason for Feature

Authentication is required because every user must have private job application records. Without authentication, the product cannot function as a personal CRM.

### Security Requirements

- Never store plain-text passwords
- Never return password hash in API responses
- Use generic login failure messages
- Hash passwords with argon2 or bcrypt
- Validate email format
- Enforce minimum password length
- Use environment variable for JWT secret

---

## 7.2 Users Module

### Purpose

Handles basic user profile data.

### Responsibilities

- Fetch current user
- Return safe user data
- Support future profile updates

### Endpoints

```txt
GET /api/v1/users/me
```

Optional later:

```txt
PATCH /api/v1/users/me
```

### Reason for Feature

The frontend needs a safe way to retrieve the current authenticated user and display account information.

---

## 7.3 Applications Module

### Purpose

Manages job applications owned by a user.

### Responsibilities

- Create application
- Get all applications for current user
- Get one application
- Update application
- Delete application
- Search applications
- Filter by status
- Sort applications
- Enforce user ownership
- Trigger timeline event when status changes

### Endpoints

```txt
POST /api/v1/applications
GET /api/v1/applications
GET /api/v1/applications/:id
PATCH /api/v1/applications/:id
DELETE /api/v1/applications/:id
```

### Query Filters

```txt
GET /api/v1/applications?status=APPLIED
GET /api/v1/applications?search=frontend
GET /api/v1/applications?sort=deadline
```

### Create Application Request

```json
{
  "jobTitle": "Frontend Engineer",
  "companyName": "Acme Inc",
  "jobUrl": "https://example.com/job",
  "location": "Lagos, Nigeria",
  "workMode": "REMOTE",
  "salaryMin": 100000,
  "salaryMax": 250000,
  "currency": "NGN",
  "status": "SAVED",
  "source": "LINKEDIN",
  "deadline": "2026-05-30T00:00:00.000Z",
  "notes": "Looks like a good role."
}
```

### Application Statuses

```txt
SAVED
APPLIED
SCREENING
INTERVIEW
TECHNICAL_ASSESSMENT
FINAL_INTERVIEW
OFFER
REJECTED
WITHDRAWN
```

### Work Modes

```txt
REMOTE
HYBRID
ONSITE
UNSPECIFIED
```

### Sources

```txt
LINKEDIN
COMPANY_WEBSITE
REFERRAL
INDEED
TWITTER
EMAIL
OTHER
```

### Reason for Feature

Applications are the core resource of the product. Every other module — timeline, reminders, interviews, analytics — depends on job applications.

### Security Requirements

Every application query must include the authenticated user's ID.

Bad:

```ts
findUnique({ where: { id } })
```

Good:

```ts
findFirst({ where: { id, userId: currentUser.id } })
```

This prevents users from accessing or modifying another user's applications.

---

## 7.4 Application Events / Timeline Module

### Purpose

Tracks the history of actions and updates for each application.

### Responsibilities

- Add manual timeline notes
- Get timeline events for application
- Create automatic status-change events
- Create events for reminders/interviews when useful
- Enforce ownership

### Endpoints

```txt
POST /api/v1/applications/:id/events
GET /api/v1/applications/:id/events
DELETE /api/v1/application-events/:eventId
```

### Event Types

```txt
STATUS_CHANGE
NOTE
RECRUITER_UPDATE
INTERVIEW_UPDATE
REMINDER_CREATED
GENERAL_UPDATE
```

### Create Event Request

```json
{
  "type": "NOTE",
  "title": "Recruiter replied",
  "description": "Recruiter said they will get back next week."
}
```

### Automatic Status Change Event

When application status changes from `APPLIED` to `SCREENING`, backend should create an event like:

```txt
Status changed from Applied to Screening
```

### Reason for Feature

The timeline makes JobTrackr more than a job list. It gives each application a history, similar to a CRM activity feed.

---

## 7.5 Reminders Module

### Purpose

Manages follow-up reminders and task reminders related to job applications.

### Responsibilities

- Create reminder
- Get reminders
- Get upcoming reminders
- Update reminder
- Mark reminder as completed
- Delete reminder
- Link reminder to application
- Enforce user ownership

### Endpoints

```txt
POST /api/v1/reminders
GET /api/v1/reminders
GET /api/v1/reminders/upcoming
PATCH /api/v1/reminders/:id
DELETE /api/v1/reminders/:id
```

### Create Reminder Request

```json
{
  "applicationId": "uuid",
  "title": "Follow up with recruiter",
  "description": "Send a polite follow-up email.",
  "dueDate": "2026-05-20T09:00:00.000Z"
}
```

### Reason for Feature

Job seekers often forget follow-ups and deadlines. Reminders make the product practically useful and increase user retention.

### MVP Limitation

The MVP does not need real push/email notifications. It only needs in-app reminder tracking.

---

## 7.6 Interviews Module

### Purpose

Tracks interviews connected to job applications.

### Responsibilities

- Create interview
- Get interviews
- Get upcoming interviews
- Update interview
- Delete interview
- Track interview notes/outcome
- Enforce user ownership

### Endpoints

```txt
POST /api/v1/interviews
GET /api/v1/interviews
GET /api/v1/interviews/upcoming
PATCH /api/v1/interviews/:id
DELETE /api/v1/interviews/:id
```

### Create Interview Request

```json
{
  "applicationId": "uuid",
  "stage": "TECHNICAL_INTERVIEW",
  "interviewType": "VIDEO",
  "scheduledAt": "2026-05-22T13:00:00.000Z",
  "location": null,
  "meetingLink": "https://meet.example.com/abc",
  "notes": "Prepare React and system design questions."
}
```

### Interview Stages

```txt
RECRUITER_SCREEN
TECHNICAL_INTERVIEW
TECHNICAL_ASSESSMENT
HIRING_MANAGER
FINAL_INTERVIEW
OFFER_DISCUSSION
OTHER
```

### Interview Types

```txt
PHONE
VIDEO
ONSITE
TAKE_HOME
LIVE_CODING
OTHER
```

### Reason for Feature

Interview tracking is one of the key features that separates JobTrackr from a basic spreadsheet. It helps users prepare and remember context for every role.

---

## 7.7 Dashboard Module

### Purpose

Provides analytics and overview data for the web/mobile dashboard.

### Responsibilities

- Count total applications
- Count active applications
- Count offers/rejections
- Group applications by status
- Return upcoming reminders
- Return upcoming interviews
- Return recent timeline events

### Endpoint

```txt
GET /api/v1/dashboard/summary
```

### Example Response

```json
{
  "totalApplications": 24,
  "activeApplications": 11,
  "offerCount": 1,
  "rejectionCount": 5,
  "applicationsByStatus": {
    "SAVED": 4,
    "APPLIED": 8,
    "SCREENING": 3,
    "INTERVIEW": 2,
    "TECHNICAL_ASSESSMENT": 1,
    "FINAL_INTERVIEW": 1,
    "OFFER": 1,
    "REJECTED": 5,
    "WITHDRAWN": 0
  },
  "upcomingReminders": [],
  "upcomingInterviews": [],
  "recentEvents": []
}
```

### Reason for Feature

The dashboard makes the product feel useful immediately. It gives users visibility into their search progress and supports the CRM positioning.

---

## 8. Database Design

Use PostgreSQL with Prisma.

## 8.1 User Model

```prisma
model User {
  id           String           @id @default(uuid())
  name         String
  email        String           @unique
  passwordHash String
  applications JobApplication[]
  events       ApplicationEvent[]
  reminders    Reminder[]
  interviews   Interview[]
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
}
```

## 8.2 JobApplication Model

```prisma
model JobApplication {
  id          String              @id @default(uuid())
  userId      String
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobTitle    String
  companyName String
  jobUrl      String?
  location    String?
  workMode    WorkMode            @default(UNSPECIFIED)
  salaryMin   Int?
  salaryMax   Int?
  currency    String?             @default("USD")
  status      ApplicationStatus   @default(SAVED)
  source      ApplicationSource?  @default(OTHER)
  deadline    DateTime?
  notes       String?
  events      ApplicationEvent[]
  reminders   Reminder[]
  interviews  Interview[]
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  @@index([userId])
  @@index([status])
  @@index([companyName])
}
```

## 8.3 ApplicationEvent Model

```prisma
model ApplicationEvent {
  id            String          @id @default(uuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  applicationId String
  application   JobApplication  @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  type          EventType
  title         String
  description   String?
  createdAt     DateTime        @default(now())

  @@index([userId])
  @@index([applicationId])
}
```

## 8.4 Reminder Model

```prisma
model Reminder {
  id            String          @id @default(uuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  applicationId String
  application   JobApplication  @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  dueDate       DateTime
  isCompleted   Boolean         @default(false)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([userId])
  @@index([applicationId])
  @@index([dueDate])
}
```

## 8.5 Interview Model

```prisma
model Interview {
  id            String          @id @default(uuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  applicationId String
  application   JobApplication  @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  stage         InterviewStage
  interviewType InterviewType
  scheduledAt   DateTime
  location      String?
  meetingLink   String?
  notes         String?
  outcome       String?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([userId])
  @@index([applicationId])
  @@index([scheduledAt])
}
```

## 8.6 Enums

```prisma
enum ApplicationStatus {
  SAVED
  APPLIED
  SCREENING
  INTERVIEW
  TECHNICAL_ASSESSMENT
  FINAL_INTERVIEW
  OFFER
  REJECTED
  WITHDRAWN
}

enum WorkMode {
  REMOTE
  HYBRID
  ONSITE
  UNSPECIFIED
}

enum ApplicationSource {
  LINKEDIN
  COMPANY_WEBSITE
  REFERRAL
  INDEED
  TWITTER
  EMAIL
  OTHER
}

enum EventType {
  STATUS_CHANGE
  NOTE
  RECRUITER_UPDATE
  INTERVIEW_UPDATE
  REMINDER_CREATED
  GENERAL_UPDATE
}

enum InterviewStage {
  RECRUITER_SCREEN
  TECHNICAL_INTERVIEW
  TECHNICAL_ASSESSMENT
  HIRING_MANAGER
  FINAL_INTERVIEW
  OFFER_DISCUSSION
  OTHER
}

enum InterviewType {
  PHONE
  VIDEO
  ONSITE
  TAKE_HOME
  LIVE_CODING
  OTHER
}
```

---

## 9. Security Requirements

Security must be included from the start.

## 9.1 Authentication

- Use JWT for protected routes
- Use strong JWT secret from environment variable
- Do not hardcode secrets
- Attach authenticated user to request context
- Use auth guard on protected routes

## 9.2 Password Security

- Store `passwordHash`, never password
- Use argon2 or bcrypt
- Minimum password length: 8 characters
- Return generic login error
- Do not return passwordHash from any endpoint

## 9.3 Authorization

Every user-owned resource must be checked against `userId`.

Affected resources:

```txt
job_applications
application_events
reminders
interviews
```

Example rule:

```txt
A user can only read, update, or delete records where record.userId equals authenticatedUser.id.
```

## 9.4 Input Validation

Use DTOs with validation decorators.

Validation should cover:

- Email format
- Password length
- Required fields
- Enum values
- URL format
- Date format
- Salary min/max logic
- String length limits

Global validation pipe:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

## 9.5 CORS

Development allowed origins:

```txt
http://localhost:3000
http://localhost:8081
```

Production allowed origins:

```txt
https://your-jobtrackr-web-domain.vercel.app
```

Avoid using wildcard CORS in production.

## 9.6 Security Headers

Use Helmet:

```ts
app.use(helmet());
```

## 9.7 Rate Limiting

Add throttling for sensitive endpoints:

```txt
POST /auth/login
POST /auth/register
```

## 9.8 Environment Variables

Required variables:

```txt
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=
PORT=
NODE_ENV=
CORS_ORIGIN=
FRONTEND_URL=
```

Optional later:

```txt
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=
```

## 9.9 Error Handling

Errors should be user-safe.

Bad:

```txt
PrismaClientKnownRequestError: Unique constraint failed
```

Good:

```txt
An account with this email already exists.
```

---

## 10. API Versioning

Use API version prefix:

```txt
/api/v1
```

Example:

```txt
/api/v1/auth/login
/api/v1/applications
/api/v1/dashboard/summary
```

Reason:

This makes the backend more professional and allows future breaking changes to be introduced under `/api/v2`.

---

## 11. Implementation Order for 3 to 4 Days

## Day 1: Backend Foundation + Auth

### Goals

- Initialize NestJS backend
- Set up Prisma/PostgreSQL
- Create user model
- Implement authentication
- Add security basics

### Tasks

1. Create NestJS app in `apps/api`
2. Install dependencies:
   - Prisma
   - Prisma Client
   - class-validator
   - class-transformer
   - Passport/JWT packages
   - argon2 or bcrypt
   - helmet
   - throttler
3. Set up `.env` and `.env.example`
4. Create Prisma schema with User model
5. Run first migration
6. Create Prisma module/service
7. Create Auth module
8. Create Users module
9. Implement register endpoint
10. Implement login endpoint
11. Implement JWT strategy/guard
12. Implement `/auth/me`
13. Add global validation pipe
14. Add Helmet
15. Configure CORS
16. Add API prefix `/api/v1`
17. Add health endpoint

### Deliverables

- Backend runs locally
- Database connection works
- User can register
- User can login
- JWT-protected route works
- `/api/v1/health` works

---

## Day 2: Applications Module

### Goals

- Implement core job application functionality
- Enforce ownership
- Add search/filter
- Prepare frontend integration

### Tasks

1. Add JobApplication model and enums to Prisma
2. Run migration
3. Create Applications module
4. Create DTOs:
   - CreateApplicationDto
   - UpdateApplicationDto
   - ApplicationQueryDto
5. Implement create application
6. Implement get all applications for current user
7. Implement get one application
8. Implement update application
9. Implement delete application
10. Add search by job title/company
11. Add filter by status
12. Add sort by deadline/createdAt
13. Ensure all queries include `userId`
14. Test endpoints using Postman/Insomnia

### Deliverables

- Authenticated user can create job application
- Authenticated user can view own applications
- Authenticated user can update/delete own applications
- User cannot access another user's applications
- Search/filter works

---

## Day 3: Timeline, Reminders, Interviews

### Goals

- Add CRM-like activity tracking
- Add follow-up reminders
- Add interview tracking

### Tasks

1. Add ApplicationEvent model and enum
2. Add Reminder model
3. Add Interview model and enums
4. Run migration
5. Create ApplicationEvents module
6. Create Reminders module
7. Create Interviews module
8. Implement manual timeline event creation
9. Implement get application events
10. Add automatic timeline event when application status changes
11. Implement reminder CRUD
12. Implement upcoming reminders endpoint
13. Implement interview CRUD
14. Implement upcoming interviews endpoint
15. Ensure all resources are user-owned
16. Add timeline event when reminder/interview is created if useful
17. Test complete flow

### Deliverables

- Timeline events work
- Status changes create timeline events
- Reminders work
- Interviews work
- Upcoming reminders/interviews work

---

## Day 4: Dashboard, Hardening, Deployment Prep

### Goals

- Add dashboard analytics
- Improve reliability
- Prepare for frontend deployment and production environment

### Tasks

1. Create Dashboard module
2. Implement `/dashboard/summary`
3. Count total applications
4. Count active applications
5. Count offers/rejections
6. Group applications by status
7. Return upcoming reminders
8. Return upcoming interviews
9. Return recent timeline events
10. Improve error handling
11. Review DTO validation
12. Review ownership checks
13. Add seed/demo data script if useful
14. Prepare production migration command
15. Prepare deployment environment variables
16. Test all endpoints end-to-end
17. Update backend README

### Deliverables

- Dashboard summary works
- Backend is ready for web frontend integration
- Backend is deployable
- Security basics are in place

---

## 12. Endpoint Checklist

### Auth

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/auth/me
POST /api/v1/auth/logout
```

### Users

```txt
GET /api/v1/users/me
```

### Applications

```txt
POST /api/v1/applications
GET /api/v1/applications
GET /api/v1/applications/:id
PATCH /api/v1/applications/:id
DELETE /api/v1/applications/:id
```

### Application Events

```txt
POST /api/v1/applications/:id/events
GET /api/v1/applications/:id/events
DELETE /api/v1/application-events/:eventId
```

### Reminders

```txt
POST /api/v1/reminders
GET /api/v1/reminders
GET /api/v1/reminders/upcoming
PATCH /api/v1/reminders/:id
DELETE /api/v1/reminders/:id
```

### Interviews

```txt
POST /api/v1/interviews
GET /api/v1/interviews
GET /api/v1/interviews/upcoming
PATCH /api/v1/interviews/:id
DELETE /api/v1/interviews/:id
```

### Dashboard

```txt
GET /api/v1/dashboard/summary
```

### Health

```txt
GET /api/v1/health
```

---

## 13. Backend Acceptance Criteria

The backend MVP is complete when:

```txt
User can register
User can login
Protected routes work
Password is hashed
JWT auth works
Applications CRUD works
Application ownership is enforced
Search/filter applications work
Timeline events work
Status changes create timeline event
Reminders CRUD works
Upcoming reminders endpoint works
Interviews CRUD works
Upcoming interviews endpoint works
Dashboard summary endpoint works
Validation pipe is enabled
CORS is configured
Helmet is enabled
Environment variables are used
Prisma migrations work
Backend can be deployed
```

---

## 14. Testing Plan

### Manual Testing

Use Postman/Insomnia for:

```txt
Register user
Login user
Get current user
Create application
Get applications
Update application status
Confirm timeline event created
Create reminder
Mark reminder complete
Create interview
Get dashboard summary
Try accessing record from another user
```

### Important Authorization Test

Create two users.

Then:

```txt
User A creates application
User B tries to fetch User A's application by ID
Backend must return 404 or forbidden response
```

This test is critical.

---

## 15. Deployment Plan

Recommended deployment:

```txt
Backend: Render or Railway
Database: Neon or Railway Postgres
Frontend: Vercel
```

Production setup:

1. Create hosted PostgreSQL database
2. Set `DATABASE_URL`
3. Deploy backend
4. Run `prisma migrate deploy`
5. Set JWT secrets
6. Set CORS origin to frontend URL
7. Test `/api/v1/health`
8. Test auth endpoints
9. Connect frontend to production API

---

## 16. Future Backend Features

After MVP:

```txt
Refresh tokens
Forgot password
Email verification
Notification system
Email reminders
Job board aggregation
Saved external jobs
Resume upload
AI CV review
Job-to-CV match scoring
Calendar sync
Advanced analytics
Export data
Admin dashboard
Subscription billing
```

---

## 17. Future Database Tables

For job board:

```txt
external_jobs
saved_jobs
job_sources
```

For AI CV review:

```txt
resumes
resume_reviews
job_match_reports
```

For notifications:

```txt
notifications
notification_preferences
```

Do not add these tables during MVP unless required.

---

## 18. Final Notes

The backend must be treated as the source of truth.

The frontend should never be trusted to enforce data ownership or security. Every protected backend endpoint must validate the authenticated user and check ownership of requested records.

The goal is to build a backend that is simple enough to complete quickly but structured enough to show real engineering judgment.
