import { useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setUser } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'
import Avatar from './Avatar'
import AvatarEditorModal from './AvatarEditorModal'

/**
 * Avatar with a camera button → "Upload Photo / Remove Photo" menu and the
 * "Adjust Your Photo" editor. Uploads the cropped image and updates Redux.
 */
export default function AvatarUploader({ size = 76, verified = false }) {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const fileRef = useRef(null)
  const [menu, setMenu] = useState(false)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const pick = (e) => {
    const f = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (f) { setFile(f); setMenu(false) }
  }

  const apply = async (dataUrl) => {
    setBusy(true); setErr('')
    try {
      const r = await authApi.uploadAvatar(dataUrl)
      dispatch(setUser(r.user))
      setFile(null)
    } catch (e) {
      setErr(apiErrorMessage(e, 'Upload failed'))
    } finally { setBusy(false) }
  }

  const remove = async () => {
    setMenu(false); setBusy(true); setErr('')
    try {
      const r = await authApi.removeAvatar()
      dispatch(setUser(r.user))
    } catch (e) {
      setErr(apiErrorMessage(e, 'Could not remove photo'))
    } finally { setBusy(false) }
  }

  return (
    <div className="relative inline-block">
      <Avatar user={user} size={size} />

      {verified && (
        <span title="Verified" className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#1da1f2] text-white grid place-items-center ring-2 ring-vigno-panel shadow">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
      )}

      <button onClick={() => setMenu((m) => !m)} title="Change photo" disabled={busy}
        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-vigno-accent2 text-white grid place-items-center shadow-md ring-2 ring-vigno-card hover:bg-[#3a92ec] transition-colors disabled:opacity-60">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute z-20 left-0 top-full mt-2 w-48 bg-vigno-panel border border-vigno-line rounded-xl shadow-2xl py-1.5 text-sm overflow-hidden">
            <button onClick={() => fileRef.current?.click()}
              className="w-full text-left px-3 py-2.5 hover:bg-vigno-accent/15 hover:text-vigno-accent2 flex items-center gap-2.5 transition-colors">
              <svg className="w-4 h-4 text-vigno-muted/65" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <span>Upload Photo</span>
            </button>
            <button onClick={remove} disabled={!user?.avatar}
              className="w-full text-left px-3 py-2.5 hover:bg-red-500/15 text-red-300 flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:hover:bg-transparent">
              ✕ Remove Photo
            </button>
          </div>
        </>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      {err && <p className="text-xs text-red-300 mt-1 absolute top-full left-0 w-48">{err}</p>}
      {file && <AvatarEditorModal file={file} onCancel={() => setFile(null)} onApply={apply} />}
    </div>
  )
}
