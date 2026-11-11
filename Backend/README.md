# Finance ERP Backend

This project currently implements **Phase 1: Backend Foundation** from the
backend architecture document. Authentication, migrations, business APIs, and
session storage are intentionally deferred to later approved phases.

## Setup

```powershell
cd "D:\Finance ERP\Backend"
npm install
Copy-Item .env.example .env
```

Update `.env` with the MySQL connection values. The configured database must
exist before checking the health endpoint.

## Run

```powershell
npm start
```

The default server address is `http://127.0.0.1:3000`.

## Phase 1 verification

Use Postman with these requests:

| Method | URL | Expected result |
|---|---|---|
| GET | `http://127.0.0.1:3000/` | `200`, API name and version |
| GET | `http://127.0.0.1:3000/api/v1/health` | `200` with `database: "connected"` when MySQL is available |
| GET | `http://127.0.0.1:3000/api/v1/does-not-exist` | `404` with `ROUTE_NOT_FOUND` |
| POST | `http://127.0.0.1:3000/` with malformed JSON and `Content-Type: application/json` | `400` request error |

If MySQL is unavailable, the health endpoint returns `503` with
`DATABASE_UNAVAILABLE`; this makes the database failure explicit while the
server remains available for diagnostics. No authentication or business
endpoints are exposed in this phase.

## Phase 2 database commands

Run these commands from `D:\Finance ERP\Backend`:

```powershell
npm run db:migrate
npm run db:seed
```

The migration creates the normalized InnoDB tables `parishes`, `users`,
`centres`, `groups`, `members`, `contributions`, and `audit_logs`. It also
creates `schema_migrations` to track applied migrations. To roll back the
latest migration:

```powershell
npm run db:rollback
```

The seed data is for development only. The seeded accounts use
`demo-password`; they must not be used in production.

## Phase 3 authentication

Authentication uses MySQL-backed sessions. First request a CSRF token, then
send it in `X-CSRF-Token` for every `POST`, `PATCH`, `PUT`, or `DELETE` request.
Postman must retain cookies between requests.

| Method | URL | Purpose |
|---|---|---|
| GET | `/api/v1/auth/csrf` | Start a session and receive a CSRF token |
| POST | `/api/v1/auth/login` | Authenticate and create a session |
| GET | `/api/v1/auth/me` | Return the safe authenticated user |
| POST | `/api/v1/auth/logout` | Destroy the current session |
| PATCH | `/api/v1/auth/password` | Change the password and destroy the session |

The API never returns password hashes or session identifiers. Cookies are
HttpOnly, SameSite=Lax, and Secure in production. Login is rate limited.

Creating a parish, centre, or group also creates its scoped administrator
account. Use the email and password supplied in the creation form to sign in
with the corresponding role. Hierarchy records created before scoped account
creation was enabled do not receive accounts retroactively.

Development seed credentials:

- Email: `owner@example.test`
- Password: `demo-password`

## Phase 4 authorization

Authorization middleware is available for protected resource routes:

- `requireRoles('owner', ...)` enforces role permissions.
- `requireParishScope()` verifies parish ownership.
- `requireCentreScope()` verifies parish and centre ownership.
- `requireGroupScope()` verifies parish, centre, and group ownership.

Scoped failures return `404 RESOURCE_NOT_FOUND` to avoid leaking whether an
out-of-scope resource exists. Unauthenticated requests return `401`, and
authenticated users with disallowed roles return `403`. Every scope check
queries the database using the authenticated user's scope; browser-supplied
IDs are never accepted without verification.

Deleting a parish as the owner permanently deletes its centres, groups,
members, contributions, parish users, and parish audit records in one
transaction. Centre, group, and member deletion remains blocked when child
records exist.

## Phase 5 hierarchy APIs

All hierarchy endpoints require an authenticated session. State-changing
requests also require the `X-CSRF-Token` header.

| Resource | Endpoints |
|---|---|
| Parishes | `GET/POST /api/v1/parishes`, `GET/PATCH/DELETE /api/v1/parishes/:id`, `PATCH /api/v1/parishes/:id/status` |
| Centres | `GET/POST /api/v1/centres`, `GET/PATCH/DELETE /api/v1/centres/:id`, `PATCH /api/v1/centres/:id/status` |
| Groups | `GET/POST /api/v1/groups`, `GET/PATCH/DELETE /api/v1/groups/:id`, `PATCH /api/v1/groups/:id/status` |
| Members | `GET/POST /api/v1/members`, `GET/PATCH/DELETE /api/v1/members/:id`, `PATCH /api/v1/members/:id/status` |

List endpoints support `page`, `pageSize`, `q`, and `status`. Page size is
capped at 100. Parish creation requires an `administrator` object and
transactionally creates its parish administrator account. Centre, group, and
member parent IDs are derived from the authenticated scope; conflicting IDs
are rejected. Parent deletion is rejected when child records exist.

## Phase 6 contribution APIs

Contribution routes require an authenticated session and CSRF token for
state-changing requests:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/contributions` | List scoped contributions |
| POST | `/api/v1/contributions` | Record a received contribution |
| GET | `/api/v1/contributions/:contributionId` | Retrieve a contribution |
| PATCH | `/api/v1/contributions/:contributionId` | Update a recorded contribution |
| POST | `/api/v1/contributions/:contributionId/void` | Void a contribution with a reason |

List filters include `page`, `pageSize`, `q`, `category`, `method`,
`parishId`, `centreId`, `groupId`, `memberId`, `fromDate`, `toDate`, and
`sort`. Supported methods are `cash`, `m_pesa`, `bank_transfer`, `cheque`,
and `other`.

The member's verified database relationships determine parish, centre, and
group IDs; client-supplied hierarchy IDs are not trusted. Contributions are
never deleted, and voided records retain their reason, actor, timestamp, and
audit history. Voided records must be excluded from normal financial totals.

## Phase 7 dashboards and reports

Dashboard endpoints are role-specific and use the authenticated user's scope:

```text
GET /api/v1/dashboard/owner
GET /api/v1/dashboard/parish
GET /api/v1/dashboard/centre
GET /api/v1/dashboard/group
```

Each dashboard returns active hierarchy counts, non-voided contribution totals,
monthly trends, recent contributions, and child-level summaries. Optional
`fromDate` and `toDate` filters use `YYYY-MM-DD`.

Reports:

```text
GET /api/v1/reports/contributions.csv
GET /api/v1/reports/contributions.summary
GET /api/v1/reports/parishes/:parishId/summary
GET /api/v1/reports/centres/:centreId/summary
GET /api/v1/reports/groups/:groupId/summary
```

Reports use the same tenant scope and date filters as dashboards. CSV reports
return a downloadable `text/csv` response. Voided contributions are excluded
from all dashboard and report financial totals.
