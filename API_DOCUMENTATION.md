# FactFlow Backend REST API Specification & Postman Collection Guide

This document provides a complete specification for all REST API endpoints implemented in FactFlow (Phases 1 through 7). It includes HTTP methods, required headers, request payloads, Postman testing JSON examples, and sample API responses.

---

## Global Headers & Authentication

All API endpoints (except Super Admin & Health) resolve the target factory workspace using the tenant slug.

### Headers:
- `Content-Type: application/json`
- `Authorization: Bearer <accessToken>` (Required for protected endpoints)
- `x-tenant-slug: <tenant-slug>` (e.g. `kaleem` — required in local dev if not using subdomains)
- `x-super-admin-key: <SUPER_ADMIN_KEY>` (Required for Super Admin routes)

---

## 1. Health Check Module

### `GET /api/health`
Checks backend server and tenant resolution status.
- **Auth**: None
- **Headers**: `x-tenant-slug: kaleem` (Optional)
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "status": "ok",
    "tenant": "kaleem"
  },
  "message": "Health check OK"
}
```

---

## 2. Super Admin Tenant Provisioning (`/api/super-admin`)

### `POST /api/super-admin/tenants`
Manually provisions a new factory workspace and initial Admin user.
- **Auth**: None (Protected by `x-super-admin-key`)
- **Headers**: `x-super-admin-key: factflow_super_admin_secret_key_123`
- **Postman Request Body**:
```json
{
  "tenantName": "Kaleem Furniture Factory",
  "slug": "kaleem",
  "adminEmail": "kaleem@wood.com",
  "adminPassword": "password123"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "tenant": {
      "id": "6793f10a8b9c1d0011223344",
      "name": "Kaleem Furniture Factory",
      "slug": "kaleem",
      "status": "active",
      "active": true
    },
    "adminUser": {
      "id": "6793f10a8b9c1d0011223345",
      "email": "kaleem@wood.com",
      "role": "admin"
    }
  },
  "message": "Factory workspace 'Kaleem Furniture Factory' provisioned successfully"
}
```

### `GET /api/super-admin/tenants`
Lists all factory tenants in the system with live metrics.
- **Headers**: `x-super-admin-key: factflow_super_admin_secret_key_123`
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "6793f10a8b9c1d0011223344",
      "name": "Kaleem Furniture Factory",
      "slug": "kaleem",
      "status": "active",
      "active": true,
      "stats": {
        "invoices": 12,
        "purchases": 5,
        "users": 3
      }
    }
  ],
  "message": "All factory tenants retrieved successfully"
}
```

### `PUT /api/super-admin/tenants/:id`
Toggles factory workspace active/suspended status.
- **Headers**: `x-super-admin-key: factflow_super_admin_secret_key_123`
- **Postman Request Body**:
```json
{
  "active": true
}
```

---

## 3. Authentication & User Management (`/api/auth` & `/api/tenant-admin`)

### `POST /api/auth/login`
Authenticates a user and issues an access token + HTTP-only refresh cookie.
- **Headers**: `x-tenant-slug: kaleem`
- **Postman Request Body**:
```json
{
  "email": "kaleem@wood.com",
  "password": "password123",
  "slug": "kaleem"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6793f10a8b9c1d0011223345",
      "email": "kaleem@wood.com"
    },
    "role": "admin",
    "tenant": {
      "id": "6793f10a8b9c1d0011223344",
      "name": "Kaleem Furniture Factory",
      "slug": "kaleem"
    }
  },
  "message": "Login successful"
}
```

### `POST /api/auth/setup-pin`
Sets up a 4-6 digit quick PIN for the logged-in user.
- **Headers**: `Authorization: Bearer <accessToken>`, `x-tenant-slug: kaleem`
- **Postman Request Body**:
```json
{
  "pin": "4321"
}
```

### `POST /api/auth/pin-login`
Quick PIN authentication.
- **Headers**: `x-tenant-slug: kaleem`
- **Postman Request Body**:
```json
{
  "pin": "4321",
  "userId": "6793f10a8b9c1d0011223345",
  "slug": "kaleem"
}
```

### `POST /api/tenant-admin/users`
Factory Admin adds a staff member (`member` role) to the workspace.
- **Auth**: Admin JWT required
- **Postman Request Body**:
```json
{
  "email": "worker@kaleemwood.com",
  "password": "password123",
  "role": "member"
}
```

---

## 4. OCR Extraction (`/api/ocr`)

### `POST /api/ocr/extract`
Uploads a document photo to Cloudinary and extracts bill numbers, party names, and line items.
- **Headers**: `Authorization: Bearer <accessToken>`, `x-tenant-slug: kaleem`, `Content-Type: multipart/form-data`
- **Postman Form Data**:
  - `image`: File (select JPG/PNG image file)
  - `type`: `invoice` | `payment` | `purchase`
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "billNo": "INV-1001",
    "name": "Ramesh Furniture",
    "amount": 25000,
    "items": [
      { "billNo": "BILL-101", "amount": 10000 },
      { "billNo": "BILL-102", "amount": 15000 }
    ],
    "imageUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "imagePublicId": "sample_id",
    "confidence": "high"
  },
  "message": "OCR text extraction completed"
}
```

---

## 5. Sales Invoices & Payment Receipts (`/api/invoices` & `/api/payments`)

### `POST /api/invoices`
Creates a sales invoice document.
- **Postman Request Body**:
```json
{
  "billNo": "INV-1001",
  "customerName": "Ramesh Furniture Mart",
  "totalAmount": 45000,
  "billImageUrl": "https://res.cloudinary.com/demo/image/upload/inv.jpg",
  "billImagePublicId": "inv_1001_id"
}
```

### `GET /api/invoices?status=&search=&page=1&limit=20`
Lists sales invoices with optional status filter (`pending`, `partially_paid`, `paid`) and search.
- **Note**: Redacts monetary amounts if request user has `member` role.

### `POST /api/payments`
Records a sales payment receipt and updates invoice balances.
- **Postman Request Body**:
```json
{
  "invoiceId": "6793f10a8b9c1d0011223388",
  "amount": 20000,
  "receiptImageUrl": "https://res.cloudinary.com/demo/image/upload/rec.jpg",
  "receiptImagePublicId": "rec_20000_id"
}
```

### `DELETE /api/payments/:id`
Admin-only payment reversal (decreases `amountReceived`, recalculates `amountPending`, deletes Cloudinary image).

---

## 6. Supplier Purchases & Purchase Payments (`/api/purchases` & `/api/purchase-payments`)

### `POST /api/purchases`
Creates a supplier purchase bill.
- **Postman Request Body**:
```json
{
  "billNo": "PUR-501",
  "supplierName": "National Timber Suppliers",
  "totalAmount": 30000,
  "billImageUrl": "https://res.cloudinary.com/demo/image/upload/pur.jpg",
  "billImagePublicId": "pur_501_id"
}
```

### `POST /api/purchase-payments`
Records a purchase payment settlement.
- **Postman Request Body**:
```json
{
  "purchaseId": "6793f10a8b9c1d0011223399",
  "amount": 15000,
  "receiptImageUrl": "https://res.cloudinary.com/demo/image/upload/pur_rec.jpg",
  "receiptImagePublicId": "pur_rec_15000_id"
}
```

---

## 7. Factory Expenses (`/api/expenses`)

### `POST /api/expenses`
Records a factory overhead expense.
- **Postman Request Body**:
```json
{
  "amount": 4500,
  "category": "electricity",
  "description": "Monthly Factory Electricity Bill",
  "date": "2026-07-25",
  "imageUrl": "https://res.cloudinary.com/demo/image/upload/exp.jpg",
  "imagePublicId": "exp_4500_id"
}
```

---

## 8. Date-Wise Reports & Exports (`/api/reports`)

### `GET /api/reports/day?date=2026-07-25`
Generates end-to-end daily financial aggregations and itemized lists.
- **Auth**: Admin JWT required (403 for Member role)
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "date": "2026-07-25",
    "summary": {
      "totalInvoiced": 45000,
      "totalSalesReceivedOnDate": 20000,
      "totalPurchasesSpend": 30000,
      "totalPurchasePaidOnDate": 15000,
      "totalExpenses": 4500,
      "netPosition": 500
    },
    "counts": { "invoices": 1, "salesPayments": 1, "purchases": 1, "purchasePayments": 1, "expenses": 1 },
    "itemized": { "invoices": [...], "salesPayments": [...], "purchases": [...], "purchasePayments": [...], "expenses": [...] }
  }
}
```

### `GET /api/reports/month?month=2026-07`
Generates monthly financial summary, day-by-day cash flow table (`dailyBreakdown`), and itemized records.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "month": "2026-07",
    "summary": { "totalInvoiced": 120000, "totalSalesReceived": 95000, "totalPurchasesSpend": 50000, "totalPurchasePaid": 40000, "totalExpenses": 12000, "netPosition": 43000 },
    "counts": { "invoices": 8, "salesPayments": 12, "purchases": 5, "purchasePayments": 6, "expenses": 4 },
    "dailyBreakdown": [ { "date": "2026-07-01", "invoiced": 15000, "received": 10000, "spend": 5000, "paid": 2000, "expenses": 1000, "net": 7000 } ],
    "itemized": { "invoices": [...], "salesPayments": [...], "purchases": [...], "purchasePayments": [...], "expenses": [...] }
  }
}
```

### `GET /api/reports/range?startDate=2026-07-01&endDate=2026-07-31`
Generates custom date range aggregations and itemized audit records.

### `GET /api/reports/export/pdf?date=...` OR `month=YYYY-MM` OR `startDate=...&endDate=...`
Streams a formatted PDF report file (`Content-Type: application/pdf`).

### `GET /api/reports/export/excel?date=...` OR `month=YYYY-MM` OR `startDate=...&endDate=...`
Streams a multi-sheet `.xlsx` Excel workbook (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

---

## Postman Testing Setup Instructions

1. **Base URL**: `http://localhost:5000/api`
2. **Environment Variables**:
   - `baseUrl` = `http://localhost:5000/api`
   - `superAdminKey` = `factflow_super_admin_secret_key_123`
   - `tenantSlug` = `kaleem`
   - `authToken` = (Captured from `/api/auth/login` response)
3. **Run Suite**: Use Postman Collection Runner to execute calls sequentially.
