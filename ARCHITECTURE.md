# ARCHITECTURE.md — FactFlow

## Stack (Locked — Do Not Deviate)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite | PWA, mobile-first |
| Styling | Tailwind CSS v3 | Utility-first, no component libraries |
| Backend | Node.js + Express.js | REST API, modular monolith |
| Database | MongoDB + Mongoose | Atlas free tier (M0) |
| Auth | JWT + bcryptjs | Access token + refresh token pattern |
| Image Storage | Cloudinary | Free tier (25 credits/month) |
| OCR | Google Cloud Vision API | Free tier: 1000 units/month |
| Hosting (Backend) | Hostinger managed Node.js | Already paid |
| Hosting (Frontend) | Vercel | Free tier |
| PDF Export | pdfkit | Free, no external service |
| Excel Export | exceljs | Free, no external service |
| Email (future) | Nodemailer + Gmail SMTP | Free |

**All dependencies must be free tier or open source. No paid external services.**

---

## Multi-Tenancy Model

**Model: Shared Database, Shared Collection, tenant_id on every document**

Every MongoDB document in every collection has a `tenantId` field. No exceptions.

### Why this model
- Simplest to operate (one DB, one connection pool)
- Scales to hundreds of tenants without infrastructure changes
- Aligns with the SaaS curriculum already being studied

### Tenant Isolation Strategy (4 layers)

**Layer 1 — Query-level:** Every Mongoose query explicitly includes `{ tenantId: req.tenant.id }`. No query runs without tenant scoping. This is enforced by convention and code review.

**Layer 2 — Middleware-level:** `tenantMiddleware` resolves tenant from subdomain on every request and attaches to `req.tenant`. All route handlers use `req.tenant.id`.

**Layer 3 — Mongoose plugins:** A global Mongoose plugin auto-injects `tenantId` filter on all find/update/delete operations for scoped models.

**Layer 4 — Ownership verification:** Before any update or delete, explicitly verify `{ _id: id, tenantId: req.tenant.id }` — prevents manipulating another tenant's document even if the ID is somehow leaked.

### Tenant Resolution Flow
```
Request arrives at api.factflow.app
  → tenantMiddleware reads Origin/Host header
  → Extracts subdomain (e.g. "kaleem" from "kaleem.factflow.app")
  → Looks up Tenant document by slug
  → Attaches { id, slug, plan, status } to req.tenant
  → If not found → 404
  → If suspended → 403
  → Next()
```

---

## Folder Structure (Enforce Strictly)

```
factflow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # MongoDB connection
│   │   │   ├── cloudinary.js      # Cloudinary config
│   │   │   └── ocr.js             # Google Vision client
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification
│   │   │   ├── tenant.js          # Tenant resolution from subdomain
│   │   │   ├── roleCheck.js       # Admin/Member role enforcement
│   │   │   └── upload.js          # Multer config for image uploads
│   │   ├── models/
│   │   │   ├── Tenant.js
│   │   │   ├── User.js
│   │   │   ├── TenantUser.js
│   │   │   ├── RefreshToken.js
│   │   │   ├── Invoice.js
│   │   │   ├── Payment.js
│   │   │   ├── Purchase.js
│   │   │   ├── PurchasePayment.js
│   │   │   ├── Expense.js
│   │   │   └── OcrJob.js
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.js
│   │   │   │   └── auth.controller.js
│   │   │   ├── tenants/
│   │   │   │   ├── tenant.routes.js
│   │   │   │   └── tenant.controller.js
│   │   │   ├── invoices/
│   │   │   │   ├── invoice.routes.js
│   │   │   │   └── invoice.controller.js
│   │   │   ├── payments/
│   │   │   │   ├── payment.routes.js
│   │   │   │   └── payment.controller.js
│   │   │   ├── purchases/
│   │   │   │   ├── purchase.routes.js
│   │   │   │   └── purchase.controller.js
│   │   │   ├── purchasePayments/
│   │   │   │   ├── purchasePayment.routes.js
│   │   │   │   └── purchasePayment.controller.js
│   │   │   ├── expenses/
│   │   │   │   ├── expense.routes.js
│   │   │   │   └── expense.controller.js
│   │   │   ├── ocr/
│   │   │   │   ├── ocr.routes.js
│   │   │   │   └── ocr.controller.js
│   │   │   ├── reports/
│   │   │   │   ├── report.routes.js
│   │   │   │   └── report.controller.js
│   │   │   └── admin/
│   │   │       ├── admin.routes.js
│   │   │       └── admin.controller.js
│   │   └── utils/
│   │       ├── asyncHandler.js    # Wraps async route handlers
│   │       ├── apiError.js        # Custom error class
│   │       ├── apiResponse.js     # Standard response formatter
│   │       └── pdfExport.js       # PDF generation utility
│   ├── app.js                     # Express app setup
│   ├── server.js                  # Entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js           # ALL fetch calls live here, nowhere else
│   │   ├── components/
│   │   │   ├── capture/
│   │   │   │   ├── CameraCapture.jsx   # Opens camera, takes photo
│   │   │   │   ├── OcrConfirm.jsx      # Shows extracted fields, editable
│   │   │   │   └── CaptureFlow.jsx     # Orchestrates camera→OCR→confirm
│   │   │   ├── layout/
│   │   │   │   ├── BottomNav.jsx
│   │   │   │   ├── PageHeader.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── common/
│   │   │   │   └── ConfirmDialog.jsx   # In-app deletion & access confirm modal
│   │   │   ├── ui/
│   │   │   │   ├── StatusBadge.jsx
│   │   │   │   ├── AmountDisplay.jsx   # Renders null for Member role
│   │   │   │   ├── PhotoViewer.jsx     # In-app image lightbox modal popup
│   │   │   │   └── LoadingSpinner.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # JWT, role, user info
│   │   │   └── TenantContext.jsx   # Tenant slug, resolved on load
│   │   ├── hooks/
│   │   │   ├── useCamera.js
│   │   │   ├── useOcr.js
│   │   │   └── useAuth.js
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── PinLogin.jsx
│   │   │   │   └── SetupPin.jsx
│   │   │   ├── invoices/
│   │   │   │   ├── InvoiceList.jsx
│   │   │   │   ├── InvoiceDetail.jsx
│   │   │   │   └── AddInvoice.jsx
│   │   │   ├── payments/
│   │   │   │   └── AddPayment.jsx
│   │   │   ├── purchases/
│   │   │   │   ├── PurchaseList.jsx
│   │   │   │   ├── PurchaseDetail.jsx
│   │   │   │   └── AddPurchase.jsx
│   │   │   ├── expenses/
│   │   │   │   ├── ExpenseList.jsx
│   │   │   │   └── AddExpense.jsx
│   │   │   ├── reports/
│   │   │   │   └── Reports.jsx
│   │   │   ├── onboarding/
│   │   │   │   └── TenantSignup.jsx
│   │   │   ├── admin/
│   │   │   │   └── SuperAdmin.jsx
│   │   │   └── Home.jsx
│   │   ├── utils/
│   │   │   ├── formatCurrency.js
│   │   │   └── formatDate.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   └── sw.js                  # Service worker (basic)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## MongoDB Schema (All Models)

### Tenant
```javascript
{
  name: { type: String, required: true },          // "Kaleem Furniture Factory"
  slug: { type: String, required: true, unique: true }, // "kaleem"
  plan: { type: String, enum: ['free','pro'], default: 'free' },
  status: { type: String, enum: ['active','suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
}
// Index: { slug: 1 } unique
```

### User
```javascript
{
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}
```

### TenantUser (bridge — user's role within a tenant)
```javascript
{
  tenantId: { type: ObjectId, ref: 'Tenant', required: true },
  userId: { type: ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin','member'], required: true },
  pinHash: { type: String, default: null },        // bcrypt hash of PIN
  createdAt: { type: Date, default: Date.now }
}
// Index: { tenantId: 1, userId: 1 } unique
```

### RefreshToken
```javascript
{
  tokenHash: { type: String, required: true },     // bcrypt hash of actual token
  userId: { type: ObjectId, ref: 'User', required: true },
  tenantId: { type: ObjectId, ref: 'Tenant', required: true },
  expiresAt: { type: Date, required: true },       // 30 days
  createdAt: { type: Date, default: Date.now }
}
// TTL index: { expiresAt: 1 }, expireAfterSeconds: 0
```

### Invoice
```javascript
{
  tenantId: { type: ObjectId, ref: 'Tenant', required: true },
  billNo: { type: String, required: true },
  customerName: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  amountReceived: { type: Number, default: 0 },
  amountPending: { type: Number, required: true }, // computed: totalAmount - amountReceived
  status: { type: String, enum: ['pending','partially_paid','paid'], default: 'pending' },
  billImageUrl: { type: String, required: true },  // Cloudinary URL
  billImagePublicId: { type: String, required: true }, // for deletion
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
// Index: { tenantId: 1, billNo: 1 } — for duplicate check and receipt matching
// Index: { tenantId: 1, createdAt: -1 } — for date-range reports
// Index: { tenantId: 1, status: 1 } — for filter queries
```

### Payment
```javascript
{
  tenantId: { type: ObjectId, ref: 'Tenant', required: true },
  invoiceId: { type: ObjectId, ref: 'Invoice', required: true },
  amount: { type: Number, required: true },
  receiptImageUrl: { type: String, required: true },
  receiptImagePublicId: { type: String, required: true },
  capturedAt: { type: Date, default: Date.now }
}
// Index: { tenantId: 1, invoiceId: 1 }
// Index: { tenantId: 1, capturedAt: -1 }
```

### Purchase
```javascript
{
  tenantId: { type: ObjectId, ref: 'Tenant', required: true },
  billNo: { type: String, required: true },
  supplierName: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  amountPending: { type: Number, required: true },
  status: { type: String, enum: ['pending','partially_paid','paid'], default: 'pending' },
  billImageUrl: { type: String, required: true },
  billImagePublicId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
// Index: { tenantId: 1, billNo: 1 }
// Index: { tenantId: 1, createdAt: -1 }
```

### PurchasePayment
```javascript
{
  tenantId: { type: ObjectId, ref: 'Tenant', required: true },
  purchaseId: { type: ObjectId, ref: 'Purchase', required: true },
  amount: { type: Number, required: true },
  receiptImageUrl: { type: String, required: true },
  receiptImagePublicId: { type: String, required: true },
  capturedAt: { type: Date, default: Date.now }
}
// Index: { tenantId: 1, purchaseId: 1 }
```

### Expense
```javascript
{
  tenantId: { type: ObjectId, ref: 'Tenant', required: true },
  amount: { type: Number, required: true },
  category: { type: String, enum: ['salary','utilities','maintenance','raw_material','other'], required: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: null },
  imagePublicId: { type: String, default: null },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
}
// Index: { tenantId: 1, date: -1 }
// Index: { tenantId: 1, category: 1 }
```

### OcrJob (for debugging and retry)
```javascript
{
  tenantId: { type: ObjectId, ref: 'Tenant', required: true },
  imageUrl: { type: String, required: true },
  type: { type: String, enum: ['invoice','payment','purchase','purchase_payment','expense'] },
  rawResponse: { type: Object, default: null },    // full Google Vision response
  extractedData: {
    billNo: String,
    name: String,
    amount: Number
  },
  status: { type: String, enum: ['success','failed','partial'], default: 'success' },
  createdAt: { type: Date, default: Date.now }
}
// TTL index: { createdAt: 1 }, expireAfterSeconds: 2592000 (30 days — auto cleanup)
```

---

## API Routes (Complete Contract)

### Auth Routes — `/api/auth`
```
POST /api/auth/register          Body: { tenantName, slug, email, password }
                                  Creates tenant + first admin user in one transaction
                                  Returns: { accessToken, refreshToken, user, tenant }

POST /api/auth/login             Body: { email, password, slug }
                                  Returns: { accessToken, refreshToken, user, tenant }

POST /api/auth/pin-login         Body: { pin, slug, userId }
                                  Returns: { accessToken, refreshToken }

POST /api/auth/refresh           Body: { refreshToken }
                                  Returns: { accessToken }

POST /api/auth/logout            Auth required. Deletes refresh token.

POST /api/auth/setup-pin         Auth required. Body: { pin }
                                  Hashes and stores PIN on TenantUser

POST /api/auth/change-pin        Auth required. Body: { currentPin, newPin }
```

### Invoice Routes — `/api/invoices` (Auth + Tenant required)
```
GET    /api/invoices             Query: ?status=pending&page=1&limit=20&search=&startDate=&endDate=
                                  Admin: returns with amounts
                                  Member: returns without amounts (amountPending/amountReceived omitted)

POST   /api/invoices             Body: { billNo, customerName, totalAmount, billImageUrl, billImagePublicId }
                                  Checks duplicate billNo within tenant before saving

GET    /api/invoices/:id         Returns invoice + all payments for it

PUT    /api/invoices/:id         Body: { customerName, totalAmount } — admin only

DELETE /api/invoices/:id         Admin only. Also deletes associated payments + Cloudinary images.
```

### Payment Routes — `/api/payments` (Auth + Tenant required)
```
GET    /api/payments             Query: ?invoiceId=&startDate=&endDate=

POST   /api/payments             Body: { invoiceId, amount, receiptImageUrl, receiptImagePublicId }
                                  Updates Invoice.amountReceived, amountPending, status atomically

DELETE /api/payments/:id         Admin only. Reverses invoice totals.
```

### Purchase Routes — `/api/purchases` (Auth + Tenant required)
```
GET    /api/purchases            Query: ?status=&page=&limit=&search=&startDate=&endDate=
POST   /api/purchases            Body: { billNo, supplierName, totalAmount, billImageUrl, billImagePublicId }
GET    /api/purchases/:id        Returns purchase + all purchase payments
PUT    /api/purchases/:id        Admin only
DELETE /api/purchases/:id        Admin only
```

### Purchase Payment Routes — `/api/purchase-payments`
```
GET    /api/purchase-payments    Query: ?purchaseId=
POST   /api/purchase-payments    Body: { purchaseId, amount, receiptImageUrl, receiptImagePublicId }
DELETE /api/purchase-payments/:id Admin only
```

### Expense Routes — `/api/expenses` (Auth + Tenant required)
```
GET    /api/expenses             Query: ?category=&startDate=&endDate=&page=&limit=
POST   /api/expenses             Body: { amount, category, description, date, imageUrl, imagePublicId }
PUT    /api/expenses/:id         Admin only
DELETE /api/expenses/:id         Admin only
```

### OCR Route — `/api/ocr` (Auth + Tenant required)
```
POST   /api/ocr/extract          Body: multipart/form-data { image: File, type: string }
                                  1. Uploads image to Cloudinary → gets URL
                                  2. Sends URL to Google Vision API
                                  3. Parses response for billNo, name, amount
                                  4. Saves OcrJob document
                                  5. Returns: { billNo, name, amount, imageUrl, imagePublicId, confidence }
```

### Report Routes — `/api/reports` (Auth + Tenant + Admin only)
```
GET    /api/reports/day          Query: ?date=2026-07-18
                                  Returns: { totalInvoiced, totalReceived, totalPending,
                                             rawMaterialSpend, generalExpenses, netPosition,
                                             invoiceCount, purchaseCount, expenseCount }

GET    /api/reports/month        Query: ?year=2026&month=7
                                  Returns: same metrics + dailyBreakdown array

GET    /api/reports/range        Query: ?startDate=&endDate=
                                  Returns: summary + recordLists for drill-down

GET    /api/reports/export/pdf   Query: ?startDate=&endDate=   Streams PDF file

GET    /api/reports/export/excel Query: ?startDate=&endDate=   Streams .xlsx file
```

### Tenant Onboarding — `/api/tenants`
```
POST   /api/tenants/check-slug   Body: { slug } — checks if slug available
POST   /api/tenants/register     Body: { name, slug, adminEmail, adminPassword }
GET    /api/tenants/me           Auth required. Returns current tenant info.
```

### Super Admin — `/api/admin` (hardcoded SUPER_ADMIN_KEY in env)
```
GET    /api/admin/tenants        Lists all tenants with stats
GET    /api/admin/tenants/:id    Single tenant detail + usage
PUT    /api/admin/tenants/:id    Body: { status } — suspend/activate tenant
```

---

## Auth Flow Details

### Access Token
- JWT signed with JWT_SECRET
- Payload: `{ userId, tenantId, role, type: 'access' }`
- Expiry: 15 minutes
- Sent in: `Authorization: Bearer <token>` header

### Refresh Token
- Random 64-byte hex string
- Stored as bcrypt hash in RefreshToken collection
- Expiry: 30 days (TTL index auto-deletes)
- Sent in: httpOnly cookie `refreshToken`
- Used to silently re-issue access tokens

### PIN Login
- PIN is 4-6 digits
- Stored as bcrypt hash on TenantUser.pinHash
- On PIN login: verify pin → look up user → issue new access + refresh tokens
- PIN is per-tenant-user (same user in different tenants has different PINs)

---

## OCR Pipeline

### Google Vision API Integration
```
Image file received
  → Upload to Cloudinary (get permanent URL)
  → Send Cloudinary URL to Google Vision TEXT_DETECTION
  → Parse full text response
  → Apply extraction logic (regex + heuristics):
      billNo:  look for patterns like "Bill No:", "Invoice No:", "No.", followed by alphanumeric
      amount:  look for patterns like "Rs.", "₹", "Total:", "Amount:" followed by number
      name:    look for "Name:", "Customer:", "Party:" followed by text
  → If extraction fails → return empty strings (confirm screen handles manual entry)
  → Save OcrJob with rawResponse for debugging
  → Return { billNo, name, amount, imageUrl, imagePublicId }
```

### OCR Prompt Strategy
Use `TEXT_DETECTION` feature (not `DOCUMENT_TEXT_DETECTION`) for handwritten content. Parse the full text annotation. Apply field-specific regex patterns. Never fail hard — always return whatever was extracted, even if partial.

### Fallback
If Google Vision returns no text or errors → return `{ billNo: '', name: '', amount: null }` with `confidence: 'low'` → confirm screen shows empty fields → staff enters manually → still saves the image.

---

## Environment Variables

```env
# Backend
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY_DAYS=30
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
GOOGLE_VISION_API_KEY=...
SUPER_ADMIN_KEY=your_super_admin_secret
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,https://factflow.app

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_DOMAIN=factflow.app
```

---

## Standard Response Format

All API responses use this format. No deviations.

```javascript
// Success
{
  "success": true,
  "data": { ... },
  "message": "Invoice created successfully"
}

// Error
{
  "success": false,
  "error": "DUPLICATE_BILL_NO",
  "message": "A bill with number 1234 already exists"
}

// Paginated list
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8
  }
}
```

---

## Security Rules

1. Never return `passwordHash` or `pinHash` in any API response
2. Never log amounts, customer names, or bill numbers in production logs
3. All file uploads validated: image types only (jpeg, jpg, png, webp), max 10MB
4. Rate limiting on auth routes: 10 requests per 15 minutes per IP
5. CORS restricted to known origins (ALLOWED_ORIGINS env var)
6. All routes except `/api/auth/register` and `/api/auth/login` require valid JWT
7. Super admin routes require SUPER_ADMIN_KEY header — completely separate from JWT auth
8. Input sanitization on all string fields (trim, max length)
9. MongoDB injection prevention: use Mongoose schema types, never raw string in queries
10. Refresh tokens stored as hash — plain token never persisted
