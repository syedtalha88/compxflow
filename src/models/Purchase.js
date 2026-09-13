import mongoose from 'mongoose';

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

// Pre-save middleware to auto-calculate amountPending and status
purchaseSchema.pre('validate', function() {
  if (this.totalAmount !== undefined) {
    const paid = this.amountPaid || 0;
    this.amountPending = Math.max(0, this.totalAmount - paid);
    if (this.amountPending <= 0) {
      this.status = 'paid';
    } else if (paid > 0) {
      this.status = 'partially_paid';
    } else {
      this.status = 'pending';
    }
  }
});

purchaseSchema.index({ tenantId: 1, billNo: 1 }, { unique: true });
purchaseSchema.index({ tenantId: 1, createdAt: -1 });
purchaseSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model('Purchase', purchaseSchema);
