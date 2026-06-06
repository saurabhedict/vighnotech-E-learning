import mongoose from 'mongoose'

// A user's favorited content (LLD: Favorites).
const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
  },
  { timestamps: true }
)

favoriteSchema.index({ userId: 1, contentId: 1 }, { unique: true })

export const Favorite = mongoose.model('Favorite', favoriteSchema)
