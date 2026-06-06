import mongoose from 'mongoose'

// Wallet ledger entry (LLD: Wallet/Credits). Every balance change is recorded.
const walletTxnSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['topup', 'spend', 'refund'], required: true },
    amount: { type: Number, required: true }, // INR, positive
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: '' },
    ref: { type: String }, // related purchase / license id
  },
  { timestamps: true }
)

walletTxnSchema.index({ userId: 1, createdAt: -1 })

export const WalletTxn = mongoose.model('WalletTxn', walletTxnSchema)
