import mongoose from 'mongoose';

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
