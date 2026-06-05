import mongoose from 'mongoose'
import { PURCHASE_STATUS } from '@vigno/shared'

/**
 * Proof of payment (LLD: purchases). A purchase is the trigger that lets the
 * License Authority mint a license. Razorpay order/payment ids enable
 * idempotent webhook handling and refunds.
 */
const purchaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },

    amount: { type: Number, required: true }, // INR
    currency: { type: String, default: 'INR' },

    provider: { type: String, enum: ['razorpay', 'mock'], default: 'razorpay' },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },

    status: {
      type: String,
      enum: PURCHASE_STATUS,
      default: 'created',
      index: true,
    },
    licenseId: { type: String }, // jti of the license issued on success
    paidAt: { type: Date },
  },
  { timestamps: true }
)

export const Purchase = mongoose.model('Purchase', purchaseSchema)
