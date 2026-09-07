# DATABASE.md — FactFlow MongoDB Schema Reference

## Database: MongoDB Atlas (M0 Free Tier)
## ODM: Mongoose 8.x
## Connection: Single connection with connection pooling via Mongoose

---

## Connection Setup

```javascript
// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'factflow'
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
```

---

## All Collections & Mongoose Models

### 1. tenants

```javascript
import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Factory name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]{3,30}$/, 'Slug must be 3-30 lowercase alphanumeric characters or hyphens']
  },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  }
}, { timestamps: true });

// Index already created by unique: true on slug
export default mongoose.model('Tenant', tenantSchema);
```

### 2. users

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  passwordHash: {
    type: String,
    required: true,
    select: false  // Never returned in queries by default
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
```

### 3. tenantusers (bridge collection)

```javascript
const tenantUserSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    required: true
  },
  pinHash: {
    type: String,
    default: null,
    select: false  // Never returned in queries by default
  }
}, { timestamps: true });

tenantUserSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

export default mongoose.model('TenantUser', tenantUserSchema);
```

### 4. refreshtokens

```javascript
const refreshTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    select: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// TTL index: MongoDB auto-deletes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1, tenantId: 1 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
```

### 5. invoices

```javascript
const invoiceSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  billNo: {
    type: String,
    required: [true, 'Bill number is required'],
    trim: true,
    uppercase: true
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name too long']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  amountReceived: {
    type: Number,
    default: 0,
    min: 0
  },
  amountPending: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partially_paid', 'paid'],
    default: 'pending'
  },
  billImageUrl: {
    type: String,
    required: [true, 'Bill image is required']
  },
  billImagePublicId: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Critical indexes for tenant isolation + query performance
invoiceSchema.index({ tenantId: 1, billNo: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, createdAt: -1 });
invoiceSchema.index({ tenantId: 1, status: 1 });
invoiceSchema.index({ tenantId: 1, customerName: 'text' });  // text search

export default mongoose.model('Invoice', invoiceSchema);
```

### 6. payments

```javascript
const paymentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment must be greater than 0']
  },
  receiptImageUrl: {
    type: String,
    required: [true, 'Receipt image is required']
  },
  receiptImagePublicId: {
    type: String,
    required: true
  },
  capturedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

paymentSchema.index({ tenantId: 1, invoiceId: 1 });
paymentSchema.index({ tenantId: 1, capturedAt: -1 });

export default mongoose.model('Payment', paymentSchema);
```

### 7. purchases

```javascript
const purchaseSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  billNo: {
    type: String,
    required: [true, 'Bill number is required'],
    trim: true,
    uppercase: true
  },
  supplierName: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
    maxlength: [100, 'Supplier name too long']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  amountPending: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partially_paid', 'paid'],
    default: 'pending'
  },
  billImageUrl: {
    type: String,
    required: true
  },
  billImagePublicId: {
    type: String,
    required: true
  }
}, { timestamps: true });

purchaseSchema.index({ tenantId: 1, billNo: 1 }, { unique: true });
purchaseSchema.index({ tenantId: 1, createdAt: -1 });
purchaseSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model('Purchase', purchaseSchema);
```

### 8. purchasepayments

```javascript
const purchasePaymentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  receiptImageUrl: {
    type: String,
    required: true
  },
  receiptImagePublicId: {
    type: String,
    required: true
  },
  capturedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

purchasePaymentSchema.index({ tenantId: 1, purchaseId: 1 });
purchasePaymentSchema.index({ tenantId: 1, capturedAt: -1 });

export default mongoose.model('PurchasePayment', purchasePaymentSchema);
```

### 9. expenses

```javascript
const expenseSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    enum: ['salary', 'utilities', 'maintenance', 'raw_material', 'other'],
    required: [true, 'Category is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description too long'],
    default: ''
  },
  imageUrl: {
    type: String,
    default: null
  },
  imagePublicId: {
    type: String,
    default: null
  },
  date: {
    type: Date,
    required: [true, 'Expense date is required']
  }
}, { timestamps: true });

expenseSchema.index({ tenantId: 1, date: -1 });
expenseSchema.index({ tenantId: 1, category: 1 });

export default mongoose.model('Expense', expenseSchema);
```

### 10. ocrjobs

```javascript
const ocrJobSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['invoice', 'payment', 'purchase', 'purchase_payment', 'expense'],
    required: true
  },
  rawResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  extractedData: {
    billNo: { type: String, default: null },
    name: { type: String, default: null },
    amount: { type: Number, default: null }
  },
  confidence: {
    type: String,
    enum: ['high', 'medium', 'low', 'failed'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['success', 'partial', 'failed'],
    default: 'success'
  }
}, { timestamps: true });

// Auto-delete OCR jobs after 30 days
ocrJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
ocrJobSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('OcrJob', ocrJobSchema);
```

---

## Data Relationships

```
Tenant (1) ──────── (many) TenantUser
User   (1) ──────── (many) TenantUser
User   (1) ──────── (many) RefreshToken

Tenant  (1) ──── (many) Invoice
Invoice (1) ──── (many) Payment

Tenant   (1) ──── (many) Purchase
Purchase (1) ──── (many) PurchasePayment

Tenant (1) ──── (many) Expense
Tenant (1) ──── (many) OcrJob
```

---

## Report Aggregation Queries

### Day Report
```javascript
const dayStart = new Date(date);
dayStart.setHours(0, 0, 0, 0);
const dayEnd = new Date(date);
dayEnd.setHours(23, 59, 59, 999);

// Invoice summary
const invoiceSummary = await Invoice.aggregate([
  { $match: { tenantId, createdAt: { $gte: dayStart, $lte: dayEnd } } },
  { $group: {
    _id: null,
    totalInvoiced: { $sum: '$totalAmount' },
    totalReceived: { $sum: '$amountReceived' },
    totalPending: { $sum: '$amountPending' },
    count: { $sum: 1 }
  }}
]);

// Purchase summary
const purchaseSummary = await Purchase.aggregate([
  { $match: { tenantId, createdAt: { $gte: dayStart, $lte: dayEnd } } },
  { $group: {
    _id: null,
    totalPurchased: { $sum: '$totalAmount' },
    count: { $sum: 1 }
  }}
]);

// Expense summary
const expenseSummary = await Expense.aggregate([
  { $match: { tenantId, date: { $gte: dayStart, $lte: dayEnd } } },
  { $group: {
    _id: null,
    totalExpenses: { $sum: '$amount' },
    count: { $sum: 1 }
  }}
]);
```

### Monthly Breakdown
```javascript
const monthlyBreakdown = await Invoice.aggregate([
  { $match: { tenantId, createdAt: { $gte: monthStart, $lte: monthEnd } } },
  { $group: {
    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    invoiced: { $sum: '$totalAmount' },
    received: { $sum: '$amountReceived' },
    pending: { $sum: '$amountPending' }
  }},
  { $sort: { '_id': 1 } }
]);
```

---

## Important Mongoose Middleware

```javascript
// Auto-update updatedAt on Invoice and Purchase saves
invoiceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure amountPending is always computed correctly before save
invoiceSchema.pre('save', function(next) {
  this.amountPending = Math.max(0, this.totalAmount - this.amountReceived);
  if (this.amountPending <= 0) this.status = 'paid';
  else if (this.amountReceived > 0) this.status = 'partially_paid';
  else this.status = 'pending';
  next();
});
// Apply same pre-save middleware to Purchase model
```
