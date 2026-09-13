import mongoose from 'mongoose';

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

// Pre-save middleware to auto-calculate amountPending and status
invoiceSchema.pre('validate', function() {
  if (this.totalAmount !== undefined) {
    const received = this.amountReceived || 0;
    this.amountPending = Math.max(0, this.totalAmount - received);
    if (this.amountPending <= 0) {
      this.status = 'paid';
    } else if (received > 0) {
      this.status = 'partially_paid';
    } else {
      this.status = 'pending';
    }
  }
});

invoiceSchema.index({ tenantId: 1, billNo: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, createdAt: -1 });
invoiceSchema.index({ tenantId: 1, status: 1 });
invoiceSchema.index({ tenantId: 1, customerName: 'text' });

export default mongoose.model('Invoice', invoiceSchema);
