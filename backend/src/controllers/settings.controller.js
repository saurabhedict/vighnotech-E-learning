import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { SiteSettings } from '../models/SiteSettings.js'
import { cache } from '../services/cache.js'

const CACHE_KEY = 'site:settings'

// GET /api/settings — public; the footer/site renders from this.
export const getSettings = asyncHandler(async (_req, res) => {
  const data = await cache.wrap(CACHE_KEY, 30, async () => (await SiteSettings.getSingleton()).toPublic())
  res.json(data)
})

const linkZ = z.object({ label: z.string().trim().max(60).default(''), url: z.string().trim().max(300).default('') })
const socialZ = z.object({ platform: z.string().trim().max(30), url: z.string().trim().max(300).default('') })

const customRowZ = z.object({
  icon: z.string().trim().max(32).default(''),
  text: z.string().trim().max(160).default(''),
  url: z.string().trim().max(300).default(''),
})

// A modular footer column. Only the fields relevant to its type are used.
const sectionZ = z.object({
  type: z.enum(['links', 'contact', 'social', 'text', 'custom']),
  title: z.string().trim().max(60).default(''),
  icon: z.string().trim().max(32).default(''),
  links: z.array(linkZ).max(30).optional(),
  phones: z.array(z.string().trim().max(40)).max(15).optional(),
  emails: z.array(z.string().trim().max(120)).max(15).optional(),
  address: z.string().trim().max(300).optional(),
  hours: z.string().trim().max(200).optional(),
  items: z.array(socialZ).max(15).optional(),
  body: z.string().trim().max(1000).optional(),
  rows: z.array(customRowZ).max(30).optional(),
})

const hexZ = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #RRGGBB colour').optional()

export const updateSettingsSchema = z.object({
  brand: z
    .object({
      name: z.string().trim().max(60).optional(),
      tagline: z.string().trim().max(160).optional(),
      logoEmoji: z.string().trim().max(16).optional(),
    })
    .optional(),
  header: z
    .object({
      showSearch: z.boolean().optional(),
      announcement: z
        .object({
          enabled: z.boolean().optional(),
          text: z.string().trim().max(200).optional(),
          link: z.string().trim().max(300).optional(),
        })
        .optional(),
      extraLinks: z.array(linkZ).max(10).optional(),
    })
    .optional(),
  home: z
    .object({
      heroEnabled: z.boolean().optional(),
      heroTitle: z.string().trim().max(120).optional(),
      heroSubtitle: z.string().trim().max(300).optional(),
    })
    .optional(),
  auth: z
    .object({
      loginGreeting: z.string().trim().max(80).optional(),
      loginSubtitle: z.string().trim().max(160).optional(),
      signupSubtitle: z.string().trim().max(160).optional(),
    })
    .optional(),
  theme: z.object({ accent: hexZ, accent2: hexZ }).optional(),
  footer: z
    .object({
      blurb: z.string().trim().max(400).optional(),
      sections: z.array(sectionZ).max(10).optional(),
      copyright: z.string().trim().max(200).optional(),
    })
    .optional(),
})

// PUT /api/admin/settings — admin only. Merges any provided section(s).
export const updateSettings = asyncHandler(async (req, res) => {
  const doc = await SiteSettings.getSingleton()
  const b = req.body
  if (b.brand) doc.brand = { ...doc.brand.toObject(), ...b.brand }
  if (b.header) {
    const cur = doc.header?.toObject ? doc.header.toObject() : doc.header || {}
    doc.header = {
      ...cur,
      ...b.header,
      announcement: { ...(cur.announcement || {}), ...(b.header.announcement || {}) },
    }
  }
  if (b.home) doc.home = { ...(doc.home?.toObject ? doc.home.toObject() : doc.home || {}), ...b.home }
  if (b.auth) doc.auth = { ...(doc.auth?.toObject ? doc.auth.toObject() : doc.auth || {}), ...b.auth }
  if (b.theme) doc.theme = { ...(doc.theme?.toObject ? doc.theme.toObject() : doc.theme || {}), ...b.theme }
  if (b.footer) {
    const fb = b.footer
    if (fb.blurb !== undefined) doc.footer.blurb = fb.blurb
    if (fb.copyright !== undefined) doc.footer.copyright = fb.copyright
    if (fb.sections !== undefined) doc.footer.sections = fb.sections
  }
  await doc.save()
  cache.del(CACHE_KEY)
  audit(req, 'admin.settings.update', { targetType: 'SiteSettings' })
  res.json(doc.toPublic())
})
