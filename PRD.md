# PRD — FactFlow (Digital Invoice & Expense Tracking SaaS)

## Product Summary

FactFlow is a mobile-first, multi-tenant SaaS application for small manufacturing businesses and factories. It digitizes the entire paper-based billing workflow — sales invoices, payment receipts, raw material purchases, and general expenses — using phone camera capture with automated OCR (Optical Character Recognition) to read handwritten values from printed bill formats.

Every factory that signs up gets its own isolated workspace (tenant). Staff photograph bills directly inside the app. OCR pre-fills the data. A human confirms before saving. The result is a permanent digital record with the original photo attached, live pending/received tracking, and day/month financial reports.

**The first client is Kaleem's furniture factory. Build for them, architect for everyone.**

---

## Problem Being Solved

Furniture factories (and similar small manufacturers) use pre-printed bill formats where the bill number, customer name, and amount are filled in by hand. They currently:

- Track unpaid invoices in paper registers
- Have no quick way to check how much is pending across all bills
- Lose track of raw material purchase costs
- Cannot generate day/month financial summaries without manual calculation
- Lose old bills or cannot find them quickly

---

## Target Users

**Admin (factory owner / manager)**
- Full access to all data, amounts, reports
- Can see total invoiced, received, pending, expenses
- Can export reports as PDF or Excel
- Can view any record and its photos at any time

**Member (factory floor staff)**
- Can capture and upload bills and receipts only
- Can see record lists (bill number, customer name, status) but NOT monetary amounts
- Cannot access Reports Dashboard or export anything
- Cannot see financial totals anywhere in the app

---

## Core Features (Phase 1 MVP)

### F1 — Sales Invoice Capture
- Staff opens app → taps "Add Invoice" → camera opens
- Photographs a printed sales bill (bill no., customer name, amount — handwritten)
- OCR extracts: bill_no, customer_name, amount → pre-fills editable confirm screen
- Staff reviews / corrects → taps Save
- Digital Invoice created: status = Pending, bill photo attached permanently
- Duplicate bill_no within same tenant triggers warning before save

### F2 — Payment Receipt Capture & Bill Matching
- Staff taps "Add Payment" → camera → photographs payment receipt
- OCR extracts bill_no + amount from receipt
- App looks up invoice by bill_no within tenant → displays match for visual confirmation
- If no match found → staff manually selects invoice from list
- On save: payment record created, invoice amount_received updated, amount_pending recalculated
- Status auto-transitions: Pending → Partially Paid → Paid (when pending = 0)
- Multiple partial payments per invoice supported, each with own receipt photo
- Receipt photo attached to invoice detail view alongside original bill photo

### F3 — Raw Material Purchase Capture & Tracking
- Separate section (not mixed with Invoices or Expenses)
- Same capture flow: photograph purchase bill → OCR → confirm → save
- Stores: bill_no, supplier_name, total_amount, amount_paid, amount_pending, status, bill_image_url
- Purchase payment receipts captured same way, matched to purchase by bill_no
- Separate running totals for raw material spend

### F4 — General Expense Recording
- Separate section for non-purchase expenses (salary, utilities, maintenance, other)
- Capture flow: photograph document/receipt → OCR extracts amount + description → confirm → save
- Stores: amount, category (Salary / Utilities / Maintenance / Other), description, date, image_url
- Running totals available per day and per month

### F5 — Role-Based Access & Login System
- Initial setup: email + password → account created
- After setup: numeric PIN (4-6 digits) for daily quick access on recognized device
- Sessions stay active for 30 days (refresh token) — staff not constantly re-logging in
- Full email/password required on new device or after inactivity
- Admin role: full access to all data, amounts, reports, exports
- Member role: capture-only, list visibility without amounts, no reports access
- Phase 1: one Admin + one Member account per tenant

### F6 — Reports Dashboard + PDF & Excel Export
- Admin-only section
- Day view: total invoiced, received, pending, raw material spend, general expenses, net for any selected date
- Month view: same metrics aggregated, with day-by-day breakdown
- Custom date range selector — all historical data always accessible, no archiving
- Drill-down: tap any summary number → see the actual records behind it
- Every record reachable from reports has photos accessible
- Export current view as PDF (downloadable)
- Export current view as Excel .xlsx (downloadable)

---

## Phase 2 — Future (Not in This Build)

### WhatsApp Invoice Upload
- Staff/customers photograph bill and send via WhatsApp to a designated business number
- System receives image, runs OCR, creates invoice record automatically
- **Budget and timeline to be discussed separately — NOT in Phase 1 scope**

---

## Platform Requirements

- Mobile-first PWA (Progressive Web App)
- Installable on phone home screen (no app store)
- Works in phone browser (Chrome on Android, Safari on iOS)
- One-handed use optimized: large tap targets, thumb-friendly bottom navigation
- Upload tolerant of laggy internet: visible uploading/saved states, automatic retry
- All amounts in INR (₹)
- All historical data retained indefinitely — no auto-deletion
- Works across modern mobile browsers (Chrome 90+, Safari 14+)

---

## SaaS Requirements

- Multi-tenant: each factory is a completely isolated tenant
- Tenant identified by subdomain: `kaleem.factflow.app`, `factory2.factflow.app`
- No tenant can ever see another tenant's data (hard isolation)
- Tenant signup flow: factory name + admin email/password → creates tenant + first admin
- Each tenant gets: unique slug, own data namespace, own user accounts
- Super-admin panel (developer only): view all tenants, usage stats, disable accounts

---

## Non-Functional Requirements

- Page load < 3 seconds on mobile 4G
- OCR extraction < 5 seconds per image
- Image upload < 10 seconds on average mobile connection
- 99% uptime (managed hosting)
- All API responses include proper HTTP status codes and error messages
- All inputs validated server-side regardless of client validation
- No sensitive data (amounts, names) logged in console or error messages in production

---

## Out of Scope (Phase 1)

- Inventory / stock quantity tracking
- Multi-location / multi-branch support per tenant
- Vendor or customer master lists / autocomplete
- Recurring expense automation
- Tax / GST computation
- Payroll calculation
- Audit trail / activity logs
- More than one Admin or more than one Member per tenant
- WhatsApp integration
- Native iOS / Android app
- Offline mode (uploads queue when offline)
- PDF/Excel import
- Custom report builder
