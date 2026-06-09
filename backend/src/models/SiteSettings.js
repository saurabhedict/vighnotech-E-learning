import mongoose from 'mongoose'

const link = new mongoose.Schema({ label: String, url: String }, { _id: false })
const social = new mongoose.Schema({ platform: String, url: String }, { _id: false })

/**
 * Singleton document holding admin-editable site chrome (branding + footer), so
 * links, emails, phone numbers and social URLs can be changed from the admin
 * panel with no code changes. Use SiteSettings.getSingleton().
 */
const schema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'site', unique: true },
    brand: {
      name: { type: String, default: 'AeroLearn' },
      tagline: { type: String, default: 'Aviation Training Platform' },
    },
    footer: {
      blurb: { type: String, default: 'Practice mock tests for competitive exams with real exam simulation.' },
      quickLinks: {
        type: [link],
        default: () => [
          { label: 'Home', url: '/app' },
          { label: 'Library', url: '/app/library' },
          { label: 'Favorites', url: '/app/favorites' },
        ],
      },
      services: {
        type: [link],
        default: () => [
          { label: 'Counselling', url: '#' },
          { label: 'Premium Tests', url: '#' },
          { label: 'Mentorship', url: '#' },
        ],
      },
      phones: { type: [String], default: () => ['+91 77200 25900', '+91 77200 81400'] },
      emails: { type: [String], default: () => ['contact@aerolearn.in', 'info@aerolearn.in'] },
      socials: {
        type: [social],
        default: () => [
          { platform: 'facebook', url: '#' },
          { platform: 'twitter', url: '#' },
          { platform: 'linkedin', url: '#' },
          { platform: 'instagram', url: '#' },
        ],
      },
      copyright: { type: String, default: '© {year} AeroLearn. All rights reserved.' },
    },
  },
  { timestamps: true }
)

schema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ singleton: 'site' })
  if (!doc) doc = await this.create({ singleton: 'site' })
  return doc
}

// Public-safe shape consumed by the footer/site.
schema.methods.toPublic = function toPublic() {
  return { brand: this.brand, footer: this.footer }
}

export const SiteSettings = mongoose.model('SiteSettings', schema)
