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

export const updateSettingsSchema = z.object({
  brand: z
    .object({
      name: z.string().trim().max(60).optional(),
      tagline: z.string().trim().max(160).optional(),
    })
    .optional(),
  footer: z
    .object({
      blurb: z.string().trim().max(400).optional(),
      sections: z.array(sectionZ).max(10).optional(),
      copyright: z.string().trim().max(200).optional(),
    })
    .optional(),
})

// PUT /api/admin/settings — admin only.
export const updateSettings = asyncHandler(async (req, res) => {
  const doc = await SiteSettings.getSingleton()
  if (req.body.brand) doc.brand = { ...doc.brand.toObject(), ...req.body.brand }
  if (req.body.footer) {
    const fb = req.body.footer
    if (fb.blurb !== undefined) doc.footer.blurb = fb.blurb
    if (fb.copyright !== undefined) doc.footer.copyright = fb.copyright
    if (fb.sections !== undefined) doc.footer.sections = fb.sections
  }
  await doc.save()
  cache.del(CACHE_KEY)
  audit(req, 'admin.settings.update', { targetType: 'SiteSettings' })
  res.json(doc.toPublic())
})
