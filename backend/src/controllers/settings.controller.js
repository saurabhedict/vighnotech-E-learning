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
      quickLinks: z.array(linkZ).max(20).optional(),
      services: z.array(linkZ).max(20).optional(),
      phones: z.array(z.string().trim().max(40)).max(10).optional(),
      emails: z.array(z.string().trim().max(120)).max(10).optional(),
      socials: z.array(socialZ).max(12).optional(),
      copyright: z.string().trim().max(200).optional(),
    })
    .optional(),
})

// PUT /api/admin/settings — admin only.
export const updateSettings = asyncHandler(async (req, res) => {
  const doc = await SiteSettings.getSingleton()
  if (req.body.brand) doc.brand = { ...doc.brand.toObject(), ...req.body.brand }
  if (req.body.footer) doc.footer = { ...doc.footer.toObject(), ...req.body.footer }
  await doc.save()
  cache.del(CACHE_KEY)
  audit(req, 'admin.settings.update', { targetType: 'SiteSettings' })
  res.json(doc.toPublic())
})
