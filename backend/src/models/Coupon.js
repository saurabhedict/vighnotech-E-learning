import mongoose from 'mongoose'

// Discount coupon (LLD: Coupons/Codes). 'percent' = % off, 'flat' = ₹ off.
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    kind: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true, min: 0 },
    maxRedemptions: { type: Number, default: 0 }, // 0 = unlimited
    redeemed: { type: Number, default: 0 },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

// Compute the discount for an amount, and whether the coupon is currently usable.
couponSchema.methods.evaluate = function evaluate(amount) {
  if (!this.active) return { usable: false, reason: 'inactive' }
  if (this.expiresAt && this.expiresAt < new Date()) return { usable: false, reason: 'expired' }
  if (this.maxRedemptions > 0 && this.redeemed >= this.maxRedemptions) return { usable: false, reason: 'exhausted' }
  const raw = this.kind === 'percent' ? (amount * this.value) / 100 : this.value
  const discount = Math.min(Math.round(raw), amount)
  return { usable: true, discount, finalAmount: amount - discount }
}

export const Coupon = mongoose.model('Coupon', couponSchema)
