import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setUser } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'

const CHANNELS = [
  { key: 'email', label: '✉ Email', hint: 'Code to your email address' },
  { key: 'sms', label: '💬 SMS', hint: 'Text message to your phone' },
  { key: 'whatsapp', label: '🟢 WhatsApp', hint: 'Message on WhatsApp' },
]

const input = 'w-full mb-3 px-3 py-2.5 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent'
const btn = 'bg-vigno-accent text-[#1a0d0f] font-bold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-60'

/**
 * Multi-channel account verification: pick Email / SMS / WhatsApp, get an OTP,
 * verify it. Used both in the signup flow and on the Profile page.
 * Props: defaultPhone, onVerified().
 */
export default function VerifyContact({ defaultPhone = '', onVerified }) {
  const dispatch = useDispatch()
  const [channel, setChannel] = useState('email')
  const [phone, setPhone] = useState(defaultPhone)
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const needsPhone = channel === 'sms' || channel === 'whatsapp'

  const send = async () => {
    setMsg(null)
    if (needsPhone && !phone.trim()) return setMsg({ ok: false, text: 'Enter your phone number (with country code, e.g. +91…)' })
    setLoading(true)
    try {
      const r = await authApi.sendVerification(channel, needsPhone ? phone.trim() : undefined)
      if (r.alreadyVerified) { setMsg({ ok: true, text: 'Already verified ✓' }); onVerified?.(); return }
      setSent(true)
      setSentTo(r.sentTo || '')
      setMsg({ ok: true, text: `Code sent via ${channel}${r.sentTo ? ` to ${r.sentTo}` : ''}. (In dev it's printed in the backend console.)` })
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, 'Could not send code') })
    } finally { setLoading(false) }
  }

  const verify = async (e) => {
    e?.preventDefault()
    setMsg(null); setLoading(true)
    try {
      const r = await authApi.verifyEmail(code.trim())
      dispatch(setUser(r.user))
      setMsg({ ok: true, text: 'Verified! ✓' })
      onVerified?.(r.user)
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, 'Verification failed') })
    } finally { setLoading(false) }
  }

  return (
    <div>
      {msg && (
        <div className={'mb-3 text-sm rounded-lg px-3 py-2 border ' +
          (msg.ok ? 'bg-green-500/15 border-green-500/40 text-green-200' : 'bg-red-500/15 border-red-500/40 text-red-200')}>
          {msg.text}
        </div>
      )}

      <p className="text-sm text-vigno-muted mb-2 text-center">How would you like to receive your verification code?</p>
      <div className="flex flex-wrap gap-2 mb-3 justify-center">
        {CHANNELS.map((c) => (
          <button key={c.key} type="button" onClick={() => { setChannel(c.key); setSent(false); setMsg(null) }}
            className={'px-3 py-1.5 rounded-lg text-sm border ' +
              (channel === c.key ? 'bg-vigno-accent text-[#1a0d0f] font-bold border-vigno-accent' : 'bg-white/10 border-vigno-line hover:bg-white/20')}>
            {c.label}
          </button>
        ))}
      </div>

      {needsPhone && (
        <>
          <label className="text-xs text-vigno-muted block mb-1.5">Phone (with country code)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={input} />
        </>
      )}

      {!sent ? (
        <button type="button" onClick={send} disabled={loading} className={btn + ' w-full'}>
          {loading ? 'Sending…' : 'Send code'}
        </button>
      ) : (
        <form onSubmit={verify} className="flex gap-2 items-start justify-center">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456"
            className={input + ' max-w-[160px] tracking-widest'} />
          <button disabled={loading} className={btn}>{loading ? 'Verifying…' : 'Verify'}</button>
          <button type="button" onClick={send} disabled={loading} className="text-xs text-vigno-muted hover:text-vigno-txt px-2 py-2">Resend</button>
        </form>
      )}
    </div>
  )
}
