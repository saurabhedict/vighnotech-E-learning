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
export default function AvatarUploader({ size = 76 }) {
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

      <button onClick={() => setMenu((m) => !m)} title="Change photo" disabled={busy}
        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-vigno-accent text-white grid place-items-center text-sm shadow-lg ring-2 ring-vigno-panel hover:brightness-110 disabled:opacity-60">
        📷
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute z-20 left-0 top-full mt-2 w-48 bg-vigno-panel border border-vigno-line rounded-xl shadow-2xl py-1.5 text-sm overflow-hidden">
            <button onClick={() => fileRef.current?.click()}
              className="w-full text-left px-3 py-2.5 hover:bg-vigno-accent/15 hover:text-vigno-accent2 flex items-center gap-2.5 transition-colors">
              📷 Upload Photo
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
