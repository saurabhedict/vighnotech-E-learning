// Data layer. Each function FIRST tries the real backend via Axios, then falls
// back to mock data when the backend isn't running yet — so Axios is genuinely
// wired (interceptors + baseURL) and we swap to live data by just starting the API.
import api from './axiosClient'

const COURSES = [
  'PPL_Ground',
  'PPL_Flight',
  'CPL_Ground',
  'CPL_Flight',
  'ATPL_Ground',
  'ATPL_Flight',
  'IR_Training',
  'MCC_Course',
  'CRM_Training',
  'Dispatch_Ops',
  'Cabin_Crew',
  'ATC_Basics',
]

const TREE = {
  PPL_Ground: [
    {
      subject: 'Air Law & Regulations',
      modules: [
        { id: 'm1', name: 'DGCA Regulations & ICAO Standards', chapters: [
          { name: 'Unit 1 — Air Navigation Order', items: [
            { id: 'c1', title: 'ANO Study Notes', type: 'pdf', paid: false },
            { id: 'c2', title: 'ICAO Annexes Overview — Video Lecture', type: 'video', paid: false },
          ]},
          { name: 'Unit 2 — Rules of the Air', items: [
            { id: 'c3', title: 'Rules of the Air — Study Notes', type: 'pdf', paid: false },
            { id: 'c4', title: 'ROA Animated Explainer Pack', type: 'video', paid: true, price: 499 },
          ]},
        ]},
        { id: 'm2', name: 'Airspace Classification', chapters: [
          { name: 'Unit 1 — Indian Airspace Structure', items: [
            { id: 'c5', title: 'Airspace Classification Notes', type: 'pdf', paid: false },
            { id: 'c6', title: 'Airspace 3D Interactive Model', type: '3d', paid: true, price: 299 },
          ]},
        ]},
      ],
    },
    {
      subject: 'Meteorology',
      modules: [
        { id: 'm3', name: 'Aviation Weather & METAR/TAF', chapters: [
          { name: 'Unit 1 — Atmosphere & Weather Phenomena', items: [
            { id: 'c7', title: 'Aviation Met — Study Notes', type: 'pdf', paid: false },
            { id: 'c8', title: 'Weather Patterns — Time-lapse Video', type: 'video', paid: false },
            { id: 'c9', title: 'METAR/TAF Decoder Interactive', type: '3d', paid: true, price: 199 },
          ]},
        ]},
      ],
    },
  ],
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Only fall back to mock data on a true TRANSPORT failure (backend not running).
// Real HTTP errors (401/403/404/500) must propagate so the auth interceptor and
// React Query error states work — and so paid gating is never silently bypassed.
const isNetworkError = (err) => !err?.response

// Attach media + a `locked` flag mirroring the backend contract, so the paywall
// still shows for paid items when running on the offline mock.
function withMedia(it) {
  const base = { ...it, paid: !!it.paid, locked: !!it.paid }
  if (it.paid) return base // locked: no media until purchased
  if (it.type === 'video') return { ...base, src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
  if (it.type === 'pdf') return { ...base, url: '/sample-notes.pdf' }
  return base
}

export async function fetchClasses() {
  try { return (await api.get('/courses')).data }
  catch (err) { if (!isNetworkError(err)) throw err; await wait(150); return COURSES }
}

export async function fetchClassTree(className) {
  try { return (await api.get(`/courses/${className}/tree`)).data }
  catch (err) { if (!isNetworkError(err)) throw err; await wait(300); return TREE[className] ?? [] }
}

export async function fetchModule(className, moduleId) {
  try { return (await api.get(`/courses/${className}/modules/${moduleId}`)).data }
  catch (err) {
    if (!isNetworkError(err)) throw err
    await wait(250)
    for (const s of TREE[className] ?? [])
      for (const m of s.modules)
        if (m.id === moduleId) return { ...m, subject: s.subject }
    throw new Error('Module not found')
  }
}

export async function fetchContent(contentId) {
  try { return (await api.get(`/contents/${contentId}`)).data }
  catch (err) {
    if (!isNetworkError(err)) throw err
    await wait(200)
    for (const cls of Object.values(TREE))
      for (const s of cls)
        for (const m of s.modules)
          for (const ch of m.chapters)
            for (const it of ch.items)
              if (it.id === contentId) return withMedia(it)
    throw new Error('Content not found')
  }
}
