import mongoose from 'mongoose';

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
