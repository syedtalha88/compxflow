# MEMORY.md — FactFlow Agent Context

> This file is pasted at the start of EVERY AI session without exception.
> It gives the agent the full project context so every session is consistent.
> Update the "Current State" section after each phase completes.

---

## What We Are Building

**FactFlow** — a multi-tenant SaaS application for small factories to digitize their paper bill workflow using phone camera + OCR.

Factories photograph handwritten bills → OCR reads the values → human confirms → digital record saved with photo attached → live financial tracking and reports.

**First client:** Kaleem's furniture factory.
**Architecture:** Multi-tenant SaaS — each factory is an isolated tenant with its own subdomain.

---

## Tech Stack (Never Deviate)

- **Backend:** Node.js + Express.js (REST API, modular monolith)
- **Database:** MongoDB + Mongoose (Atlas M0 free tier)
- **Frontend:** React 18 + Vite (PWA)
- **Styling:** Tailwind CSS v3 only — no component libraries (no MUI, no Shadcn, no Chakra)
- **Auth:** JWT (15min access token) + bcryptjs (refresh token in httpOnly cookie, 30 days)
- **Images:** Cloudinary free tier
- **OCR:** Google Cloud Vision API free tier (1000 units/month)
- **PDF:** pdfkit (free, no external service)
- **Excel:** exceljs (free, no external service)
- **All dependencies must be free**

---

## Multi-Tenancy Rules (Enforce Always)

1. EVERY MongoDB document in EVERY collection has a `tenantId` field
2. EVERY query includes `{ tenantId: req.tenant.id }` — no exceptions
3. Tenant resolved from subdomain via middleware on every request
4. For local development: use `x-tenant-slug` header instead of subdomain
5. Before any update/delete: verify `{ _id: id, tenantId: req.tenant.id }`
6. Never return one tenant's data in another tenant's response

---

## User Roles

**Admin:**
- Full access to all data, amounts, reports, exports
- Can see amountPending, amountReceived on all records
- Can access Reports Dashboard
- Can export PDF and Excel

**Member:**
- Can capture and upload bills/receipts only
- Can see record lists: billNo, name/supplier, status — amounts HIDDEN
- Cannot see Reports Dashboard
- Cannot see any monetary totals anywhere

---

## Folder Structure (Never Change)

```
backend/src/
  config/          → db.js, cloudinary.js, ocr.js
  middleware/      → auth.js, tenant.js, roleCheck.js, upload.js
  models/          → all Mongoose models
  modules/         → feature modules (auth, invoices, payments, etc.)
  utils/           → asyncHandler, apiError, apiResponse

frontend/src/
  api/             → index.js (ALL API calls — nowhere else)
  components/      → capture/, layout/, ui/
  context/         → AuthContext.jsx, TenantContext.jsx
  hooks/           → useCamera, useOcr, useAuth
  pages/           → auth/, invoices/, payments/, purchases/, expenses/, reports/, onboarding/
```

---

## Naming Conventions

- MongoDB collections: camelCase plural (invoices, tenantUsers, purchasePayments)
- Mongoose models: PascalCase singular (Invoice, TenantUser, PurchasePayment)
- API routes: kebab-case (/api/purchase-payments)
- JS variables/functions: camelCase
- React components: PascalCase
- Environment variables: SCREAMING_SNAKE_CASE
- Field names in MongoDB: camelCase (billNo, tenantId, amountPending)

---

## Standard API Response Format

```javascript
// Always use this format. Never return raw data or different structure.

// Success
res.status(200).json({
  success: true,
  data: { ... },
  message: "Description of what happened"
});

// Error (via apiError utility)
res.status(4xx).json({
  success: false,
  error: "ERROR_CODE_CONSTANT",
  message: "Human readable description"
});

// Paginated list
res.status(200).json({
  success: true,
  data: [ ... ],
  pagination: { page, limit, total, pages }
});
```

---

## Key Business Logic Rules

**Invoice status transitions:**
```
created → status: 'pending', amountPending = totalAmount, amountReceived = 0
payment added → amountReceived += amount, amountPending -= amount
if amountPending <= 0 → status = 'paid'
else if amountReceived > 0 → status = 'partially_paid'
else → status = 'pending'
```

**Duplicate bill number:**
- Bill numbers are unique per tenant (not globally)
- Before creating invoice or purchase: check `{ tenantId, billNo }` exists → return 409 with warning
- Member can still override warning (admin also can)

**OCR failure handling:**
- Never fail hard on OCR errors
- If Vision API fails → return `{ billNo: '', name: '', amount: null, confidence: 'failed' }`
- Confirm screen shows empty fields for manual entry
- Always save OcrJob document even on failure

**Payment atomicity:**
- Use MongoDB sessions for payment operations
- Create Payment document AND update Invoice in same session
- If either fails → rollback both

---

## What NOT to Do (Agent Rules)

1. **Never use localStorage for tokens** — access token in React memory only, refresh token in httpOnly cookie
2. **Never skip tenantId in queries** — every single query includes tenantId
3. **Never return passwordHash or pinHash** in any API response
4. **Never install paid dependencies** — everything must be free
5. **Never use component libraries** — Tailwind utility classes only
6. **Never put API calls in components directly** — all calls go through `api/index.js`
7. **Never use React class components** — functional components + hooks only
8. **Never hardcode tenant IDs or user IDs** — always from req.tenant and req.user
9. **Never skip input validation** — validate on both client AND server
10. **Never use console.log in production paths** — use proper error handling

---

## Current Project State

**Last completed phase:** Phase 13 — Production Polish, In-App Confirm Dialogs, Multi-Mode Reports & In-App Lightbox Popups.
**Current phase:** Phase 13 — Production Ready & Deployed Polish
**Kaleem's subdomain:** kaleem.factflow.app
**OCR accuracy on sample bills:** Tested & verified with Cloudinary & graceful Vision API fallbacks

### Completed Phases
- [x] Phase 1 — Scaffold & Models
- [x] Phase 2 — Authentication
- [x] Phase 3 — Image Upload + OCR
- [x] Phase 4 — Invoice & Payment APIs
- [x] Phase 5 — Purchase & Expense APIs
- [x] Phase 6 — Reports & Export APIs
- [x] Phase 7 — Super Admin Tenant Provisioning & User Management
- [x] Phase 8 — React Frontend Scaffold
- [x] Phase 9 — Capture Component & Invoice Flow
- [x] Phase 10 — Payment, Purchase & Expense Flows
- [x] Phase 11 — Reports Dashboard & Exports
- [x] Phase 12 — Super Admin /internal Route & Invoice Receipt Preview Refinements
- [x] Phase 13 — CORS & Proxy Setup, In-App Confirm Dialogs, Multi-Mode Reports (Daily/Monthly/Range) & Receipt Lightbox Popups

---

## Decisions Already Made (Don't Re-Discuss)

- Multi-tenant: shared DB, shared schema, tenantId on every document ✓
- Auth: JWT + PIN + refresh token (NOT session-based) ✓
- No public self-registration: new factories are onboarded exclusively by Super Admin via /internal portal ✓
- Tenant resolution: subdomain (x-tenant-slug header for local dev) ✓
- Image storage: Cloudinary (free tier) ✓
- OCR: Google Cloud Vision API (free tier, TEXT_DETECTION) ✓
- No offline mode in Phase 1 ✓
- No inventory tracking ✓
- Factory Admin can manage & invite team staff members ✓
- Phase 2 (WhatsApp upload) not in this build ✓
