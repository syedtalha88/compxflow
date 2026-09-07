# AUDIT.md — FactFlow Complete Application Audit

## Purpose

This document instructs the AI to perform a thorough, systematic audit of the entire FactFlow codebase. The app is fully built. The goal is not to add features or refactor — it is to find and fix every bug, security vulnerability, data integrity issue, edge case gap, and broken behaviour before the app goes to real users with real business data.

Read every file. Understand every flow. Then go through each section of this document and verify the app meets every requirement listed. For every issue found, report it clearly with the file name, what the problem is, what the correct behaviour should be, and fix it.

Do not skip sections. Do not assume something works without reading the actual code. Do not fix something you have not verified is actually broken.

---

## Section 1 — Multi-Tenancy Isolation Audit

This is the most critical section. A bug here means one factory sees another factory's private business data. Verify every single point.

Go through every Mongoose query in every controller file across the entire backend. Every single find, findOne, findById, findByIdAndUpdate, findOneAndUpdate, aggregate, countDocuments, and deleteMany must include tenantId scoped to the authenticated tenant. There must not be a single query that fetches or modifies documents based only on a record ID without also verifying the tenantId matches.

Specifically check these high-risk scenarios. When fetching an invoice by its ID, does the query verify that the invoice belongs to the requesting tenant or does it just look up by ID alone? If someone passes a valid MongoDB ObjectId that belongs to a different tenant, do they get that document back? The correct answer is no — the query must include both the ID and the tenantId.

Check the payment creation flow. When a payment is submitted with an invoiceId, does the backend verify that the invoice referenced belongs to the same tenant before creating the payment? An attacker could submit a payment against another tenant's invoice by guessing or leaking an ObjectId.

Check the same for purchase payments against purchases, and for any route that accepts a parent document ID as a parameter or in the request body.

Check all aggregation pipelines in the reports module. Every aggregation stage that touches invoices, purchases, payments, or expenses must begin with a match stage filtering by tenantId. A missing tenantId filter in an aggregation would expose financial totals across all tenants.

Check the OCR job creation. The tenantId should be attached to every OCR job from the authenticated request. Verify it is not missing on this collection.

Check the delete cascade in the tenant deletion flow in the super admin module. It should delete documents from every collection that has a tenantId field. If a collection is missing from that cascade, that tenant's data would be orphaned in the database forever.

Document every query that passes this check and every one that fails.

---

## Section 2 — Authentication Security Audit

Check that the JWT verification middleware is applied to every route except the explicitly public ones. The only routes that should work without a valid JWT are the tenant registration route and the standard email and password login route. Every other route must require a valid JWT.

Verify the JWT secret is not hardcoded anywhere in the codebase. It must come exclusively from the environment variable. If you find it in any other location including a comment, a test file, or a fallback value like "secret" or "defaultsecret" — flag it as a critical security issue.

Check that the JWT payload never contains the password hash, PIN hash, or any sensitive field. The payload should contain only userId, tenantId, and role.

Verify that the access token expiry is being enforced. Check that the middleware validates the expiry and returns 401 for expired tokens. Then check that the frontend handles 401 responses by attempting a token refresh before retrying the request, and redirecting to login if the refresh also fails.

Check the refresh token implementation. The refresh token stored in the database should be a hash, never the plain token. Verify that when a refresh token is validated, the comparison uses bcrypt compare to prevent timing attacks. Verify that refresh tokens are deleted from the database on logout, not just cleared from the cookie.

Check the PIN implementation. The PIN must be stored as a bcrypt hash on the TenantUser document, never as plain text or a simple hash. Verify that PIN verification uses bcrypt compare. Check that there is rate limiting on the PIN login endpoint — someone brute forcing a 4-6 digit PIN across at most one million combinations must be stopped.

Verify that the httpOnly flag is set on the refresh token cookie. Verify that the secure flag is set in production so it only transmits over HTTPS. Verify that the sameSite attribute is set to prevent CSRF.

Check that passwords have a minimum length requirement enforced on the server side, not just the client side.

Check that after a tenant is suspended, the middleware blocks access even for users who already have a valid JWT. A suspended tenant's users should not be able to use an existing valid token to access data.

---

## Section 3 — API Input Validation Audit

Go through every POST, PUT, and PATCH route in the entire application. For each one, verify that every field in the request body is validated on the server side before any database operation occurs.

For the invoice creation route, verify that billNo is required, is a string, has a maximum length, and is sanitized. Verify that customerName is required with a maximum length. Verify that totalAmount is required, is a number, is greater than zero, and is not infinity or NaN.

For the payment creation route, verify that invoiceId is a valid MongoDB ObjectId format before attempting a database lookup. Verify that amount is greater than zero. Verify that amount does not exceed the remaining pending amount on the invoice — someone should not be able to record a payment larger than what is owed.

Apply the same validation verification to the purchase creation, purchase payment creation, and expense creation routes.

For the auth routes, verify that email is validated as a proper email format. Verify that password has a minimum length. Verify that PIN is numeric only, minimum 4 digits, maximum 6 digits. Verify that the tenant registration slug accepts only lowercase letters, numbers, and hyphens with a minimum and maximum length enforced.

Check that every string field across all routes has a maximum length enforced to prevent oversized payloads.

Check that the image upload middleware enforces file type restrictions — only jpeg, jpg, png, and webp should be accepted. Check that the file size limit is enforced. Verify these checks happen before the file is uploaded to Cloudinary.

Check that query parameters on list routes are validated and sanitized. Page and limit parameters should be clamped to reasonable values — limit should never be allowed to be unlimited. A missing or invalid page parameter should default to page 1.

Check that date parameters on report routes are validated as actual dates and that start date is not after end date.

---

## Section 4 — Business Logic Correctness Audit

Verify the invoice status transition logic. When a payment is added, amountReceived should increase by exactly the payment amount and amountPending should decrease by the same amount. Neither value should go below zero. Status should correctly transition to partially paid when amountReceived is greater than zero but less than totalAmount, and to paid when amountPending reaches zero. Test this mentally with a single full payment, two partial payments that together complete the invoice, a payment that slightly overpays, and a payment deletion that reverses amounts.

Verify that payment addition and invoice update happen atomically using a MongoDB session. If the payment document is created successfully but the invoice update fails, the payment should not persist. If the code does not use a MongoDB session for this, that is a data integrity bug.

Verify the same atomicity for purchase payment creation and purchase record updates.

Verify the duplicate bill number check. When creating an invoice, the check must use both tenantId and billNo. If the check only uses billNo alone, invoices from different tenants would falsely block each other.

Check the bill matching logic in the payment flow. When a receipt is photographed and OCR extracts a bill number, the lookup for a matching invoice must be scoped to the current tenant. It must not return invoices from other tenants.

Verify that the OCR fallback works correctly. If Google Vision returns an error or returns a response with no text, the endpoint should still return a 200 response with empty string values and the image URL. The endpoint should only return a 500 error if the Cloudinary upload itself fails.

Check the reports aggregation against actual data. Verify that the day report returns the correct totals for a specific day and that records from other days do not appear. Off-by-one errors in date range queries using greater than versus greater than or equal to are very common.

Verify that when an invoice is deleted, all associated payment documents are also deleted and all Cloudinary images for the invoice and its payments are deleted.

Apply the same check to purchase deletion.

---

## Section 5 — Role-Based Access Control Audit

Verify that every admin-only route has the role check middleware applied after JWT verification.

These routes must be admin-only: all report routes, the PDF export route, the Excel export route, all DELETE routes for invoices, purchases, and expenses, and all PUT routes for invoices and purchases.

Verify that the GET routes for invoice and purchase lists correctly omit monetary amounts for the member role on the server side. A member using Postman directly against the API must also not receive amounts. The omission must happen in the controller before the response is sent, not only in the frontend.

Verify that the frontend enforces the same restrictions independently. The component that displays amounts must check the role from context and render nothing for the member role.

Verify that the member role cannot access the Reports page even by typing the URL directly. The route guard must check both authentication and the admin role.

Check that the super admin routes have no overlap or conflict with the regular authenticated routes and use a completely separate authentication mechanism.

---

## Section 6 — Super Admin Audit

Verify that the super admin key verification middleware is the first thing applied to the super admin route prefix and that no other middleware runs before it.

Verify that the tenant middleware is not applied to super admin routes.

Verify that the super admin controller functions never expose password hashes, PIN hashes, or refresh token hashes in any response.

Verify the tenant suspension behavior. When a tenant status is set to suspended, the tenant middleware must check the current status from the database on every subsequent request from that tenant's users.

Verify that the tenant deletion function deletes from every collection: invoices, payments, purchases, purchase payments, expenses, OCR jobs, tenant users, refresh tokens, and the tenant itself.

Verify that Cloudinary deletion handles large numbers of images by batching deletion requests appropriately.

Verify that the extra confirmation header required for tenant deletion is checked in the backend, not just enforced in the frontend.

---

## Section 7 — Image Upload and Storage Audit

Verify that uploaded images are stored in an organized folder structure in Cloudinary that includes the tenantId in the path.

Verify that billImagePublicId and receiptImagePublicId fields are stored correctly on every invoice and payment document. Without these, images cannot be deleted and will be orphaned in Cloudinary forever.

Verify that image deletion from Cloudinary happens when records are deleted. An invoice delete that removes the MongoDB record but leaves the Cloudinary image wastes storage quota.

Verify that the frontend shows clear feedback during image upload and retries a failed upload at least once before showing an error.

Check what happens if a user captures a photo but loses internet before the upload completes. The flow must not silently create a broken record with no image.

---

## Section 8 — OCR Pipeline Audit

Verify that the Google Vision API key is loaded from environment variables and is never hardcoded or logged.

Verify that failed OCR attempts are always saved as OcrJob documents with status failed.

Verify that the OCR parsing logic handles these edge cases without throwing exceptions: an image with no text at all, an image with text but none matching expected patterns, a bill number containing slashes or hyphens, an amount written with "only" after it, an amount in Indian lakh notation, and a mostly blank page.

Verify that amount parsing correctly handles Indian comma formatting where one lakh is written as 1,00,000.

Verify that extracted amounts are stored as numbers in the database, not as strings. All amount fields across all collections must be of type Number.

---

## Section 9 — Frontend State and Data Flow Audit

Verify that the access token is stored only in React context memory, never in localStorage, sessionStorage, or any accessible cookie. Check every file for localStorage.setItem or sessionStorage.setItem calls that store authentication state.

Verify that the Axios interceptor correctly attaches the Authorization header to every API request and correctly handles 401 responses by attempting a silent token refresh and retrying the original request once before redirecting to login.

Check for race conditions in the token refresh flow. If two API calls receive 401 simultaneously, only one refresh attempt should be made and the second request should wait for the first refresh to complete before retrying.

Verify that logging out clears all authentication state from React context so navigating back to a protected route redirects to login.

Verify that the tenant slug is correctly read from the subdomain in production and from the custom header in local development.

Check that list pages correctly handle empty arrays by showing the empty state, and correctly handle API errors by showing an error state with a retry option.

Check that the invoice detail page refreshes its payment list after a new payment is added rather than showing stale data.

Verify that the status badge on list items reflects the current status accurately after a payment changes it.

---

## Section 10 — Error Handling Audit

Verify that every async operation in every backend controller has error handling and that asyncHandler correctly catches and forwards errors.

Verify that a global error handling middleware is registered in app.js as the last middleware and that it never exposes stack traces in production.

Verify that Mongoose validation errors are returned as 400 responses with clear field-level messages.

Verify that MongoDB duplicate key errors are returned as 409 conflict responses with readable messages.

Verify that requests for nonexistent documents return clean 404 responses.

On the frontend, verify that every API call has a catch handler and that no unhandled promise rejections exist.

---

## Section 11 — Performance and Limits Audit

Verify that all list endpoints are paginated with a default limit of 20 and a maximum cap that prevents requesting thousands of records in one call.

Verify that the database indexes defined in the schema specification are actually created in the database. Specifically confirm the compound index on tenantId and billNo on the invoices and purchases collections, and the index on tenantId and createdAt on all main collections. Without these indexes, all queries perform full collection scans.

Verify that report aggregation queries perform computation inside the database and return only summary results, not load all matching documents into application memory.

Check that image uploads are size-limited at the middleware level before reaching the application or Cloudinary.

Verify that Cloudinary upload applies image optimization — resizing to a maximum of 1200px on the long edge with automatic quality and format optimization. Without this, full-resolution phone photos consume Cloudinary quota rapidly.

---

## Section 12 — Environment and Configuration Audit

Verify that a .env.example file exists with all required environment variables listed with placeholder values.

Verify that the actual .env file is in .gitignore and has never been committed to the repository.

Verify that the application fails to start with a clear error if any required environment variable is missing. It must not start with undefined values and appear to work while silently failing.

Verify that NODE_ENV correctly controls whether stack traces appear in error responses — visible in development, hidden in production.

Verify that CORS only allows requests from origins defined in the environment variable and does not use a wildcard.

---

## Section 13 — Code Quality and Consistency Audit

Go through the entire codebase and find these patterns:

Any console.log that outputs sensitive data such as user emails, amounts, bill numbers, tokens, or database IDs in production code paths. These must be removed.

Any hardcoded values that should be in environment variables.

Any routes that are registered but have no handler implemented.

Any async function called without await and without .then and .catch handling — these are silent error swallowers.

Any place where a MongoDB ObjectId is compared using the equality operator directly instead of the .equals() method or string conversion — ObjectId comparison by reference always returns false even for equal IDs.

Any place where req.body fields are used directly in a database query without sanitization — this could allow MongoDB operator injection attacks where a field value like the string dollar sign where becomes a MongoDB query operator.

---

## Section 14 — End-to-End Flow Verification

After completing all checks and fixing all issues, verify each complete flow works from start to finish:

A new factory registers. The tenant is created with the correct slug. The admin user is created with a hashed password. The TenantUser bridge document is created with the admin role. A valid access token and refresh token are returned. The admin can immediately access protected routes.

The admin sets up a PIN. The PIN is stored as a hash. The admin logs in using the PIN on a second request. The PIN login returns a new valid access token.

The admin captures an invoice. The image uploads to Cloudinary. OCR returns extracted fields. The admin confirms. The invoice is created with the correct tenantId, billNo, customerName, totalAmount, amountPending equal to totalAmount, amountReceived of zero, status of pending, and the Cloudinary URL.

The admin captures a payment receipt. OCR extracts the bill number. The backend finds the matching invoice within the same tenant only. The admin confirms. The payment is created. The invoice amounts and status update correctly.

A member logs in. The invoice list response contains no amount fields. The member is blocked from the reports page. A direct API call to a delete endpoint returns 403.

The developer opens the super admin panel. The key entry works. The dashboard shows correct counts. The developer suspends the tenant. The tenant's next API call returns 403. The developer reactivates the tenant. Access is restored.

---

## How to Report and Fix Findings

For every issue found, report it with the following information before fixing anything: the section number, the file path and function name where the issue exists, a description of what is wrong and why it is a problem, the correct behaviour that should exist instead, and a severity level.

Severity levels are: Critical meaning data loss or security breach is possible, High meaning functionality is broken or data integrity is at risk, Medium meaning edge case failures or inconsistencies, and Low meaning code quality or minor inconsistencies.

Fix issues in order of severity starting with Critical. After fixing each issue, explicitly confirm what was changed and that the fix does not introduce a new problem.

When the audit is complete, provide a summary listing the total number of issues found by severity level, the total number fixed, any issues that could not be fixed without additional information or decisions, and a final clear statement of whether the application is ready for production use with real business data.
