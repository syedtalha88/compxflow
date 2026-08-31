import mongoose from 'mongoose';

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
    amount: { type: Number, default: null },
    items: [
      {
        billNo: { type: String, default: null },
        amount: { type: Number, default: null }
      }
    ]
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

ocrJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
ocrJobSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('OcrJob', ocrJobSchema);
