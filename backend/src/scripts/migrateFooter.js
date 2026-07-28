import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  console.error("MONGO_URI not found in env!")
  process.exit(1)
}

const linkSchema = new mongoose.Schema({ label: String, url: String }, { _id: false })
const socialSchema = new mongoose.Schema({ platform: String, url: String }, { _id: false })

const sectionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['links', 'contact', 'social', 'text', 'custom'], default: 'links' },
    title: { type: String, default: '' },
    icon: { type: String, default: '' },
    links: { type: [linkSchema], default: undefined },
    phones: { type: [String], default: undefined },
    emails: { type: [String], default: undefined },
    address: { type: String, default: undefined },
    hours: { type: String, default: undefined },
    items: { type: [socialSchema], default: undefined },
    body: { type: String, default: undefined },
  },
  { _id: false }
)

const schema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'site', unique: true },
    brand: {
      name: { type: String, default: 'Aerolearn' },
      tagline: { type: String, default: 'Aviation Training Platform' },
      logoEmoji: { type: String, default: '✈' },
    },
    footer: {
      blurb: { type: String, default: '' },
      sections: { type: [sectionSchema], default: () => [] },
      copyright: { type: String, default: '' },
    },
  },
  { timestamps: true }
)

const SiteSettings = mongoose.model('SiteSettings', schema)

async function run() {
  console.log("Connecting to DB...")
  await mongoose.connect(MONGO_URI)
  console.log("Connected! Finding site settings...")
  
  let doc = await SiteSettings.findOne({ singleton: 'site' })
  if (!doc) {
    console.log("Creating new site settings singleton...")
    doc = new SiteSettings({ singleton: 'site' })
  }

  console.log("Updating branding settings...")
  doc.brand = doc.brand || {}
  doc.brand.name = "Aerolearn"
  doc.brand.tagline = "Aviation Training Platform"
  doc.brand.logoEmoji = "✈"

  console.log("Revamping footer sections...")
  doc.footer = doc.footer || {}
  doc.footer.blurb = "Join our newsletter to stay up to date on features and releases."
  doc.footer.copyright = "© {year} Aerolearn. All rights reserved."
  doc.footer.sections = [
    {
      type: 'contact',
      title: 'Contact us',
      links: [
        { label: 'Link One', url: '#' },
        { label: 'Link Two', url: '#' },
        { label: 'Link Three', url: '#' },
        { label: 'Link Four', url: '#' },
        { label: 'Link Five', url: '#' },
      ],
      phones: ['+91 77200 25900'],
      emails: ['contact@aerolearn.in'],
    },
    {
      type: 'links',
      title: 'about us',
      links: [
        { label: 'Link Six', url: '#' },
        { label: 'Link Seven', url: '#' },
        { label: 'Link Eight', url: '#' },
        { label: 'Link Nine', url: '#' },
        { label: 'Link Ten', url: '#' },
      ],
    },
    {
      type: 'social',
      title: 'Follow Us',
      items: [
        { platform: 'facebook', url: '#' },
        { platform: 'instagram', url: '#' },
        { platform: 'twitter', url: '#' },
        { platform: 'linkedin', url: '#' },
        { platform: 'youtube', url: '#' },
      ],
    },
  ]

  await doc.save()
  console.log("Successfully migrated site settings!")
  await mongoose.connection.close()
  console.log("Closed connection.")
}

run().catch(err => {
  console.error("Migration failed:", err)
  process.exit(1)
})
