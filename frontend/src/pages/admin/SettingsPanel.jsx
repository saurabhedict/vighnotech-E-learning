import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../../api/settingsApi'
import { useSiteSettings, SITE_SETTINGS_KEY } from '../../hooks/useSiteSettings'
import { apiErrorMessage } from '../../api/authApi'
import EmojiPicker from '../../components/EmojiPicker'

const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent w-full'
const SOCIALS = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube']
const TYPE_LABEL = { links: '🔗 Links', contact: '📇 Contact', social: '📣 Social', text: '📝 Text', custom: '✨ Custom' }
// Column types the admin can add, with a hint of what each is for.
const SECTION_TYPES = [
  { type: 'links', label: '+ Links', hint: 'Nav / legal / resources' },
  { type: 'contact', label: '+ Contact', hint: 'Phone, email, address, hours' },
  { type: 'social', label: '+ Social', hint: 'Social media icons' },
  { type: 'text', label: '+ Text', hint: 'About / mission blurb' },
  { type: 'custom', label: '+ Custom', hint: 'Anything: emoji + text + link' },
]

function RemoveBtn({ onClick, title = 'Remove' }) {
  return (
    <button onClick={onClick} title={title} className="shrink-0 w-9 h-9 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300">✕</button>
  )
}
function AddRowBtn({ onClick, children }) {
  return <button onClick={onClick} className="text-xs bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-2.5 py-1.5">+ {children}</button>
}

// ── Per-type row editors ─────────────────────────────────────────────────────
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
// Generic rows: emoji + text + optional link — the "anything" builder.
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
            <input className={input} placeholder="Optional link — /route or https://… (leave blank for plain text)" value={it.url || ''} onChange={(e) => upd(i, 'url', e.target.value)} />
          </div>
          <RemoveBtn onClick={() => rm(i)} />
        </div>
      ))}
      <AddRowBtn onClick={() => onChange([...items, { icon: '', text: '', url: '' }])}>Row</AddRowBtn>
    </>
  )
}

// ── One footer column (section) card ─────────────────────────────────────────
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

// Normalize loaded data → editable form.
function toForm(d) {
  const b = d?.brand || {}
  const f = d?.footer || {}
  return {
    brand: { name: b.name || '', tagline: b.tagline || '' },
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
  type,
  title: TITLE_BY_TYPE[type] || 'Quick Links',
  icon: ICON_BY_TYPE[type] || '',
  links: type === 'links' ? [{ label: '', url: '' }] : [],
  phones: [],
  emails: [],
  address: '',
  hours: '',
  items: type === 'social' ? [{ platform: 'facebook', url: '' }] : [],
  body: '',
  rows: type === 'custom' ? [{ icon: '', text: '', url: '' }] : [],
})

export default function SettingsPanel() {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useSiteSettings()
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data && !form) setForm(toForm(data))
  }, [data, form])

  if (isLoading) return <p className="text-vigno-muted">Loading settings…</p>
  if (isError) return <p className="text-red-300">Failed to load settings.</p>
  if (!form) return null

  const setBrand = (k, v) => setForm((s) => ({ ...s, brand: { ...s.brand, [k]: v } }))
  const setFooter = (k, v) => setForm((s) => ({ ...s, footer: { ...s.footer, [k]: v } }))
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
    setSaving(true)
    setMsg(null)
    try {
      const saved = await settingsApi.update(form)
      qc.setQueryData(SITE_SETTINGS_KEY, saved)
      setForm(toForm(saved))
      setMsg({ ok: true, text: 'Saved — changes are live across the site.' })
    } catch (e) {
      setMsg({ ok: false, text: apiErrorMessage(e, 'Save failed') })
    } finally {
      setSaving(false)
    }
  }
  const reset = () => setForm(toForm(data))

  return (
    <div className="space-y-5">
      <p className="text-xs text-vigno-muted">
        The footer is fully modular — add columns of any type, give each an emoji icon + name, add rows, and reorder freely.
        Use <code>/route</code> for internal pages (e.g. <code>/app/library</code>) and full <code>https://…</code> URLs for external links.
        Tip: for an icon not in the palette, paste any emoji (Windows: <code>Win</code> + <code>.</code> / Mac: <code>Cmd</code>+<code>Ctrl</code>+<code>Space</code>).
      </p>

      {/* Brand */}
      <div className="bg-vigno-bg2/40 border border-vigno-line rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-bold">Branding</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-vigno-muted">Brand name (navbar + footer)</label>
            <input className={input} value={form.brand.name} onChange={(e) => setBrand('name', e.target.value)} placeholder="AeroLearn" />
          </div>
          <div>
            <label className="text-xs text-vigno-muted">Tagline</label>
            <input className={input} value={form.brand.tagline} onChange={(e) => setBrand('tagline', e.target.value)} placeholder="Aviation Training Platform" />
          </div>
        </div>
        <div>
          <label className="text-xs text-vigno-muted">Footer blurb</label>
          <textarea className={input + ' h-20 resize-none'} value={form.footer.blurb} onChange={(e) => setFooter('blurb', e.target.value)} placeholder="Practice mock tests for competitive exams…" />
        </div>
      </div>

      {/* Sections */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold">Footer columns</h3>
        <div className="flex gap-2 flex-wrap">
          {SECTION_TYPES.map((t) => (
            <button key={t.type} onClick={() => addSection(t.type)} title={t.hint}
              className="text-xs bg-vigno-accent/90 text-[#1a0d0f] font-bold rounded-lg px-2.5 py-1.5">{t.label}</button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {sections.map((s, i) => (
          <SectionCard key={i} section={s} index={i} count={sections.length} onChange={(next) => updateSection(i, next)} onMove={moveSection} onRemove={removeSection} />
        ))}
      </div>
      {sections.length === 0 && <p className="text-xs text-vigno-muted">No columns. Add one above.</p>}

      {/* Copyright */}
      <div className="bg-vigno-bg2/40 border border-vigno-line rounded-xl p-4">
        <label className="text-xs text-vigno-muted">Copyright line — use {'{year}'} for the current year</label>
        <input className={input + ' mt-1'} value={form.footer.copyright} onChange={(e) => setFooter('copyright', e.target.value)} placeholder="© {year} AeroLearn. All rights reserved." />
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3 sticky bottom-0 bg-vigno-card/95 backdrop-blur py-3 -mx-5 px-5 border-t border-vigno-line">
        <button onClick={save} disabled={saving} className="bg-vigno-accent text-[#1a0d0f] font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
          {saving ? 'Saving…' : '💾 Save changes'}
        </button>
        <button onClick={reset} disabled={saving} className="bg-white/10 hover:bg-white/20 border border-vigno-line px-4 py-2 rounded-lg text-sm disabled:opacity-50">Reset</button>
        {msg && <span className={'text-sm ' + (msg.ok ? 'text-green-300' : 'text-red-300')}>{msg.text}</span>}
      </div>
    </div>
  )
}
