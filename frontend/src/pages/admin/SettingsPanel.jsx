import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../../api/settingsApi'
import { useSiteSettings, SITE_SETTINGS_KEY } from '../../hooks/useSiteSettings'
import { apiErrorMessage } from '../../api/authApi'

const input =
  'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent w-full'
const SOCIALS = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube']

// ── Reusable row editors ─────────────────────────────────────────────────────
function Section({ title, hint, children, onAdd, addLabel }) {
  return (
    <div className="bg-vigno-bg2/40 border border-vigno-line rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          {hint && <p className="text-xs text-vigno-muted mt-0.5">{hint}</p>}
        </div>
        {onAdd && (
          <button onClick={onAdd} className="text-xs bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-2.5 py-1.5">
            + {addLabel}
          </button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function RemoveBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Remove" className="shrink-0 w-9 h-9 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300">
      ✕
    </button>
  )
}

function LinkRows({ items, onChange, labelPh = 'Label', valuePh = 'URL or /route' }) {
  const update = (i, k, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  return items.map((it, i) => (
    <div key={i} className="flex gap-2">
      <input className={input + ' max-w-[40%]'} placeholder={labelPh} value={it.label || ''} onChange={(e) => update(i, 'label', e.target.value)} />
      <input className={input} placeholder={valuePh} value={it.url || ''} onChange={(e) => update(i, 'url', e.target.value)} />
      <RemoveBtn onClick={() => remove(i)} />
    </div>
  ))
}

function StringRows({ items, onChange, placeholder }) {
  const update = (i, v) => onChange(items.map((it, idx) => (idx === i ? v : it)))
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  return items.map((it, i) => (
    <div key={i} className="flex gap-2">
      <input className={input} placeholder={placeholder} value={it || ''} onChange={(e) => update(i, e.target.value)} />
      <RemoveBtn onClick={() => remove(i)} />
    </div>
  ))
}

function SocialRows({ items, onChange }) {
  const update = (i, k, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  return items.map((it, i) => (
    <div key={i} className="flex gap-2">
      <select className={input + ' max-w-[40%]'} value={it.platform || 'facebook'} onChange={(e) => update(i, 'platform', e.target.value)}>
        {SOCIALS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input className={input} placeholder="https://…" value={it.url || ''} onChange={(e) => update(i, 'url', e.target.value)} />
      <RemoveBtn onClick={() => remove(i)} />
    </div>
  ))
}

// Normalize loaded data → editable form (strip mongoose _id from sub-docs).
function toForm(d) {
  const b = d?.brand || {}
  const f = d?.footer || {}
  const links = (arr) => (arr || []).map((x) => ({ label: x.label || '', url: x.url || '' }))
  return {
    brand: { name: b.name || '', tagline: b.tagline || '' },
    footer: {
      blurb: f.blurb || '',
      quickLinks: links(f.quickLinks),
      services: links(f.services),
      phones: [...(f.phones || [])],
      emails: [...(f.emails || [])],
      socials: (f.socials || []).map((s) => ({ platform: s.platform || 'facebook', url: s.url || '' })),
      copyright: f.copyright || '',
    },
  }
}

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
        Everything here drives the site footer and brand name — no code changes needed. Use <code>/route</code> for internal pages
        (e.g. <code>/app/library</code>) and full <code>https://…</code> URLs for external links.
      </p>

      {/* Brand */}
      <Section title="Branding" hint="Shown in the top navbar and footer.">
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-vigno-muted">Brand name</label>
            <input className={input} value={form.brand.name} onChange={(e) => setBrand('name', e.target.value)} placeholder="AeroLearn" />
          </div>
          <div>
            <label className="text-xs text-vigno-muted">Tagline</label>
            <input className={input} value={form.brand.tagline} onChange={(e) => setBrand('tagline', e.target.value)} placeholder="Aviation Training Platform" />
          </div>
        </div>
        <div>
          <label className="text-xs text-vigno-muted">Footer blurb</label>
          <textarea className={input + ' h-20 resize-none'} value={form.footer.blurb} onChange={(e) => setFooter('blurb', e.target.value)}
            placeholder="Practice mock tests for competitive exams…" />
        </div>
      </Section>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Quick Links" hint="Footer link column." addLabel="Link"
          onAdd={() => setFooter('quickLinks', [...form.footer.quickLinks, { label: '', url: '' }])}>
          <LinkRows items={form.footer.quickLinks} onChange={(v) => setFooter('quickLinks', v)} />
          {form.footer.quickLinks.length === 0 && <p className="text-xs text-vigno-muted">No links yet.</p>}
        </Section>

        <Section title="Services" hint="Footer link column." addLabel="Link"
          onAdd={() => setFooter('services', [...form.footer.services, { label: '', url: '' }])}>
          <LinkRows items={form.footer.services} onChange={(v) => setFooter('services', v)} />
          {form.footer.services.length === 0 && <p className="text-xs text-vigno-muted">No links yet.</p>}
        </Section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Phone numbers" hint="Shown under Contact." addLabel="Phone"
          onAdd={() => setFooter('phones', [...form.footer.phones, ''])}>
          <StringRows items={form.footer.phones} onChange={(v) => setFooter('phones', v)} placeholder="+91 77200 25900" />
          {form.footer.phones.length === 0 && <p className="text-xs text-vigno-muted">No phone numbers yet.</p>}
        </Section>

        <Section title="Email addresses" hint="Shown under Contact." addLabel="Email"
          onAdd={() => setFooter('emails', [...form.footer.emails, ''])}>
          <StringRows items={form.footer.emails} onChange={(v) => setFooter('emails', v)} placeholder="contact@example.org" />
          {form.footer.emails.length === 0 && <p className="text-xs text-vigno-muted">No emails yet.</p>}
        </Section>
      </div>

      <Section title="Social media" hint="Follow Us icons in the footer." addLabel="Social"
        onAdd={() => setFooter('socials', [...form.footer.socials, { platform: 'facebook', url: '' }])}>
        <SocialRows items={form.footer.socials} onChange={(v) => setFooter('socials', v)} />
        {form.footer.socials.length === 0 && <p className="text-xs text-vigno-muted">No social links yet.</p>}
      </Section>

      <Section title="Copyright line" hint="Use {year} for the current year.">
        <input className={input} value={form.footer.copyright} onChange={(e) => setFooter('copyright', e.target.value)}
          placeholder="© {year} AeroLearn. All rights reserved." />
      </Section>

      {/* Save bar */}
      <div className="flex items-center gap-3 sticky bottom-0 bg-vigno-card/95 backdrop-blur py-3 -mx-5 px-5 border-t border-vigno-line">
        <button onClick={save} disabled={saving} className="bg-vigno-accent text-[#1a0d0f] font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
          {saving ? 'Saving…' : '💾 Save changes'}
        </button>
        <button onClick={reset} disabled={saving} className="bg-white/10 hover:bg-white/20 border border-vigno-line px-4 py-2 rounded-lg text-sm disabled:opacity-50">
          Reset
        </button>
        {msg && <span className={'text-sm ' + (msg.ok ? 'text-green-300' : 'text-red-300')}>{msg.text}</span>}
      </div>
    </div>
  )
}
