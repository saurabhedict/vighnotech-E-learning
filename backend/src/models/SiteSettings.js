import mongoose from 'mongoose'

const link = new mongoose.Schema({ label: String, url: String }, { _id: false })
const social = new mongoose.Schema({ platform: String, url: String }, { _id: false })
const customRow = new mongoose.Schema({ icon: String, text: String, url: String }, { _id: false })

/**
 * A footer column. `type` decides which fields are used + how it renders:
 *   links   → title + links[] (label + url)         — nav / legal / resources
 *   contact → title + phones[] + emails[] + address + hours
 *   social  → title + items[] (platform + url)       — social icons
 *   text    → title + body                           — about / mission blurb
 *   custom  → title + rows[] (icon + text + url?)    — anything: hours, badges…
 * Every column also has an optional `icon` (emoji) shown next to its title.
 * Admins can add / remove / rename / reorder these freely from the panel.
 */
const section = new mongoose.Schema(
  {
    type: { type: String, enum: ['links', 'contact', 'social', 'text', 'custom'], default: 'links' },
    title: { type: String, default: '' },
    icon: { type: String, default: '' },
    links: { type: [link], default: undefined },
    phones: { type: [String], default: undefined },
    emails: { type: [String], default: undefined },
    address: { type: String, default: undefined },
    hours: { type: String, default: undefined },
    items: { type: [social], default: undefined },
    body: { type: String, default: undefined },
    rows: { type: [customRow], default: undefined },
  },
  { _id: false }
)

// Built-in default footer columns (used for a fresh install).
function defaultSections() {
  return [
    {
      type: 'links',
      title: 'Quick Links',
      links: [
        { label: 'Home', url: '/app' },
        { label: 'Library', url: '/app/library' },
        { label: 'Favorites', url: '/app/favorites' },
      ],
    },
    {
      type: 'links',
      title: 'Services',
      links: [
        { label: 'Counselling', url: '#' },
        { label: 'Premium Tests', url: '#' },
        { label: 'Mentorship', url: '#' },
      ],
    },
    {
      type: 'contact',
      title: 'Contact',
      phones: ['+91 77200 25900', '+91 77200 81400'],
      emails: ['contact@aerolearn.in', 'info@aerolearn.in'],
    },
    {
      type: 'social',
      title: 'Follow Us',
      items: [
        { platform: 'facebook', url: '#' },
        { platform: 'twitter', url: '#' },
        { platform: 'linkedin', url: '#' },
        { platform: 'instagram', url: '#' },
      ],
    },
  ]
}

// Convert the older flat footer shape (quickLinks/services/phones/emails/socials)
// into modular sections — one-time migration for docs created before sections.
function sectionsFromLegacy(f) {
  const s = []
  if (f.quickLinks?.length) s.push({ type: 'links', title: 'Quick Links', links: f.quickLinks.map((l) => ({ label: l.label, url: l.url })) })
  if (f.services?.length) s.push({ type: 'links', title: 'Services', links: f.services.map((l) => ({ label: l.label, url: l.url })) })
  if (f.phones?.length || f.emails?.length) s.push({ type: 'contact', title: 'Contact', phones: [...(f.phones || [])], emails: [...(f.emails || [])] })
  if (f.socials?.length) s.push({ type: 'social', title: 'Follow Us', items: f.socials.map((x) => ({ platform: x.platform, url: x.url })) })
  return s.length ? s : defaultSections()
}

/**
 * Singleton holding admin-editable site chrome (branding + footer). The footer
 * is a list of modular sections so the whole layout is configurable with no code
 * changes. Use SiteSettings.getSingleton().
 */
const schema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'site', unique: true },
    brand: {
      name: { type: String, default: 'AeroLearn' },
      tagline: { type: String, default: 'Aviation Training Platform' },
      logoEmoji: { type: String, default: '✈' },
    },
    // Top navigation bar
    header: {
      showSearch: { type: Boolean, default: true },
      announcement: {
        enabled: { type: Boolean, default: false },
        text: { type: String, default: '' },
        link: { type: String, default: '' },
      },
      extraLinks: { type: [link], default: () => [] },
    },
    // Home / dashboard hero
    home: {
      heroEnabled: { type: Boolean, default: false },
      heroTitle: { type: String, default: '' },
      heroSubtitle: { type: String, default: '' },
    },
    // Login / signup / forgot-password copy
    auth: {
      loginGreeting: { type: String, default: 'Welcome back' },
      loginSubtitle: { type: String, default: 'Sign in to continue' },
      signupSubtitle: { type: String, default: 'Create your account' },
    },
    footer: {
      blurb: { type: String, default: 'Practice mock tests for competitive exams with real exam simulation.' },
      sections: { type: [section], default: () => [] },
      copyright: { type: String, default: '© {year} AeroLearn. All rights reserved.' },
      // ── legacy (pre-sections) — retained only so old docs can be migrated ──
      quickLinks: { type: [link], default: undefined },
      services: { type: [link], default: undefined },
      phones: { type: [String], default: undefined },
      emails: { type: [String], default: undefined },
      socials: { type: [social], default: undefined },
    },
  },
  { timestamps: true }
)

schema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ singleton: 'site' })
  if (!doc) doc = await this.create({ singleton: 'site' })
  // Migrate / seed sections if empty, and clear legacy fields afterwards.
  if (!doc.footer.sections || doc.footer.sections.length === 0) {
    doc.footer.sections = sectionsFromLegacy(doc.footer)
    doc.footer.quickLinks = undefined
    doc.footer.services = undefined
    doc.footer.phones = undefined
    doc.footer.emails = undefined
    doc.footer.socials = undefined
    await doc.save()
  }
  return doc
}

// Public-safe shape consumed by the whole site (clean, no legacy fields).
schema.methods.toPublic = function toPublic() {
  return {
    brand: {
      name: this.brand?.name || 'AeroLearn',
      tagline: this.brand?.tagline || 'Aviation Training Platform',
      logoEmoji: this.brand?.logoEmoji || '✈',
    },
    header: {
      showSearch: this.header?.showSearch !== false,
      announcement: {
        enabled: !!this.header?.announcement?.enabled,
        text: this.header?.announcement?.text || '',
        link: this.header?.announcement?.link || '',
      },
      extraLinks: this.header?.extraLinks || [],
    },
    home: {
      heroEnabled: !!this.home?.heroEnabled,
      heroTitle: this.home?.heroTitle || '',
      heroSubtitle: this.home?.heroSubtitle || '',
    },
    auth: {
      loginGreeting: this.auth?.loginGreeting || 'Welcome back',
      loginSubtitle: this.auth?.loginSubtitle || 'Sign in to continue',
      signupSubtitle: this.auth?.signupSubtitle || 'Create your account',
    },
    footer: {
      blurb: this.footer?.blurb || '',
      sections: this.footer?.sections || [],
      copyright: this.footer?.copyright || '© {year} All rights reserved.',
    },
  }
}

export const SiteSettings = mongoose.model('SiteSettings', schema)
