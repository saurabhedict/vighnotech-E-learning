import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { TreeNode } from '../models/TreeNode.js'
import { Content } from '../models/Content.js'
import { saveBuffer } from '../services/storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HLS_DEMO = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

// Top-level course slugs the sidebar lists (mirrors src/api/mockApi.js COURSES).
const COURSES = [
  'PPL_Ground', 'PPL_Flight', 'CPL_Ground', 'CPL_Flight',
  'ATPL_Ground', 'ATPL_Flight', 'IR_Training', 'MCC_Course',
  'CRM_Training', 'Dispatch_Ops', 'Cabin_Crew', 'ATC_Basics',
]

// Full tree for PPL_Ground (mirrors the frontend mock so the existing UI lights
// up against the real backend).
const PPL_GROUND = [
  {
    subject: 'Air Law & Regulations',
    modules: [
      {
        name: 'DGCA Regulations & ICAO Standards',
        chapters: [
          {
            name: 'Unit 1 — Air Navigation Order',
            items: [
              { title: 'ANO Study Notes', type: 'pdf', paid: false },
              { title: 'ICAO Annexes Overview — Video Lecture', type: 'video', paid: false },
            ],
          },
          {
            name: 'Unit 2 — Rules of the Air',
            items: [
              { title: 'Rules of the Air — Study Notes', type: 'pdf', paid: false },
              { title: 'ROA Animated Explainer Pack', type: 'video', paid: true, price: 499 },
            ],
          },
        ],
      },
      {
        name: 'Airspace Classification',
        chapters: [
          {
            name: 'Unit 1 — Indian Airspace Structure',
            items: [
              { title: 'Airspace Classification Notes', type: 'pdf', paid: false },
              { title: 'Airspace 3D Interactive Model', type: '3d', paid: true, price: 299 },
            ],
          },
        ],
      },
    ],
  },
  {
    subject: 'Meteorology',
    modules: [
      {
        name: 'Aviation Weather & METAR/TAF',
        chapters: [
          {
            name: 'Unit 1 — Atmosphere & Weather Phenomena',
            items: [
              { title: 'Aviation Met — Study Notes', type: 'pdf', paid: false },
              { title: 'Weather Patterns — Time-lapse Video', type: 'video', paid: false },
              { title: 'METAR/TAF Decoder Interactive', type: '3d', paid: true, price: 199 },
            ],
          },
        ],
      },
    ],
  },
]

async function loadSamplePdfKey() {
  // Push the frontend's sample PDF into our storage so free PDFs flow through
  // the real signed-URL pipeline (not a static file).
  const src = path.resolve(__dirname, '../../../frontend/public/sample-notes.pdf')
  if (!fs.existsSync(src)) return null
  const { storageKey } = await saveBuffer(fs.readFileSync(src), 'sample-notes.pdf')
  return storageKey
}

async function ensureUser({ email, name, role, password }) {
  let user = await User.findOne({ email })
  if (user) return { user, created: false }
  user = new User({ email, name, role, emailVerified: true })
  await user.setPassword(password)
  await user.save()
  return { user, created: true }
}

/**
 * Idempotent seed. Always rebuilds the content tree; never deletes users.
 * Returns a summary for logging.
 */
export async function seedDatabase({ log = () => {} } = {}) {
  log('[seed] clearing content tree…')
  await Promise.all([TreeNode.deleteMany({}), Content.deleteMany({})])

  const admin = await ensureUser({
    email: env.seed.adminEmail,
    name: 'Vigno Admin',
    role: 'admin',
    password: env.seed.adminPassword,
  })
  if (admin.created) log(`[seed] created admin: ${env.seed.adminEmail} / ${env.seed.adminPassword}`)

  const student = await ensureUser({
    email: 'cadet@aerolearn.in',
    name: 'Demo Cadet',
    role: 'user',
    password: 'password',
  })
  if (student.created) log('[seed] created student: cadet@aerolearn.in / password')

  const pdfKey = await loadSamplePdfKey()
  if (!pdfKey) log('[seed] sample-notes.pdf not found — free PDFs will have no media')

  for (let i = 0; i < COURSES.length; i++) {
    const slug = COURSES[i]
    await TreeNode.create({ kind: 'course', name: slug.replace(/_/g, ' '), slug, courseKey: slug, order: i })
  }
  const pplGround = await TreeNode.findOne({ slug: 'PPL_Ground' })

  let createdContent = 0
  for (let si = 0; si < PPL_GROUND.length; si++) {
    const s = PPL_GROUND[si]
    const subject = await TreeNode.create({
      kind: 'subject', name: s.subject, parentId: pplGround._id, courseKey: 'PPL_Ground', order: si,
    })
    for (let mi = 0; mi < s.modules.length; mi++) {
      const m = s.modules[mi]
      const mod = await TreeNode.create({
        kind: 'module', name: m.name, parentId: subject._id, courseKey: 'PPL_Ground', order: mi,
      })
      for (let ci = 0; ci < m.chapters.length; ci++) {
        const ch = m.chapters[ci]
        const chapter = await TreeNode.create({
          kind: 'chapter', name: ch.name, parentId: mod._id, courseKey: 'PPL_Ground', order: ci,
        })
        for (let ii = 0; ii < ch.items.length; ii++) {
          const it = ch.items[ii]
          const doc = {
            chapterId: chapter._id,
            courseKey: 'PPL_Ground',
            title: it.title,
            type: it.type,
            lane: 'stream',
            isPaid: !!it.paid,
            price: it.price || 0,
            order: ii,
          }
          if (it.type === 'pdf' && pdfKey) doc.storageKey = pdfKey
          if (it.type === 'video') doc.externalUrl = HLS_DEMO
          await Content.create(doc)
          createdContent++
        }
      }
    }
  }

  const summary = { courses: COURSES.length, content: createdContent }
  log(`[seed] created ${summary.courses} courses, full PPL_Ground tree, ${summary.content} content items`)
  return summary
}

// Has the DB already been seeded with the content tree?
export async function isSeeded() {
  return (await TreeNode.countDocuments({ kind: 'course' })) > 0
}
