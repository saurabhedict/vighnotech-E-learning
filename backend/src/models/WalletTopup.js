import mongoose from 'mongoose'

/**
 * A wallet top-up order. Mirrors Purchase but credits the wallet instead of
 * issuing a license. Tracking each order lets us verify the Razorpay signature
 * and credit the wallet exactly once (idempotent across verify + webhook).
 */
const walletTopupSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true }, // INR
    currency: { type: String, default: 'INR' },
    provider: { type: String, enum: ['razorpay', 'mock'], default: 'razorpay' },
    razorpayOrderId: { type: String, index: true, required: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
)

export const WalletTopup = mongoose.model('WalletTopup', walletTopupSchema)
