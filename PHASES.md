# PHASES.md — FactFlow Build Order

## How to Use This Document

Build **one phase at a time**. Do not start Phase N+1 until Phase N is fully working and manually tested. Each phase ends with a checkpoint — explicit things to verify before moving on. Tell the AI agent which phase you are on at the start of every session.

---

## Phase 1 — Project Scaffold & Database Models

**Goal:** Working project structure, DB connected, all Mongoose models defined.

### Tasks
1. Initialize backend: `npm init`, install dependencies (express, mongoose, bcryptjs, jsonwebtoken, cloudinary, multer, dotenv, cors, express-rate-limit, pdfkit, exceljs)
2. Initialize frontend: `npm create vite@latest frontend -- --template react`, install (tailwindcss, react-router-dom, axios)
3. Create the complete folder structure exactly as defined in ARCHITECTURE.md
4. Set up `app.js` with Express, CORS, JSON middleware, rate limiting
5. Set up `config/db.js` — MongoDB Atlas connection with retry logic
6. Create ALL Mongoose models as defined in ARCHITECTURE.md schema section
7. Create `utils/asyncHandler.js`, `utils/apiError.js`, `utils/apiResponse.js`
8. Create basic health check route: `GET /api/health → { status: 'ok', tenant: req.tenant?.slug }`
9. Set up `middleware/tenant.js` — reads subdomain, looks up Tenant, attaches to req
10. Set up `.env.example` with all variables from ARCHITECTURE.md

### Checkpoint ✓
- [ ] `npm start` runs without errors
- [ ] `/api/health` returns 200
- [ ] MongoDB connected (log confirms)
- [ ] All model files exist with correct schema fields and indexes
- [ ] Tenant middleware resolves slug from header `x-tenant-slug` (for local dev without subdomain)

---

## Phase 2 — Authentication System

**Goal:** Complete auth flow working end-to-end. Testable in Postman.

### Tasks
1. `POST /api/auth/register` — creates Tenant + User + TenantUser (admin role) in one session transaction. Returns accessToken + sets refreshToken httpOnly cookie.
2. `POST /api/auth/login` — email + password + slug → validates → issues tokens
3. `middleware/auth.js` — verifies JWT, attaches `req.user = { userId, tenantId, role }`
4. `POST /api/auth/refresh` — reads refreshToken cookie → verifies hash → issues new accessToken
5. `POST /api/auth/logout` — deletes RefreshToken document, clears cookie
6. `POST /api/auth/setup-pin` — auth required, hashes PIN, stores on TenantUser
7. `POST /api/auth/pin-login` — verifies PIN hash, issues tokens
8. `middleware/roleCheck.js` — `requireAdmin` middleware that returns 403 if role !== 'admin'
9. `GET /api/auth/me` — returns current user + tenant info (no sensitive fields)

### Checkpoint ✓
- [ ] Register creates tenant + admin user, returns valid JWT
- [ ] Login with correct credentials works
- [ ] Login with wrong password returns 401
- [ ] Protected route with no token returns 401
- [ ] Protected route with valid token works
- [ ] Refresh endpoint issues new access token
- [ ] Logout clears token and subsequent refresh fails
- [ ] PIN setup and PIN login work end-to-end
- [ ] Member role cannot access admin-only route (403)

---

## Phase 3 — Image Upload + OCR Pipeline

**Goal:** Image → Cloudinary → Google Vision → structured data. Tested in isolation.

### Tasks
1. `config/cloudinary.js` — configure Cloudinary SDK with env vars
2. `middleware/upload.js` — Multer config: memory storage, image files only, 10MB max
3. `config/ocr.js` — Google Vision client initialization using API key
4. `POST /api/ocr/extract`:
   - Receives image file via multipart/form-data
   - Uploads to Cloudinary → gets `{ url, public_id }`
   - Sends URL to Google Vision `TEXT_DETECTION`
   - Parses text annotations for billNo, name, amount using regex patterns
   - Saves OcrJob document (always, even on failure)
   - Returns `{ billNo, name, amount, imageUrl, imagePublicId, confidence }`
5. OCR parsing logic (in `modules/ocr/ocr.controller.js`):
   ```
   Bill number patterns: /(?:bill\s*no|invoice\s*no|no\.?)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i
   Amount patterns: /(?:rs\.?|₹|total|amount)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i
   Name patterns: /(?:name|customer|party|to)\s*[:\-]?\s*([A-Za-z\s]+?)(?:\n|$)/i
   ```
6. Fallback: if Vision returns error or no text → return empty strings with confidence='failed'

### Checkpoint ✓
- [ ] Upload an image → file appears in Cloudinary dashboard
- [ ] OCR endpoint returns `{ billNo, name, amount, imageUrl, imagePublicId }`
- [ ] OcrJob saved to MongoDB with rawResponse
- [ ] Non-image file upload rejected (400)
- [ ] File over 10MB rejected (400)
- [ ] If Vision fails → returns empty strings, still returns 200 (graceful fallback)
- [ ] Test with 5 actual Kaleem factory bill photos — note accuracy

---

## Phase 4 — Invoice & Payment APIs

**Goal:** Full invoice + payment CRUD with tenant isolation. Testable in Postman.

### Tasks

**Invoices:**
1. `GET /api/invoices` — paginated list, filtered by tenant. Admin gets amounts, Member gets list without amounts. Support query params: status, search (billNo/customerName), startDate, endDate, page, limit.
2. `POST /api/invoices` — validate body, check duplicate billNo within tenant, create Invoice document. amountPending = totalAmount on creation.
3. `GET /api/invoices/:id` — single invoice, verify tenantId ownership, populate payments array.
4. `PUT /api/invoices/:id` — admin only, update customerName or totalAmount (recalculate pending).
5. `DELETE /api/invoices/:id` — admin only, delete invoice + all payments, delete Cloudinary images.

**Payments:**
1. `POST /api/payments` — create payment, then atomically update Invoice: amountReceived += amount, amountPending -= amount, recalculate status. Use MongoDB session for atomicity.
2. `GET /api/payments` — list payments, filtered by invoiceId and/or date range.
3. `DELETE /api/payments/:id` — admin only, reverse invoice totals.

**Status logic:**
```
if amountPending <= 0 → status = 'paid'
else if amountReceived > 0 → status = 'partially_paid'
else → status = 'pending'
```

### Checkpoint ✓
- [ ] Create invoice returns correct document
- [ ] Duplicate billNo in same tenant returns 409
- [ ] Same billNo in different tenant succeeds (isolation works)
- [ ] Member GET /invoices returns list WITHOUT amountPending, amountReceived
- [ ] Admin GET /invoices returns full amounts
- [ ] Add payment → invoice amountPending decreases correctly
- [ ] Second payment → invoice goes to partially_paid
- [ ] Final payment (pending = 0) → invoice goes to paid
- [ ] Delete payment → invoice totals reverse correctly
- [ ] GET /invoices/:id returns invoice with payments array populated

---

## Phase 5 — Purchase & Expense APIs

**Goal:** Purchases and expenses modules fully working.

### Tasks

**Purchases** (mirrors invoice module exactly):
1. `GET /api/purchases` — paginated, filtered, tenant-scoped
2. `POST /api/purchases` — duplicate billNo check within tenant
3. `GET /api/purchases/:id` — with purchase payments populated
4. `PUT /api/purchases/:id` — admin only
5. `DELETE /api/purchases/:id` — admin only, cascade delete

**Purchase Payments** (mirrors payment module):
1. `POST /api/purchase-payments` — create, update Purchase totals atomically
2. `GET /api/purchase-payments` — filtered by purchaseId
3. `DELETE /api/purchase-payments/:id` — reverse Purchase totals

**Expenses:**
1. `GET /api/expenses` — paginated, filter by category + date range
2. `POST /api/expenses` — validate category enum, date required
3. `PUT /api/expenses/:id` — admin only
4. `DELETE /api/expenses/:id` — admin only, delete Cloudinary image if exists

### Checkpoint ✓
- [ ] All CRUD operations work for Purchases (same tests as invoices)
- [ ] Purchase payment adds update amountPaid/amountPending correctly
- [ ] Expense created with all categories
- [ ] Expense without image works (imageUrl is optional)
- [ ] Tenant isolation: tenant A cannot access tenant B's purchases or expenses

---

## Phase 6 — Reports & Export APIs

**Goal:** Financial aggregations and file exports working.

### Tasks
1. `GET /api/reports/day`:
   - Aggregate invoices created on date: sum totalAmount, sum amountReceived, sum amountPending
   - Aggregate purchases on date: sum totalAmount
   - Aggregate expenses on date: sum amount
   - Return: `{ totalInvoiced, totalReceived, totalPending, rawMaterialSpend, generalExpenses, netPosition, counts }`

2. `GET /api/reports/month`:
   - Same as day but across full month
   - Include dailyBreakdown: array of { date, invoiced, received, pending, spend, expenses }

3. `GET /api/reports/range`:
   - Summary + arrays of matching invoices, purchases, expenses (for drill-down)

4. `GET /api/reports/export/pdf`:
   - Use pdfkit to generate PDF with report data
   - Include FactFlow header, date range, summary table, itemized lists
   - Stream file to client with correct Content-Type headers

5. `GET /api/reports/export/excel`:
   - Use exceljs to generate .xlsx
   - Multiple sheets: Summary, Invoices, Purchases, Expenses
   - Stream file to client

### Checkpoint ✓
- [ ] Day report returns correct aggregated numbers (verify manually with test data)
- [ ] Month report includes dailyBreakdown array
- [ ] PDF downloads as valid file, opens in PDF reader
- [ ] Excel downloads as valid .xlsx, opens in Excel/Sheets
- [ ] All report routes return 403 for Member role
- [ ] Empty date range returns zeros (not errors)

---

## Phase 7 — Tenant Onboarding API

**Goal:** New factory can sign up and get their own workspace.

### Tasks
1. `POST /api/tenants/check-slug` — public route, checks if slug is taken. Returns `{ available: true/false }`
2. `POST /api/tenants/register` — public route:
   - Validates: name, slug (alphanumeric + hyphens, 3-30 chars), email, password (min 8 chars)
   - Checks slug uniqueness
   - Creates Tenant + User + TenantUser (admin) in MongoDB session
   - Returns: accessToken + sets refreshToken cookie + tenant info
3. `GET /api/tenants/me` — auth required, returns `{ tenant, role }`
4. Super admin routes:
   - `GET /api/admin/tenants` — lists all tenants with record counts
   - `PUT /api/admin/tenants/:id` — suspend/activate tenant

### Checkpoint ✓
- [ ] Register creates tenant with unique slug
- [ ] Duplicate slug returns 409
- [ ] Slug with spaces or special chars returns 400
- [ ] After register, issued token works on protected routes
- [ ] Super admin route without SUPER_ADMIN_KEY header returns 403
- [ ] Super admin route with correct key returns all tenants

---

## Phase 8 — React Frontend Scaffold

**Goal:** Working React app with routing, auth context, tenant context, API client.

### Tasks
1. Set up React Router with all routes (see ARCHITECTURE.md pages list)
2. `context/TenantContext.jsx` — reads subdomain from window.location.hostname on app load, exposes `{ tenantSlug, isLoading }`
3. `context/AuthContext.jsx` — manages accessToken (in memory, NOT localStorage), user, role. Exposes `{ user, role, login, logout, isAuthenticated, isAdmin }`
4. `api/index.js` — Axios instance with:
   - Base URL from VITE_API_BASE_URL
   - Request interceptor: adds `Authorization: Bearer <accessToken>` header
   - Request interceptor: adds `x-tenant-slug` header (for local dev)
   - Response interceptor: on 401, attempts silent token refresh, retries request
   - All API functions exported (createInvoice, getInvoices, etc.)
5. `components/layout/ProtectedRoute.jsx` — redirects to login if not authenticated
6. `components/layout/BottomNav.jsx` — Home, Invoices, Purchases, Expenses, Reports (Reports hidden for Member)
7. Basic `Login.jsx` page wired to auth API
8. Basic `Home.jsx` showing tenant name + role

### Checkpoint ✓
- [ ] App loads without errors
- [ ] Login page works — successful login stores token, redirects to home
- [ ] Protected routes redirect to login when not authenticated
- [ ] Bottom nav renders, navigation works between pages
- [ ] Reports tab hidden for Member role
- [ ] Token refresh works silently (test by manually expiring access token)
- [ ] Tenant slug read from URL on load

---

## Phase 9 — Capture Component & Invoice Flow

**Goal:** End-to-end invoice capture on mobile. Camera → OCR → confirm → saved.

### Tasks
1. `components/capture/CameraCapture.jsx`:
   - Uses `<input type="file" accept="image/*" capture="environment">` for mobile camera
   - Shows preview of captured image
   - "Retake" and "Use Photo" buttons
2. `components/capture/OcrConfirm.jsx`:
   - Shows loading spinner while OCR runs
   - Displays extracted fields (billNo, customerName, amount) as editable inputs
   - "Save" and "Cancel" buttons
   - Shows thumbnail of captured image
3. `components/capture/CaptureFlow.jsx`:
   - Orchestrates: CameraCapture → (upload + OCR call) → OcrConfirm → onConfirm callback
   - Takes props: `type` ('invoice'|'payment'|'purchase'|'expense'), `onConfirm(data)`, `onCancel`
4. `pages/invoices/AddInvoice.jsx`:
   - Uses CaptureFlow with type='invoice'
   - onConfirm: calls createInvoice API, shows success toast, navigates to invoice list
5. `pages/invoices/InvoiceList.jsx`:
   - Lists invoices with filter chips (All / Pending / Partial / Paid)
   - Search bar for billNo / customerName
   - Each row: billNo, customerName, status badge, amount (hidden for Member)
   - Tap row → InvoiceDetail
6. `pages/invoices/InvoiceDetail.jsx`:
   - Invoice info, bill image thumbnail (tap to expand)
   - Payments history list with receipt thumbnails
   - "Add Payment" button → AddPayment page

### Checkpoint ✓
- [ ] Camera opens on mobile when Add Invoice tapped
- [ ] Photo taken → upload spinner shows → OCR result populates fields
- [ ] Editable fields can be corrected before saving
- [ ] Save creates invoice, shows in list immediately
- [ ] Duplicate bill number shows warning
- [ ] Member sees list without amount columns
- [ ] Invoice detail shows bill photo and payments

---

## Phase 10 — Payment, Purchase & Expense Flows

**Goal:** All four capture flows working on mobile.

### Tasks
1. `pages/payments/AddPayment.jsx`:
   - Uses CaptureFlow with type='payment'
   - After OCR: shows matched invoice (looked up by billNo) — "Is this the right invoice?"
   - If match found: shows invoice details for confirmation
   - If no match: shows searchable invoice list to select manually
   - On confirm: calls createPayment API
2. `pages/purchases/` — All three pages (List, Detail, AddPurchase) mirror invoice pages exactly
3. `pages/purchases/AddPurchasePayment.jsx` — mirrors AddPayment
4. `pages/expenses/AddExpense.jsx`:
   - CaptureFlow with type='expense' (image optional)
   - Additional fields: category dropdown, description, date picker
   - If no photo: can skip capture and go straight to form

### Checkpoint ✓
- [ ] Payment capture → bill number matched → invoice updated
- [ ] Payment with unmatched bill number → manual selection works
- [ ] Invoice status transitions correctly on mobile
- [ ] Purchase flow works identically to invoice flow
- [ ] Expense can be added without photo
- [ ] All amount fields hidden from Member in all lists

---

## Phase 11 — Reports Dashboard & Exports

**Goal:** Admin can see day/month reports and download PDF/Excel.

### Tasks
1. `pages/reports/Reports.jsx`:
   - Date selector: Today / This Month / Custom Range (date picker)
   - Summary cards: Total Invoiced, Total Received, Total Pending, Raw Material Spend, Expenses, Net
   - Each card tappable → shows drill-down list below
   - Monthly view: horizontal bar chart or simple day-by-day table
   - Export buttons: "Download PDF" and "Download Excel"
2. Wire PDF export: clicking triggers API call → file downloads
3. Wire Excel export: same pattern

### Checkpoint ✓
- [ ] Today's summary shows correct numbers (verify against Postman data)
- [ ] Month view shows daily breakdown
- [ ] Tap on Total Invoiced → list of today's invoices appears below
- [ ] PDF downloads as valid file
- [ ] Excel downloads as valid .xlsx
- [ ] Reports page 403s for Member (redirected or tab hidden)

---

## Phase 12 — Super Admin Tenant Onboarding & Fast MPIN Auth

**Goal:** Factories are onboarded exclusively by Super Admin via the internal provisioning portal (self-registration disabled by design). Quick 1-touch MPIN authentication for mobile factory floor devices.

### Tasks
1. Disable public self-registration (Factories are onboarded via `/internal` Super Admin portal only)
2. `SuperAdminView.jsx` (`/internal`):
   - Super Admin Key authentication (`x-super-admin-key`)
   - Factory Workspace Provisioning: Name, Subdomain Slug (lowercase alphanumeric/hyphens 3-30 chars), Admin Email, Initial Password
   - Real-time Subdomain Slug validation & availability check
   - Workspace usage stats (Invoices, Purchases, Active Users)
   - Tenant Status Toggle: Activate / Suspend factory workspaces
3. `SetupPinModal.jsx` — First login prompts user to set a 4-digit quick MPIN
4. `LoginView.jsx` — Fast 1-touch MPIN keypad login for remembered mobile devices & full password login for new devices
5. `StaffManagementView.jsx` — Admin-controlled staff member onboarding within a factory workspace

### Checkpoint ✓
- [x] Public self-registration disabled; all factory onboarding handled via Super Admin `/internal` portal
- [x] Super Admin provisions new factory tenant workspace & initial admin credentials
- [x] Real-time slug availability check & slug formatting (lowercase, hyphens)
- [x] First-time login prompts 4-digit MPIN setup modal (`SetupPinModal.jsx`)
- [x] Subsequent visits on remembered mobile device present 1-touch MPIN keypad login
- [x] Super Admin portal lists all factory tenants, usage stats, and suspend/activate controls
- [x] Factory admins can invite & manage team staff members inside their workspace

---

## Phase 13 — PWA, Polish & Production Refinements

**Goal:** App is installable, polished, CORS/proxy configured, and production-ready with in-app dialogs and popups.

### Tasks
1. `public/manifest.json` — name, icons, theme_color, display: standalone, start_url
2. `public/sw.js` — basic service worker for install prompt (no offline caching needed)
3. Register service worker in `main.jsx`
4. Upload retry logic: if Cloudinary upload fails → retry up to 3 times with 2s delay
5. Loading states on all async operations
6. Error states on all failed API calls (with retry buttons)
7. Toast notifications & inline error messages: success (green), error (red), warning (yellow)
8. Empty states on all list pages ("No invoices yet — tap + to add one")
9. CORS configuration for production domain & Vite `/api` proxy target for local dev
10. In-App Confirmation System (`ConfirmDialog.jsx`) replacing browser `window.confirm` across invoices, purchases, expenses, and staff access control
11. Multi-mode Financial Audit & Reports System (Daily, Monthly `YYYY-MM` breakdown table, Custom Date Range, PDF/Excel downloads)
12. In-App Image Lightbox Modal Overlay (`previewImage`) replacing `target="_blank"` external tab links for receipts

### Checkpoint ✓
- [x] "Add to home screen" prompt appears on mobile Chrome
- [x] App opens from home screen in standalone mode (no browser bar)
- [x] Upload shows progress, retries on failure
- [x] All pages have loading and empty states
- [x] In-app styled confirmation modals trigger for all deletions
- [x] In-app image lightbox modal opens for all payment and expense receipts
- [x] Reports dashboard supports Daily, Monthly, and Custom Range financial audits with PDF/Excel exports
- [x] CORS and Vite Proxy resolve seamlessly without origin or port conflicts
