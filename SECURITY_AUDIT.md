# SECURITY_AUDIT.md — FactFlow Security Audit

## Context

This audit is based on five professional security frameworks filtered specifically for FactFlow.
Some checks from the original frameworks do not apply to this app and are excluded with reasons.
Everything listed here is directly relevant to what FactFlow does and how it is built.

What FactFlow is: a multi-tenant MERN SaaS with JWT plus PIN authentication, role-based access,
image uploads to Cloudinary, OCR via Google Vision API, and MongoDB. It has no payment processing,
no SQL database, and no smart contracts. The audit is scoped accordingly.

Run every section below in order. For every issue found, report the file name, the exact problem,
the correct behaviour, and fix it before moving to the next section.

---

## What Was Excluded and Why

Stripe and payment webhook checks from Prompt 4 do not apply — FactFlow has no payment
processing built into the app itself. The billing between Kaleem and his customers is tracked but
no money flows through the application.

SQL injection checks from Prompt 4 do not apply — FactFlow uses MongoDB with Mongoose, not
a SQL database. MongoDB operator injection is covered separately below.

Smart contract checks from Prompt 4 do not apply — there are no smart contracts.

Supabase RLS checks from Prompt 1 do not apply — FactFlow uses MongoDB, not Supabase.

User data deletion flow from Prompt 2 is partially excluded — the app has a super admin tenant
deletion flow that handles this. Verify that flow works but do not build a self-service user deletion
feature as it is out of scope.

Free trial manipulation and referral abuse from Prompt 5 do not apply — FactFlow has no free
trial system, no promo codes, and no referral mechanism.

---

## Audit 1 — Secret Leak Prevention

This covers all hardcoded credentials, API keys, and sensitive values across the entire codebase.

Go through every file in the backend and frontend. Find every place where a string value is used
that could be a credential, key, token, URL with credentials embedded, or secret of any kind.

Check the MongoDB connection URI. It must come exclusively from the MONGODB_URI environment
variable. It must never appear as a string literal in any source file including config files, utility
functions, or comments.

Check the JWT secret. It must come from the JWT_SECRET environment variable. It must not have
a fallback value like the string "secret" or "jwt_secret" or any other hardcoded default. If the
environment variable is missing the application must refuse to start, not fall back to an insecure
default.

Check the Cloudinary credentials. The cloud name, API key, and API secret must all come from
environment variables. None of these three values should appear anywhere in source code.

Check the Google Vision API key. It must come from an environment variable. It must never appear
in any source file. It must also never be sent to the frontend or appear in any API response.

Check the super admin key. It must come from an environment variable. It must never be hardcoded.
It must never appear in any log output, error message, or API response under any circumstance.

Check the frontend environment variables. In a React Vite application, any environment variable
prefixed with VITE_ is exposed to the browser and visible to anyone who inspects the built
JavaScript bundle. Verify that only the API base URL and the app domain use the VITE_ prefix.
The Google Vision API key, Cloudinary API secret, JWT secret, MongoDB URI, and super admin key
must never use the VITE_ prefix. They belong only in the backend environment.

Check console.log and logger statements across the entire codebase. If any log statement outputs
a value that came from environment variables, a token, a key, or any credential — remove it.

Check that the .env file is listed in .gitignore. Verify the .env.example file exists with all required
variable names listed but with placeholder values, not real values.

Check the git history for any previously committed secrets. If any real credential was ever
committed, add a clear note in the README that those credentials must be rotated immediately
regardless of whether they are still in use.

Report every secret found, its location, and confirm it has been moved to environment variables.

---

## Audit 2 — Personal and Business Data Flow

FactFlow handles sensitive business data — factory financial records, invoice amounts, customer
names, supplier names, and business totals. This is not consumer personal data but it is
confidential commercial data that must be treated with equivalent care.

Map every piece of sensitive data the app collects and trace where it goes after collection.

The sensitive data in FactFlow includes: user email addresses, bcrypt password hashes, bcrypt PIN
hashes, refresh token hashes, factory financial amounts including invoice totals, payment amounts,
and pending balances, customer names on invoices, supplier names on purchases, bill numbers,
and business report totals.

Check every console.log, error handler, and logger in the backend. None of these should output
any of the above data. Bill numbers, customer names, amounts, email addresses, and anything
from req.body that contains business data must not appear in any log. Replace any such log with
a generic message or a non-sensitive identifier like a document ID only.

Check every API response. Password hashes and PIN hashes must never appear in any response
under any circumstances. The Mongoose schema should use select: false on these fields. Verify
that every controller function that queries users or tenant users explicitly excludes these fields.
If there is any populate call that joins user or tenant user data into another document's response,
verify those joined documents also exclude the hashed fields.

Check what the invoice list endpoint returns for the member role. The response must not include
totalAmount, amountReceived, or amountPending for member role requests. This exclusion must
happen in the controller before the response is sent, not only in the frontend. A member making
a direct API call with their valid token must receive a response with these fields absent.

Check what the reports endpoints return. These endpoints must be completely inaccessible to the
member role. They must return 403 for any request from a member role JWT regardless of any
other conditions.

Check third-party integrations for data leakage. When an image is sent to Google Vision for OCR,
only the image URL is sent — no user data, no tenant data, no financial data travels to Google.
Verify this is the case. When images are uploaded to Cloudinary, the folder structure includes the
tenantId but no customer names, bill numbers, or amounts should appear in the Cloudinary
metadata or tags unless explicitly needed.

Check cookie security on the refresh token cookie. It must have httpOnly set to true so client-side
JavaScript cannot read it. It must have secure set to true in production so it only transmits over
HTTPS. It must have sameSite set to strict or lax to prevent cross-site request forgery. If any of
these flags are missing, set them.

Report what data is collected, where it is stored, what goes to third parties, and what was fixed.

---

## Audit 3 — Pre-Deploy Production Checklist

Check every item below and report pass or fail for each one before fixing failures.

Environment variables: verify the application refuses to start if any of the following are missing —
MONGODB_URI, JWT_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
CLOUDINARY_API_SECRET, GOOGLE_VISION_API_KEY, SUPER_ADMIN_KEY. If the app currently
starts with undefined values for any of these, add startup validation that checks for all required
variables and exits the process with a clear error message listing the missing variables.

Debug code removal: search the entire codebase for console.log statements that were added
during development and are not part of intentional error handling. Remove them. Search for
commented-out code blocks that were left in. Remove them. Search for TODO and FIXME comments
that reference incomplete security features or unfinished auth logic — resolve them or flag them
explicitly. Search for any route paths that suggest test or debug functionality such as /test,
/debug, /seed, /reset-data, or similar. Remove or protect them.

Error handling: verify that no error response sent to the client includes a stack trace, a Mongoose
error object, a MongoDB error with query details, a file path from the server, or any internal
implementation detail. The global error handler must strip all of this before sending. In development
mode the full error can be included. In production only a generic message and optionally a
correlation ID should reach the client.

Security headers: verify that the backend uses the Helmet middleware for Express. Helmet sets
the following headers automatically: X-Content-Type-Options to prevent MIME type sniffing,
X-Frame-Options to prevent clickjacking, Strict-Transport-Security to enforce HTTPS, and a
Content-Security-Policy. If Helmet is not installed, install it and apply it as early middleware in
app.js. Verify it is applied before any route definitions.

Rate limiting: verify that rate limiting is applied to the following routes at a minimum —
the email and password login route, the PIN login route, the tenant registration route, and the
super admin key entry path. The limits must be enforced per IP address. For login routes, five
attempts per minute per IP is the minimum threshold. For the PIN login route specifically, the limit
must be tight because PINs are short and brute-forceable. If rate limiting is not applied to the PIN
login route, this is a high severity issue. Fix it immediately.

CORS configuration: verify that the CORS middleware is not configured to allow all origins using
a wildcard. The allowed origins must come from the ALLOWED_ORIGINS environment variable.
In production this should be only the specific frontend domain. Verify that preflight requests are
handled correctly.

Database connection: verify the MongoDB connection uses TLS. MongoDB Atlas connections use
TLS by default but verify the connection string does not disable it with the tls=false parameter
or the ssl=false parameter. Verify no MongoDB credentials appear in the connection string in
any source file.

Report each check with pass or fail and list everything that was fixed.

---

## Audit 4 — Deep Security Audit for FactFlow-Specific Logic

This app has custom JWT plus PIN authentication, role-based access control, multi-tenant data
isolation, and file upload handling. These are the complex logic paths that need the deepest scrutiny.

Authentication and authorization — verify that every protected route and API endpoint has the
JWT verification middleware applied before any controller logic runs. Go through every route file
and confirm no route is accidentally unprotected. Then verify that admin-only routes have the
role check middleware applied in addition to the JWT check.

Insecure Direct Object Reference — this is the most likely attack vector in a multi-tenant app. For
every endpoint that accepts a document ID as a URL parameter or in the request body, verify that
the database query includes both the document ID and the tenantId from the authenticated request.
An attacker who knows or guesses a MongoDB ObjectId belonging to another tenant must receive
a 404 or 403 response, not the document. Check this for invoice fetch, invoice update, invoice
delete, payment delete, purchase fetch, purchase update, purchase delete, purchase payment
delete, and expense update and delete. Every single one must scope its query by tenantId.

Check for the same IDOR vulnerability in the payment creation and purchase payment creation
flows. When a payment is submitted with an invoiceId, the lookup of that invoice must verify it
belongs to the current tenant before the payment is created. Without this check, a member of
one tenant could create payments that reference another tenant's invoices by guessing ObjectIds.

PIN brute force — a 4-digit PIN has 10,000 possible values. A 6-digit PIN has 1,000,000. Without
rate limiting, an attacker with a valid userId and tenantSlug could try all values programmatically
in minutes. Verify rate limiting is applied to the PIN login endpoint specifically. Also verify that
failed PIN attempts do not reveal whether the userId was valid — the error message should be
generic for both invalid PIN and invalid user.

JWT handling — verify the JWT signing secret is at least 32 characters and is genuinely random,
not a dictionary word or common phrase. Verify the access token expiry is set to 15 minutes or
less. Verify that logout deletes the refresh token from the database rather than only clearing the
client-side cookie — otherwise a stolen refresh token remains valid until it expires naturally after
30 days.

MongoDB operator injection — this is the MongoDB equivalent of SQL injection. If any field from
req.body is passed directly into a Mongoose query without sanitization, an attacker can send an
object like the value being a MongoDB operator instead of a string. For example a login attempt
where the email field value is a MongoDB greater-than operator object would match all users.
Verify that the express-mongo-sanitize middleware is installed and applied before any route
definitions in app.js. If it is not installed, install it. This middleware strips MongoDB operators
from req.body, req.params, and req.query before they can reach controller logic.

File upload security — verify that the Multer middleware enforces file type checking by MIME type
on the server side, not by file extension alone because extensions can be faked. The allowed MIME
types are image/jpeg, image/jpg, image/png, and image/webp. Any other MIME type must be
rejected with a 400 response before the file reaches any other processing. Verify the file size
limit is enforced at the Multer level. Verify that uploaded files are streamed directly to Cloudinary
from the server's memory and are never written to the server's disk. If they are being written to
disk temporarily, ensure they are deleted immediately after processing regardless of whether the
processing succeeds or fails.

Cross-site scripting — verify that any user-provided text stored in the database and later returned
in API responses is not rendered as raw HTML anywhere in the frontend. Customer names, supplier
names, bill numbers, and descriptions entered by users must be rendered as text content, not as
innerHTML or dangerouslySetInnerHTML. If any React component uses dangerouslySetInnerHTML
with data that came from an API response, that is an XSS vulnerability. Find and fix it.

Report every vulnerability found with its location, how an attacker would exploit it, and confirm
the fix.

---

## Audit 5 — Attacker Perspective Review

Think like someone trying to break FactFlow. Go through each attack path below.

Data access via ID manipulation — take every endpoint that accepts an ID parameter. For each
one, simulate a request where the ID belongs to a different tenant's document. The expected result
is 404 or 403. If the actual result would be the document being returned, that is a critical security
vulnerability. Check: GET /api/invoices/:id, PUT /api/invoices/:id, DELETE /api/invoices/:id,
GET /api/purchases/:id, PUT /api/purchases/:id, DELETE /api/purchases/:id, DELETE
/api/payments/:id, DELETE /api/purchase-payments/:id, PUT /api/expenses/:id, DELETE
/api/expenses/:id, and GET /api/tenants/me.

Login bypass — check every route in the backend and verify that none of them accidentally work
without a valid JWT. A request with no Authorization header, an expired token, a malformed token,
or a token signed with the wrong secret must all receive a 401 response. Verify the JWT middleware
checks all of these conditions. Also verify that a member role token cannot access admin routes —
a 403 must be returned.

Privilege escalation via JWT tampering — JWT tokens can be decoded by anyone who has one.
The payload contains the role field. Verify that the application uses the role from the verified JWT
payload, not from the request body or query parameters. An attacker who sends a request with
the role field in the body as admin must not gain admin access — the role must only be read from
the verified token.

Member to admin escalation — verify there is no endpoint that allows a member to change their
own role. Verify there is no update profile endpoint that accepts a role field from the request body.
If such an endpoint exists, the role field must be stripped from the request before any update
occurs.

Super admin key brute force — the super admin key is checked on every request to the super
admin route prefix. If there is no rate limiting on this route, an attacker could brute force it.
Verify that rate limiting applies to the super admin routes. Also verify that failed super admin
key attempts do not reveal whether the key was close or partially correct — the response must
be a flat 403 for any invalid key.

Tenant enumeration — the tenant slug appears in the subdomain and is used to look up the
tenant. An attacker could try common slugs to discover what factories are on the platform. While
this is low severity since slugs are not secret, verify that a request for a nonexistent tenant slug
returns a generic 404 and not a different error that reveals whether the slug format was valid
versus the slug simply not existing.

Accessing suspended tenant data — an attacker whose tenant has been suspended might try to
use a valid JWT they obtained before suspension to access the API. Verify that the tenant
middleware checks the current tenant status from the database on every request, meaning a
suspended tenant's valid JWT tokens become useless immediately upon suspension.

OCR endpoint abuse — the OCR endpoint accepts an image upload and calls an external API. An
attacker could upload a very large file repeatedly to consume Cloudinary storage quota and Google
Vision API quota. Verify the file size limit is enforced before the upload reaches Cloudinary. Verify
rate limiting applies to the OCR endpoint — it is an expensive operation and must not be callable
without limit.

Internal path exposure — verify that none of the following are accessible via a direct HTTP
request: the .env file, the .git directory, any Swagger or OpenAPI documentation that should be
internal, any health check endpoint that reveals database connection details or environment
information, and any error response that includes server file paths.

For every vulnerability found: state what an attacker would do, what the maximum damage is,
and confirm the fix has been applied. Order fixes by severity — data exposure and authentication
bypass first, abuse and enumeration second.

---

## Final Reporting Format

After completing all five audits, provide a single consolidated summary with the following:

A list of every issue found, grouped by severity: Critical, High, Medium, and Low.

For each issue: which audit section it came from, the file and function where it was found,
one sentence describing the problem, and one sentence confirming the fix.

A count of total issues by severity level.

A final statement on whether the application is ready for production with real factory data,
or whether any Critical or High severity issues remain unresolved.

If any issue could not be fixed without a decision from the developer, list it clearly with the
options and tradeoffs so the developer can make an informed choice rather than leaving it
unresolved.
