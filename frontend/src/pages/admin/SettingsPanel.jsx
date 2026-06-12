import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../../api/settingsApi'
import { useSiteSettings, SITE_SETTINGS_KEY } from '../../hooks/useSiteSettings'
import { apiErrorMessage } from '../../api/authApi'
import EmojiPicker from '../../components/EmojiPicker'

const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent w-full'
const SOCIALS = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube']
const TYPE_LABEL = { links: '🔗 Links', contact: '📇 Contact', social: '📣 Social', text: '📝 Text', custom: '✨ Custom' }
const SECTION_TYPES = [
  { type: 'links', label: '+ Links', hint: 'Nav / legal / resources' },
  { type: 'contact', label: '+ Contact', hint: 'Phone, email, address, hours' },
  { type: 'social', label: '+ Social', hint: 'Social media icons' },
  { type: 'text', label: '+ Text', hint: 'About / mission blurb' },
  { type: 'custom', label: '+ Custom', hint: 'Anything: emoji + text + link' },
]

// The modular hub: each card opens an editor for that part of the site.
const HUB = [
  { key: 'branding', icon: '🎨', title: 'Branding', desc: 'Name, tagline & logo icon' },
  { key: 'header', icon: '🧭', title: 'Header / Navbar', desc: 'Search, announcement bar, extra links' },
  { key: 'home', icon: '🏠', title: 'Home Page', desc: 'Hero heading & subtitle' },
  { key: 'footer', icon: '📑', title: 'Footer', desc: 'Columns, links, contact, social' },
  { key: 'auth', icon: '🔑', title: 'Login & Signup', desc: 'Greeting & subtitles' },
  { key: 'launcher', icon: '🖥️', title: 'Desktop Launcher', desc: 'Installer link for games / software' },
]

function RemoveBtn({ onClick, title = 'Remove' }) {
  return <button onClick={onClick} title={title} className="shrink-0 w-9 h-9 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300">✕</button>
}
function AddRowBtn({ onClick, children }) {
  return <button onClick={onClick} className="text-xs bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-2.5 py-1.5">+ {children}</button>
}
function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-xs text-vigno-muted block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-vigno-muted/70 mt-1">{hint}</p>}
    </div>
  )
}
function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm">
      <span className={'w-9 h-5 rounded-full relative transition ' + (checked ? 'bg-vigno-accent' : 'bg-white/15')}>
        <span className={'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ' + (checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
      <span>{label}</span>
    </button>
  )
}

// ── Footer per-type row editors ──────────────────────────────────────────────
function LinkRows({ items, onChange }) {
  const upd = (i, k, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  const rm = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input className={input + ' max-w-[40%]'} placeholder="Label" value={it.label || ''} onChange={(e) => upd(i, 'label', e.target.value)} />
          <input className={input} placeholder="/route or https://…" value={it.url || ''} onChange={(e) => upd(i, 'url', e.target.value)} />
          <RemoveBtn onClick={() => rm(i)} />
        </div>
      ))}
      <AddRowBtn onClick={() => onChange([...items, { label: '', url: '' }])}>Link</AddRowBtn>
    </>
  )
}
function StringRows({ items, onChange, placeholder, addLabel }) {
  const upd = (i, v) => onChange(items.map((it, idx) => (idx === i ? v : it)))
  const rm = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input className={input} placeholder={placeholder} value={it || ''} onChange={(e) => upd(i, e.target.value)} />
          <RemoveBtn onClick={() => rm(i)} />
        </div>
      ))}
      <AddRowBtn onClick={() => onChange([...items, ''])}>{addLabel}</AddRowBtn>
    </>
  )
}
function SocialRows({ items, onChange }) {
  const upd = (i, k, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  const rm = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <select className={input + ' max-w-[40%]'} value={it.platform || 'facebook'} onChange={(e) => upd(i, 'platform', e.target.value)}>
            {SOCIALS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className={input} placeholder="https://…" value={it.url || ''} onChange={(e) => upd(i, 'url', e.target.value)} />
          <RemoveBtn onClick={() => rm(i)} />
        </div>
      ))}
      <AddRowBtn onClick={() => onChange([...items, { platform: 'facebook', url: '' }])}>Social</AddRowBtn>
    </>
  )
}
function CustomRows({ items, onChange }) {
  const upd = (i, k, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  const rm = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 items-start">
          <EmojiPicker value={it.icon || ''} onChange={(v) => upd(i, 'icon', v)} />
          <div className="flex-1 space-y-1.5">
            <input className={input} placeholder="Text (e.g. Mon–Fri: 9am–6pm)" value={it.text || ''} onChange={(e) => upd(i, 'text', e.target.value)} />
            <input className={input} placeholder="Optional link — /route or https://…" value={it.url || ''} onChange={(e) => upd(i, 'url', e.target.value)} />
          </div>
          <RemoveBtn onClick={() => rm(i)} />
        </div>
      ))}
      <AddRowBtn onClick={() => onChange([...items, { icon: '', text: '', url: '' }])}>Row</AddRowBtn>
    </>
  )
}
function SectionCard({ section, index, count, onChange, onMove, onRemove }) {
  const set = (k, v) => onChange({ ...section, [k]: v })
  return (
    <div className="bg-vigno-bg2/40 border border-vigno-line rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wide bg-white/10 border border-vigno-line rounded px-1.5 py-0.5 text-vigno-muted shrink-0">{TYPE_LABEL[section.type] || section.type}</span>
        <button onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up" className="ml-auto w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30">↑</button>
        <button onClick={() => onMove(index, 1)} disabled={index === count - 1} title="Move down" className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30">↓</button>
        <RemoveBtn onClick={() => onRemove(index)} title="Remove section" />
      </div>
      <div className="flex gap-2 mb-3">
        <EmojiPicker value={section.icon || ''} onChange={(v) => set('icon', v)} />
        <input className={input + ' flex-1'} placeholder="Column title (e.g. Quick Links)" value={section.title || ''} onChange={(e) => set('title', e.target.value)} />
      </div>
      <div className="space-y-2">
        {section.type === 'links' && <LinkRows items={section.links || []} onChange={(v) => set('links', v)} />}
        {section.type === 'contact' && (
          <>
            <div className="text-xs text-vigno-muted">Phone numbers</div>
            <StringRows items={section.phones || []} onChange={(v) => set('phones', v)} placeholder="+91 77200 25900" addLabel="Phone" />
            <div className="text-xs text-vigno-muted pt-1">Emails</div>
            <StringRows items={section.emails || []} onChange={(v) => set('emails', v)} placeholder="contact@example.org" addLabel="Email" />
            <div className="text-xs text-vigno-muted pt-1">Address</div>
            <textarea className={input + ' h-16 resize-none'} placeholder="123 Street, City, Country" value={section.address || ''} onChange={(e) => set('address', e.target.value)} />
            <div className="text-xs text-vigno-muted pt-1">Working hours</div>
            <input className={input} placeholder="Mon–Sat: 9am–6pm" value={section.hours || ''} onChange={(e) => set('hours', e.target.value)} />
          </>
        )}
        {section.type === 'social' && <SocialRows items={section.items || []} onChange={(v) => set('items', v)} />}
        {section.type === 'text' && (
          <textarea className={input + ' h-24 resize-none'} placeholder="A short paragraph — about us, mission statement…" value={section.body || ''} onChange={(e) => set('body', e.target.value)} />
        )}
        {section.type === 'custom' && <CustomRows items={section.rows || []} onChange={(v) => set('rows', v)} />}
      </div>
    </div>
  )
}

// Normalize loaded data → editable form (all editable areas).
function toForm(d) {
  const b = d?.brand || {}, h = d?.header || {}, hm = d?.home || {}, au = d?.auth || {}, f = d?.footer || {}, lc = d?.launcher || {}
  return {
    launcher: { url: lc.url || '', version: lc.version || '' },
    brand: { name: b.name || '', tagline: b.tagline || '', logoEmoji: b.logoEmoji || '✈' },
    header: {
      showSearch: h.showSearch !== false,
      announcement: { enabled: !!h.announcement?.enabled, text: h.announcement?.text || '', link: h.announcement?.link || '' },
      extraLinks: (h.extraLinks || []).map((l) => ({ label: l.label || '', url: l.url || '' })),
    },
    home: { heroEnabled: !!hm.heroEnabled, heroTitle: hm.heroTitle || '', heroSubtitle: hm.heroSubtitle || '' },
    auth: {
      loginGreeting: au.loginGreeting || 'Welcome back',
      loginSubtitle: au.loginSubtitle || 'Sign in to continue',
      signupSubtitle: au.signupSubtitle || 'Create your account',
    },
    footer: {
      blurb: f.blurb || '',
      copyright: f.copyright || '',
      sections: (f.sections || []).map((s) => ({
        type: s.type || 'links',
        title: s.title || '',
        icon: s.icon || '',
        links: (s.links || []).map((l) => ({ label: l.label || '', url: l.url || '' })),
        phones: [...(s.phones || [])],
        emails: [...(s.emails || [])],
        address: s.address || '',
        hours: s.hours || '',
        items: (s.items || []).map((x) => ({ platform: x.platform || 'facebook', url: x.url || '' })),
        body: s.body || '',
        rows: (s.rows || []).map((r) => ({ icon: r.icon || '', text: r.text || '', url: r.url || '' })),
      })),
    },
  }
}

const TITLE_BY_TYPE = { contact: 'Contact', social: 'Follow Us', text: 'About', custom: 'New Column' }
const ICON_BY_TYPE = { links: '🔗', contact: '📇', social: '📣', text: '📝', custom: '✨' }
const blankSection = (type) => ({
  type, title: TITLE_BY_TYPE[type] || 'Quick Links', icon: ICON_BY_TYPE[type] || '',
  links: type === 'links' ? [{ label: '', url: '' }] : [], phones: [], emails: [], address: '', hours: '',
  items: type === 'social' ? [{ platform: 'facebook', url: '' }] : [], body: '',
  rows: type === 'custom' ? [{ icon: '', text: '', url: '' }] : [],
})

export default function SettingsPanel() {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useSiteSettings()
  const [form, setForm] = useState(null)
  const [section, setSection] = useState(null)
  const [dirty, setDirty] = useState(() => new Set())
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (data && !form) setForm(toForm(data)) }, [data, form])

  if (isLoading) return <p className="text-vigno-muted">Loading settings…</p>
  if (isError) return <p className="text-red-300">Failed to load settings.</p>
  if (!form) return null

  // Track which top-level sections changed so a save only sends those (never
  // overwrites a section the admin didn't touch).
  const markDirty = (k) => setDirty((d) => (d.has(k) ? d : new Set(d).add(k)))
  const setBrand = (k, v) => { markDirty('brand'); setForm((s) => ({ ...s, brand: { ...s.brand, [k]: v } })) }
  const setHeader = (k, v) => { markDirty('header'); setForm((s) => ({ ...s, header: { ...s.header, [k]: v } })) }
  const setAnnounce = (k, v) => { markDirty('header'); setForm((s) => ({ ...s, header: { ...s.header, announcement: { ...s.header.announcement, [k]: v } } })) }
  const setHome = (k, v) => { markDirty('home'); setForm((s) => ({ ...s, home: { ...s.home, [k]: v } })) }
  const setAuth = (k, v) => { markDirty('auth'); setForm((s) => ({ ...s, auth: { ...s.auth, [k]: v } })) }
  const setLauncher = (k, v) => { markDirty('launcher'); setForm((s) => ({ ...s, launcher: { ...s.launcher, [k]: v } })) }
  const setFooter = (k, v) => { markDirty('footer'); setForm((s) => ({ ...s, footer: { ...s.footer, [k]: v } })) }
  const sections = form.footer.sections
  const updateSection = (i, next) => setFooter('sections', sections.map((s, idx) => (idx === i ? next : s)))
  const removeSection = (i) => setFooter('sections', sections.filter((_, idx) => idx !== i))
  const addSection = (type) => setFooter('sections', [...sections, blankSection(type)])
  const moveSection = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= sections.length) return
    const next = [...sections]
    ;[next[i], next[j]] = [next[j], next[i]]
    setFooter('sections', next)
  }

  const save = async () => {
    if (dirty.size === 0) { setMsg({ ok: true, text: 'No changes to save.' }); return }
    setSaving(true); setMsg(null)
    try {
      // Send only edited sections so untouched sections are never overwritten.
      const payload = {}
      dirty.forEach((k) => { payload[k] = form[k] })
      const saved = await settingsApi.update(payload)
      qc.setQueryData(SITE_SETTINGS_KEY, saved)
      setForm(toForm(saved))
      setDirty(new Set())
      setMsg({ ok: true, text: 'Saved — changes are live across the site.' })
    } catch (e) {
      setMsg({ ok: false, text: apiErrorMessage(e, 'Save failed') })
    } finally { setSaving(false) }
  }
  // Reset pulls the latest from the server (avoids restoring stale cached data).
  const reset = async () => {
    try {
      const fresh = await settingsApi.get()
      qc.setQueryData(SITE_SETTINGS_KEY, fresh)
      setForm(toForm(fresh))
      setDirty(new Set())
      setMsg(null)
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Could not reload') }) }
  }

  // ── Editors per section ────────────────────────────────────────────────────
  const editors = {
    branding: (
      <div className="space-y-3">
        <div className="flex gap-3 items-end">
          <Field label="Logo icon"><EmojiPicker value={form.brand.logoEmoji} onChange={(v) => setBrand('logoEmoji', v)} /></Field>
          <div className="flex-1"><Field label="Brand name (navbar, footer, auth pages)"><input className={input} value={form.brand.name} onChange={(e) => setBrand('name', e.target.value)} placeholder="AeroLearn" /></Field></div>
        </div>
        <Field label="Tagline (shown on the login page)"><input className={input} value={form.brand.tagline} onChange={(e) => setBrand('tagline', e.target.value)} placeholder="Aviation Training Platform" /></Field>
      </div>
    ),
    header: (
      <div className="space-y-4">
        <Toggle checked={form.header.showSearch} onChange={(v) => setHeader('showSearch', v)} label="Show the search box in the navbar" />
        <div className="bg-vigno-bg2/40 border border-vigno-line rounded-xl p-4 space-y-2">
          <Toggle checked={form.header.announcement.enabled} onChange={(v) => setAnnounce('enabled', v)} label="Show announcement bar (top strip)" />
          <Field label="Announcement text"><input className={input} value={form.header.announcement.text} onChange={(e) => setAnnounce('text', e.target.value)} placeholder="🎉 New mock tests added for 2026!" /></Field>
          <Field label="Announcement link (optional)" hint="Where clicking the bar goes — /route or https://…"><input className={input} value={form.header.announcement.link} onChange={(e) => setAnnounce('link', e.target.value)} placeholder="/app/library" /></Field>
        </div>
        <div>
          <div className="text-xs text-vigno-muted mb-2">Extra navbar links</div>
          <div className="space-y-2"><LinkRows items={form.header.extraLinks} onChange={(v) => setHeader('extraLinks', v)} /></div>
        </div>
      </div>
    ),
    home: (
      <div className="space-y-3">
        <Toggle checked={form.home.heroEnabled} onChange={(v) => setHome('heroEnabled', v)} label="Show a hero banner at the top of the home page" />
        <Field label="Hero heading"><input className={input} value={form.home.heroTitle} onChange={(e) => setHome('heroTitle', e.target.value)} placeholder="Welcome to Vidyarthi Mitra" /></Field>
        <Field label="Hero subtitle"><textarea className={input + ' h-20 resize-none'} value={form.home.heroSubtitle} onChange={(e) => setHome('heroSubtitle', e.target.value)} placeholder="Practice mock tests with real exam simulation." /></Field>
      </div>
    ),
    auth: (
      <div className="space-y-3">
        <Field label="Login greeting"><input className={input} value={form.auth.loginGreeting} onChange={(e) => setAuth('loginGreeting', e.target.value)} placeholder="Welcome back" /></Field>
        <Field label="Login subtitle"><input className={input} value={form.auth.loginSubtitle} onChange={(e) => setAuth('loginSubtitle', e.target.value)} placeholder="Sign in to continue" /></Field>
        <Field label="Signup subtitle"><input className={input} value={form.auth.signupSubtitle} onChange={(e) => setAuth('signupSubtitle', e.target.value)} placeholder="Create your account" /></Field>
      </div>
    ),
    launcher: (
      <div className="space-y-3">
        <p className="text-xs text-vigno-muted">
          Build the installer (<span className="font-mono">cd launcher &amp;&amp; npm run dist</span>), host the file (S3 / GitHub release / your
          server), and paste its public link below. Owners of game/software titles then see an <b>“Install the Launcher”</b> button.
        </p>
        <Field label="Installer download URL" hint="Direct https:// link to the .exe / .dmg / .AppImage">
          <input className={input} value={form.launcher.url} onChange={(e) => setLauncher('url', e.target.value)} placeholder="https://downloads.example.com/VignoLauncher-Setup.exe" />
        </Field>
        <Field label="Version (optional)" hint="Shown next to the button, e.g. 1.0.0">
          <input className={input + ' max-w-[200px]'} value={form.launcher.version} onChange={(e) => setLauncher('version', e.target.value)} placeholder="1.0.0" />
        </Field>
      </div>
    ),
    footer: (
      <div className="space-y-4">
        <Field label="Footer blurb (under the logo)"><textarea className={input + ' h-20 resize-none'} value={form.footer.blurb} onChange={(e) => setFooter('blurb', e.target.value)} placeholder="Practice mock tests for competitive exams…" /></Field>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-bold">Footer columns</span>
          <div className="flex gap-2 flex-wrap">
            {SECTION_TYPES.map((t) => (
              <button key={t.type} onClick={() => addSection(t.type)} title={t.hint} className="text-xs bg-vigno-accent/90 text-[#1a0d0f] font-bold rounded-lg px-2.5 py-1.5">{t.label}</button>
            ))}
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {sections.map((s, i) => (
            <SectionCard key={i} section={s} index={i} count={sections.length} onChange={(next) => updateSection(i, next)} onMove={moveSection} onRemove={removeSection} />
          ))}
        </div>
        {sections.length === 0 && <p className="text-xs text-vigno-muted">No columns. Add one above.</p>}
        <Field label="Copyright line — use {year} for the current year"><input className={input} value={form.footer.copyright} onChange={(e) => setFooter('copyright', e.target.value)} placeholder="© {year} AeroLearn. All rights reserved." /></Field>
      </div>
    ),
  }

  const current = HUB.find((h) => h.key === section)

  return (
    <div className="space-y-5">
      {!section ? (
        <>
          <p className="text-xs text-vigno-muted">Choose a part of the website to customise. Everything updates live — no code changes.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {HUB.map((h) => (
              <button key={h.key} onClick={() => { setSection(h.key); setMsg(null) }}
                className="text-left bg-vigno-bg2/40 hover:bg-vigno-bg3/40 border border-vigno-line rounded-xl p-4 transition">
                <div className="text-2xl mb-1.5">{h.icon}</div>
                <div className="font-bold text-sm">{h.title}</div>
                <div className="text-xs text-vigno-muted mt-0.5">{h.desc}</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setSection(null)} className="text-sm bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-3 py-1.5">← All settings</button>
            <h3 className="font-bold">{current?.icon} {current?.title}</h3>
          </div>
          {editors[section]}
        </>
      )}

      {/* Save bar (always available) */}
      <div className="flex items-center gap-3 sticky bottom-0 bg-vigno-card/95 backdrop-blur py-3 -mx-5 px-5 border-t border-vigno-line">
        <button onClick={save} disabled={saving || dirty.size === 0} className="bg-vigno-accent text-[#1a0d0f] font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
          {saving ? 'Saving…' : '💾 Save changes'}
        </button>
        <button onClick={reset} disabled={saving} className="bg-white/10 hover:bg-white/20 border border-vigno-line px-4 py-2 rounded-lg text-sm disabled:opacity-50">Reset</button>
        {dirty.size > 0 && <span className="text-xs text-vigno-accent2">● Unsaved changes in: {[...dirty].join(', ')}</span>}
        {msg && <span className={'text-sm ' + (msg.ok ? 'text-green-300' : 'text-red-300')}>{msg.text}</span>}
      </div>
    </div>
  )
}
