# FactFlow Security & Production Audit — AI Agent Guide

## Purpose

This document is a **guided security audit and test plan for FactFlow**.

The AI coding agent must use this document to inspect the **actual repository, code, configuration, database models, routes, middleware, and running API/frontend where possible**, and then execute the relevant tests.

This guide is based on the uploaded **"Emergent Security Prompts — 5 Security Checks Before You Launch Your App"** and has been adapted to FactFlow's actual architecture and features.

The source guide recommends five areas:

1. Secret Leak Prevention
2. Personal Data Flow Audit
3. Pre-Deploy Production Audit
4. Deep Security Audit for Complex Logic
5. Attacker's Perspective Review

FactFlow-specific additions are included for:
- multi-tenant isolation
- Admin / Member authorization
- PIN authentication
- refresh tokens
- invoice/payment logic
- receipt-to-invoice allocation
- OCR
- image/file uploads
- duplicate submissions
- poor-network retries
- NoSQL injection
- concurrency/race conditions

---

# IMPORTANT AGENT RULES

## Rule 1 — Audit first, modify second

Do **not** immediately rewrite or refactor large sections of the application.

First:

1. Inspect the repository.
2. Identify the relevant implementation.
3. Execute/read the relevant tests.
4. Record PASS / FAIL / PARTIAL.
5. Explain the evidence.
6. Only then propose or apply a targeted fix.

Do not "fix" something merely because it looks unusual if it is not actually insecure.

---

## Rule 2 — Never expose secrets

During the audit:

- Never print real API keys.
- Never print passwords.
- Never print PINs.
- Never print JWT secrets.
- Never print refresh tokens.
- Never print MongoDB credentials.
- Never print Cloudinary credentials.
- Never print OCR/AI provider credentials.

Redact sensitive values as:

`[REDACTED]`

---

## Rule 3 — Distinguish facts from assumptions

For every finding, clearly state:

- What was actually verified.
- What was inferred from code.
- What could not be tested.
- What requires manual testing.

Do not mark something PASS simply because the implementation "looks correct."

---

## Rule 4 — Protect real data

If a real production/staging database contains real business data:

- Do not delete records.
- Do not modify real invoices/payments.
- Do not create fake production financial records.
- Prefer a test/staging database for destructive tests.
- Use test tenants for security testing.

---

## Rule 5 — Tenant isolation is the highest-priority check

FactFlow is a multi-tenant application.

Every tenant-owned resource must be isolated.

A valid authenticated user from Tenant A must never be able to:

- read Tenant B data
- update Tenant B data
- delete Tenant B data
- upload a file into Tenant B's record
- attach a payment to Tenant B's invoice
- discover Tenant B's users
- access Tenant B's reports

Test this through the **API**, not only through the UI.

---

# FACTFLOW CONTEXT

The current application includes:

- React / PWA frontend
- Node.js / Express backend
- MongoDB / MongoDB Atlas
- Multi-tenant architecture
- Users
- Tenant memberships
- Admin / Member roles
- Email/password authentication
- PIN login
- JWT authentication
- Refresh-token mechanism
- Invoice/bill capture
- OCR extraction
- Receipt upload
- Invoice/payment matching
- Uploaded bill and receipt files
- Financial calculations

The current security model includes concepts such as:

- `users`
- `tenants`
- `tenantusers`
- `refreshtokens`

The agent must inspect the actual repository rather than relying on this description if the code differs.

---

# AUDIT OUTPUT FORMAT

Before making fixes, produce a report using this structure:

```text
Finding ID:
Severity:
Category:
Status:
Affected file(s):
Affected endpoint(s):
What was tested:
Evidence:
Why it matters:
Recommended fix:
Will the fix require migration?:
```

Severity:

- CRITICAL
- HIGH
- MEDIUM
- LOW
- INFO

Status:

- PASS
- FAIL
- PARTIAL
- NOT TESTED
- NOT APPLICABLE

At the end, provide:

```text
CRITICAL:
HIGH:
MEDIUM:
LOW:
NOT TESTED:
```

---

# PHASE 0 — REPOSITORY RECONNAISSANCE

Before running security tests, inspect the repository.

## 0.1 Identify the architecture

Find:

- frontend directory
- backend directory
- package.json files
- environment files
- Docker files if present
- deployment files
- API entry point
- Express app initialization
- route registration
- middleware registration
- MongoDB connection
- authentication implementation
- file upload implementation
- OCR implementation
- invoice implementation
- payment/receipt implementation

## 0.2 Identify security-sensitive code

Search for:

- `jwt`
- `jsonwebtoken`
- `bcrypt`
- `argon2`
- `refresh`
- `cookie`
- `session`
- `pin`
- `password`
- `tenantId`
- `role`
- `multer`
- file upload handlers
- Cloudinary/S3/storage clients
- OCR API clients
- MongoDB queries
- invoice/payment calculations
- CORS configuration
- Helmet/security headers
- rate limiting

## 0.3 Build an endpoint inventory

List every API endpoint grouped by:

- public
- authenticated
- admin-only
- member-accessible
- internal/system

For every endpoint record:

```text
METHOD
PATH
AUTH REQUIRED?
ROLE REQUIRED?
TENANT SCOPED?
INPUTS
OUTPUT
FILES?
FINANCIAL OPERATION?
```

Do not continue to the deeper audit until this inventory is complete.

---

# CHECK 01 — SECRET LEAK PREVENTION

The source guide's first check focuses on hardcoded credentials, environment variables, frontend exposure, Git history, logs, and API responses.

## SEC-01 — Hardcoded secrets

Search the entire repository for:

- MongoDB URI
- JWT signing secrets
- refresh-token secrets
- OCR API keys
- AI API keys
- Cloudinary API keys/secrets
- passwords
- SMTP credentials
- OAuth secrets
- webhook secrets
- cloud storage credentials

Search source files, configs, tests, scripts and comments.

### Test

A secret must not be embedded as a real value in source code.

### PASS

All sensitive secrets are loaded from environment variables or an appropriate secret manager.

---

## SEC-02 — Environment variables

Inspect:

- `.env`
- `.env.local`
- production configuration
- deployment configuration
- `.env.example`

Verify:

- `.env` is ignored by Git.
- `.env.example` has placeholders only.
- no production secret is inside `.env.example`.

Critical variables should fail startup clearly when missing rather than silently using unsafe values.

---

## SEC-03 — Frontend exposure

Because FactFlow uses React:

Search frontend code and generated production assets for:

- JWT secrets
- MongoDB credentials
- Cloudinary private credentials
- OCR credentials
- server-only API keys

Any secret in client-side JavaScript is considered exposed.

Environment variables intended only for the frontend must contain public-safe values.

---

## SEC-04 — Git history

Search current and recent Git history for secrets.

If a real secret was ever committed:

- mark FAIL
- identify what category of secret was exposed
- do NOT print the actual value
- recommend rotation

Removing a secret from the latest source does not remove it from Git history.

---

## SEC-05 — Logging

Inspect all:

- `console.log`
- logger calls
- error handlers
- API debugging output

Verify they do not log:

- passwords
- PINs
- JWTs
- refresh tokens
- API keys
- MongoDB URIs
- password hashes
- sensitive customer/payment information unless explicitly required

---

## SEC-06 — API responses

Inspect authentication and user endpoints.

Verify responses do not return:

- passwordHash
- pinHash
- refresh token values
- secrets
- internal credentials

Return only what the client needs.

---

# CHECK 02 — PERSONAL & BUSINESS DATA FLOW AUDIT

The source guide asks to map collected data, clean logs, review third-party services, validate password handling, review browser storage, filter responses, and consider deletion/retention.

FactFlow also handles business-sensitive documents.

## DATA-01 — Data inventory

Create a data inventory containing:

- user email
- user name
- customer name
- supplier name
- phone/address if collected
- invoice information
- payment information
- uploaded bill images
- receipt images
- IP/device information
- OCR results
- audit logs

For each item record:

```text
Collected where:
Stored where:
Sent externally:
Why needed:
Retention:
```

---

## DATA-02 — OCR/AI data minimization

Inspect OCR integrations.

Verify that only the required image/data is sent.

Do not send:

- passwords
- auth tokens
- unrelated tenant data
- unnecessary user profile information

---

## DATA-03 — Password/PIN handling

Verify:

- passwords are hashed with bcrypt/Argon2/scrypt or equivalent
- PINs are hashed
- plaintext passwords/PINs never reach logs
- password hashes are never returned to frontend
- PIN hashes are never returned to frontend

---

## DATA-04 — Browser storage

Inspect:

- localStorage
- sessionStorage
- IndexedDB
- cookies

Verify sensitive authentication material is not stored insecurely.

If cookies are used for auth/session data, verify:

- HttpOnly where appropriate
- Secure in production
- appropriate SameSite policy

---

## DATA-05 — Third-party data flow

Identify all external services:

- OCR/AI provider
- image storage
- email provider
- analytics
- error tracking
- WhatsApp integrations if later added

For each provider document:

```text
What FactFlow sends
Why it is sent
Whether it contains PII/business data
Whether secrets are server-only
```

---

## DATA-06 — Retention/deletion

Verify the application has a documented data-retention policy.

The current product is intended to retain historical financial records, so do not add automatic deletion merely because a generic security prompt suggests account deletion.

Instead:

- document the intended retention
- identify what can be deleted/anonymized
- ensure deletion does not break financial history integrity

---

# CHECK 03 — PRE-DEPLOY PRODUCTION AUDIT

## PROD-01 — Startup configuration validation

The application should refuse to start if critical configuration is absent:

- database connection
- JWT/auth secrets
- critical storage config
- critical OCR config if required

No insecure fallback such as:

`JWT_SECRET="secret"`

or similar.

---

## PROD-02 — Debug/test endpoint discovery

Search for:

- `/test`
- `/debug`
- `/seed`
- `/admin`
- `/backdoor`
- sample credentials
- development-only routes
- test data endpoints

Verify none are exposed in production.

---

## PROD-03 — Error responses

Intentionally trigger errors.

Examples:

- invalid ObjectId
- malformed request
- nonexistent record
- unauthorized request
- database failure
- invalid file

Verify the client does NOT receive:

- stack traces
- absolute file paths
- MongoDB query details
- credentials
- internal server configuration

A safe error should look like:

```json
{
  "success": false,
  "message": "Unable to process the request.",
  "requestId": "..."
}
```

Detailed information belongs only in server logs.

---

## PROD-04 — Security headers

Check HTTP responses for appropriate security headers.

For Express, inspect whether Helmet or equivalent protections are configured.

At minimum verify the application deliberately addresses:

- X-Content-Type-Options
- X-Frame-Options / frame-ancestors policy
- Strict-Transport-Security in HTTPS production
- Content-Security-Policy

Do not blindly copy a CSP that breaks the PWA. Test the actual application.

---

## PROD-05 — Rate limiting

Test:

- login
- PIN verification
- refresh
- password reset if implemented
- file upload
- OCR processing
- public endpoints

Verify abusive repeated requests are throttled.

PIN is especially important because it is short-form authentication.

---

## PROD-06 — CORS

Verify CORS allows only intended frontend origin(s).

Do not use:

```text
Access-Control-Allow-Origin: *
```

for authenticated browser APIs unless there is a deliberate, justified reason.

Test:

- allowed frontend origin
- random origin
- malicious origin

---

## PROD-07 — MongoDB security

Verify:

- TLS connection in production
- strong DB credentials
- authentication required
- no unauthenticated public database
- appropriate Atlas network controls where possible
- least-privilege database access

---

# CHECK 04 — DEEP SECURITY AUDIT

This is the highest-value section for FactFlow.

## 4A — AUTHENTICATION

### AUTH-01

Every protected API requires authentication.

Test each protected endpoint without a token.

Expected:

`401 Unauthorized`

---

### AUTH-02

Tampered JWTs fail.

Test:

- changed payload
- changed signature
- expired token
- malformed token
- wrong signing secret

Expected:

`401`

---

### AUTH-03

Refresh tokens

Verify:

- stored hashed
- expire
- revoked on logout if designed that way
- cannot be replayed after revocation
- are associated with the correct user and tenant/session

---

### AUTH-04 — PIN brute force

Test repeated incorrect PIN attempts.

Verify a policy exists for:

- rate limit
- temporary lockout
- account/device protection

Do not simply rely on bcrypt cost to protect a short numeric PIN.

---

# 4B — MULTI-TENANT AUTHORIZATION

## TENANT-01 — Core isolation test

Create:

```text
Tenant A
User A
Invoice A

Tenant B
User B
Invoice B
```

Login as User A.

Attempt:

```text
GET Invoice B
GET Customer B
GET Purchase B
GET Expense B
GET Payment B
GET Report B
```

Expected:

- denied
- or indistinguishable from not found

Never return Tenant B data.

---

## TENANT-02 — ID manipulation

Take a valid Tenant A request:

```text
/invoices/{invoiceA}
```

Replace the ID with Invoice B.

Test:

- GET
- PATCH/PUT
- DELETE
- payment creation
- receipt attachment
- image retrieval

All must fail.

---

## TENANT-03 — tenantId manipulation

Attempt to send:

```json
{
  "tenantId": "TENANT_B"
}
```

from a Tenant A session.

The backend must ignore/reject client-supplied tenant ownership.

Tenant context should come from authenticated server-side membership.

---

## TENANT-04 — Cross-tenant bill numbers

Verify:

```text
Tenant A → Bill 100
Tenant B → Bill 100
```

is allowed.

But:

```text
Tenant A → Bill 100
Tenant A → Bill 100
```

must obey the duplicate-bill rule.

---

## TENANT-05 — Role escalation

Try as Member:

- access reports
- export reports
- retrieve monetary fields
- modify role
- access admin-only endpoints
- modify tenant settings

Role enforcement must occur server-side.

---

# 4C — FINANCIAL LOGIC

## FIN-01 — Never trust frontend totals

Inspect invoice/payment APIs.

Verify the server calculates authoritative:

- received
- pending
- status
- payment allocations

The browser must not be able to submit:

```json
{
  "pending": 0
}
```

and force the invoice to paid.

---

## FIN-02 — Negative values

Attempt:

- negative invoice amount
- negative payment
- negative allocation
- nonsensical zero values where prohibited

Expected:

validation failure.

---

## FIN-03 — Overpayment

Test:

```text
Invoice = ₹10,000
Payment = ₹12,000
```

Verify the application follows an explicit business rule.

Never allow accidental:

`pending = -₹2,000`

unless the product explicitly supports advances/credits.

---

## FIN-04 — Partial payments

Test:

```text
Invoice = ₹20,000
Payment 1 = ₹5,000
Payment 2 = ₹7,000
Payment 3 = ₹8,000
```

Expected:

```text
Received = ₹20,000
Pending = ₹0
Status = Paid
```

History must retain all three payments.

---

## FIN-05 — Duplicate request/idempotency

Send the exact same payment-confirmation request twice.

Expected:

Only one financial operation is created when the request represents the same logical operation.

Test:

- double click
- timeout and retry
- browser refresh
- automatic retry

---

## FIN-06 — Concurrent payment

Two users submit payments against the same invoice at approximately the same time.

Verify the database ends in a consistent state and does not double-spend the outstanding amount.

---

# 4D — MULTI-INVOICE RECEIPTS

FactFlow's real-world receipts can clear multiple invoices.

The system must NOT assume:

```text
1 receipt = 1 invoice
```

Test a receipt such as:

```text
Bill 4217 = ₹8,500
Bill 4218 = ₹12,000
Bill 4221 = ₹4,500
```

Expected extracted structure:

```json
{
  "allocations": [
    {"billNo": "4217", "amount": 8500},
    {"billNo": "4218", "amount": 12000},
    {"billNo": "4221", "amount": 4500}
  ]
}
```

The system must present all allocations for confirmation.

---

## FIN-MULTI-01 — Missing invoice

One extracted bill number does not exist.

Expected:

- do not silently discard it
- show an unresolved allocation
- allow correction/search
- do not save the unresolved payment until resolved

---

## FIN-MULTI-02 — Allocation mismatch

Example:

```text
Receipt total = ₹25,000

Allocations:
₹8,500
₹12,000
₹3,000

Allocation sum = ₹23,500
```

Expected:

Visible mismatch and confirmation blocked until corrected or explicitly handled by a defined rule.

---

## FIN-MULTI-03 — Duplicate bill number on same receipt

Example:

```text
4217 = ₹2,000
4217 = ₹3,000
```

The system must either:

- merge deterministically, or
- preserve two rows and let the user confirm.

Never silently lose one row.

---

# 4E — FILE UPLOAD SECURITY

FactFlow receives images from mobile devices.

## FILE-01 — MIME/type validation

Test:

- valid JPG
- valid JPEG
- PNG
- unsupported format
- corrupted image
- renamed executable file
- fake MIME type
- invalid extension

Validate server-side.

Do not trust only the filename or browser-provided MIME type.

---

## FILE-02 — File size

Test:

- normal image
- extremely large image
- repeated large uploads

Verify the server rejects files over the defined limit.

---

## FILE-03 — Filename/path security

Attempt filenames containing:

```text
../
..\\
%2e%2e
/
\
```

User input must never control arbitrary filesystem paths.

Use generated server-side filenames/IDs.

---

## FILE-04 — Executable uploads

Uploaded files must not become executable server-side code.

Verify upload directories and hosting configuration.

---

## FILE-05 — Storage abuse

Test repeated uploads.

Verify rate limits and quotas/limits are considered so an attacker cannot cheaply fill all storage.

---

# 4F — MONGODB / INPUT SECURITY

Because FactFlow uses MongoDB, specifically test NoSQL injection.

Test suspicious operators in:

- login fields
- search
- filters
- sort fields
- IDs
- query parameters
- request bodies

Examples of suspicious patterns include attempts to inject MongoDB operators.

Never build unrestricted queries from raw user-provided objects.

---

# 4G — XSS / CONTENT INJECTION

Inject harmless test payloads into:

- customer name
- supplier name
- notes
- search fields
- invoice text fields
- expense descriptions
- filenames where rendered

Verify they are rendered as text and never executed as HTML/JavaScript.

---

# CHECK 05 — ATTACKER'S PERSPECTIVE

Pretend you know nothing about the code.

## ATTACK-01

Can you access another tenant's invoice by changing an ID?

## ATTACK-02

Can you call protected APIs with no token?

## ATTACK-03

Can you modify JWT payload/role/tenant information?

## ATTACK-04

Can a Member access Admin functionality?

## ATTACK-05

Can repeated PIN attempts succeed without throttling?

## ATTACK-06

Can you upload unlimited files?

## ATTACK-07

Can you use unsupported/malicious files?

## ATTACK-08

Can you inject HTML/JavaScript?

## ATTACK-09

Can you inject MongoDB operators?

## ATTACK-10

Can you retrieve `.env`?

## ATTACK-11

Can you retrieve `.git`?

## ATTACK-12

Can verbose errors expose internal paths/configuration?

## ATTACK-13

Can you create a negative payment?

## ATTACK-14

Can you pay the same invoice twice by retrying the same request?

## ATTACK-15

Can you change a payment to belong to another invoice/tenant?

## ATTACK-16

Can you modify an invoice after payment in a way that corrupts financial state?

---

# PWA / BROWSER-SPECIFIC CHECKS

Because FactFlow is a PWA, inspect:

- service worker
- cache strategy
- IndexedDB/localStorage/sessionStorage
- cached API responses
- logout behavior
- offline queue behavior
- retry behavior

## PWA-01

Sensitive API responses should not be cached in a way that another user/device context could read.

## PWA-02

Logging out should clear sensitive client-side session state.

## PWA-03

Offline queued operations must not be replayed under the wrong authenticated user/tenant.

## PWA-04

An old cached frontend must not silently use incompatible API contracts.

## PWA-05

Do not store plaintext passwords or PINs in offline storage.

---

# REAL-WORLD FACTORY RELIABILITY TESTS

Security and correctness overlap with the actual operating environment.

Test:

## NET-01

Start invoice upload and disconnect internet.

Expected:

- visible upload state
- safe retry
- no corrupt record
- no duplicate invoice

## NET-02

Disconnect internet while confirming a payment.

Expected:

- no accidental duplicate payment
- user can safely retry

## NET-03

OCR provider times out.

Expected:

- invoice/payment is not silently created with incorrect data
- user sees a recoverable error

## NET-04

Image storage fails after OCR succeeds.

Expected:

- no record should end up claiming a permanently attached image exists when the image was not actually stored
- use a transactional/compensating workflow

---

# DATABASE / INDEX AUDIT

Inspect MongoDB indexes.

Verify at minimum, where applicable:

## Users

```text
unique(email)
```

## Tenants

```text
unique(slug)
```

## TenantUsers

```text
unique(tenantId, userId)
```

## RefreshTokens

```text
TTL(expiresAt)
```

## Invoices

Likely:

```text
tenantId + billNo
tenantId + createdAt
tenantId + status
```

The exact indexes should match actual query patterns.

Do not add indexes blindly.

---

# LOGGING & AUDITABILITY

Inspect whether important security/business events can be traced.

Consider logging:

- successful login
- failed login
- PIN lockout
- logout/revocation
- invoice creation
- invoice update
- payment creation
- payment reversal if supported
- role/permission changes
- tenant setting changes
- suspicious access attempts

Do not log passwords/PINs/tokens.

For financial records, eventually introduce an audit log with:

```text
tenantId
userId
action
entityType
entityId
timestamp
oldValue / changed fields where appropriate
newValue / changed fields where appropriate
requestId
```

Avoid storing unnecessary sensitive document contents in audit logs.

---

# TESTING STRATEGY

Run these tests at three levels.

## Level 1 — Static/code audit

Inspect source code and configuration.

## Level 2 — API integration/security tests

Send actual HTTP requests against a test environment.

## Level 3 — End-to-end browser tests

Use the real PWA flows:

- login
- PIN
- capture bill
- OCR
- confirm invoice
- upload receipt
- allocate payment
- dashboard
- logout

A PASS at one level does not automatically prove PASS at another level.

---

# TEST DATA

Create at least two test tenants:

```text
Tenant A
  Admin A
  Member A
  Invoice A
  Payment A

Tenant B
  Admin B
  Member B
  Invoice B
  Payment B
```

Use deliberately similar records:

```text
Tenant A → Bill 100
Tenant B → Bill 100
```

This makes tenant-crossing bugs easier to detect.

---

# REQUIRED FINAL REPORT

After all tests, produce:

## 1. Executive Summary

- overall status
- whether production-ready
- critical blockers

## 2. Findings

For every FAIL/PARTIAL:

```text
ID
Severity
Problem
Evidence
Impact
Affected code
Recommended fix
```

## 3. Passed checks

List concrete tests that passed.

## 4. Untested checks

Do not hide uncertainty.

## 5. Fix plan

Order fixes:

1. CRITICAL
2. HIGH
3. MEDIUM
4. LOW

## 6. Regression tests

After fixes, re-run every affected test.

---

# DEFINITION OF "READY FOR PRODUCTION"

Do NOT call FactFlow production-ready if any of these remain unresolved:

- cross-tenant data access
- cross-tenant update/delete
- authentication bypass
- role escalation
- leaked secrets
- exposed password/PIN/refresh-token secrets
- arbitrary file upload/execution risk
- negative/forged financial transactions
- duplicate payment vulnerability
- broken multi-invoice receipt allocation
- critical NoSQL injection
- critical XSS
- production debug endpoints
- database publicly exposed without proper authentication/security controls

---

# FINAL INSTRUCTION TO THE AI AGENT

Perform the audit systematically.

**Do not stop after the first issue.**

Do not claim "secure" because a few basic checks pass.

Inspect the codebase, run tests, attack the APIs where safe, test tenant boundaries, test financial logic, inspect uploads, and verify configuration.

For every failure:

1. Explain it.
2. Identify the exact code path.
3. Explain realistic impact.
4. Propose the smallest safe fix.
5. If authorized to modify the code, implement the fix.
6. Re-run the relevant test.
7. Record PASS after the regression test succeeds.

At the end, return a concise security report containing:

```text
TOTAL CHECKS
PASSED
FAILED
PARTIAL
NOT TESTED

CRITICAL FINDINGS
HIGH FINDINGS
MEDIUM FINDINGS
LOW FINDINGS

FIXES APPLIED

REMAINING RISKS

PRODUCTION READINESS:
READY / NOT READY
```

Do not invent evidence.

If a test cannot be run in the current environment, explicitly mark it `NOT TESTED` and explain exactly what needs to be run manually or in staging.
