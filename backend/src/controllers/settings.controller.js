import path from 'node:path'
import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { notFound } from '../utils/ApiError.js'
import { SiteSettings } from '../models/SiteSettings.js'
import { cache } from '../services/cache.js'
import { presignGetUrl } from '../services/s3.js'

const CACHE_KEY = 'site:settings'

// GET /api/settings — public; the footer/site renders from this.
export const getSettings = asyncHandler(async (_req, res) => {
  const data = await cache.wrap(CACHE_KEY, 30, async () => (await SiteSettings.getSingleton()).toPublic())
  res.json(data)
})

// GET /api/launcher-download — public redirect to the (S3-hosted) launcher
// installer via a fresh short-lived presigned URL, so the download link in Site
// Settings stays stable while the underlying URL never goes stale.
export const downloadLauncher = asyncHandler(async (req, res) => {
  const doc = await SiteSettings.getSingleton()
  const key = doc.launcher?.storageKey
  if (!key) throw notFound('Launcher installer is not available')
  const filename = path.basename(key)
  const url = await presignGetUrl(key, { expiresIn: 300, disposition: `attachment; filename="${filename}"` })
  res.redirect(302, url)
})

// Reject dangerous URL schemes (javascript:, data:, vbscript:, protocol-relative).
// Allow internal /paths, #, http(s), mailto:, tel:.
const isSafeUrl = (u) => !u || /^(#|https?:\/\/|mailto:|tel:)/i.test(u) || (u.startsWith('/') && !u.startsWith('//'))
const urlField = z.string().trim().max(300).refine(isSafeUrl, 'Use a /path, https://…, mailto: or tel: link').default('')

const linkZ = z.object({ label: z.string().trim().max(60).default(''), url: urlField })
const socialZ = z.object({ platform: z.string().trim().max(30), url: urlField })

const customRowZ = z.object({
  icon: z.string().trim().max(32).default(''),
  text: z.string().trim().max(160).default(''),
  url: urlField,
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
          link: z.string().trim().max(300).refine(isSafeUrl, 'Use a /path or https://… link').optional(),
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
  launcher: z
    .object({
      url: z.string().trim().max(1000).refine(isSafeUrl, 'Use an https://… link').optional(),
      version: z.string().trim().max(40).optional(),
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

// PUT /api/admin/settings — admin only. Merges any provided section(s).
export const updateSettings = asyncHandler(async (req, res) => {
  const doc = await SiteSettings.getSingleton()
  const b = req.body
  const obj = (x) => (x?.toObject ? x.toObject() : x || {})
  if (b.brand) doc.brand = { ...obj(doc.brand), ...b.brand }
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
  if (b.launcher) doc.launcher = { ...(doc.launcher?.toObject ? doc.launcher.toObject() : doc.launcher || {}), ...b.launcher }
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
