import mongoose from 'mongoose';

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
    select: false
  },
  failedPinAttempts: {
    type: Number,
    default: 0
  },
  pinLockoutUntil: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  loginLockoutUntil: {
    type: Date,
    default: null
  }
}, { timestamps: true });

tenantUserSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

export default mongoose.model('TenantUser', tenantUserSchema);
