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
        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-vigno-accent text-[#1a0d0f] grid place-items-center text-sm shadow-lg hover:brightness-110 disabled:opacity-60">
        📷
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute z-20 left-0 top-full mt-2 w-44 bg-vigno-panel border border-vigno-line rounded-xl shadow-2xl py-1 text-sm">
            <button onClick={() => fileRef.current?.click()}
              className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2">📷 Upload Photo</button>
            {user?.avatar && (
              <button onClick={remove}
                className="w-full text-left px-3 py-2 hover:bg-white/10 text-red-300 flex items-center gap-2">✕ Remove Photo</button>
            )}
          </div>
        </>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      {err && <p className="text-xs text-red-300 mt-1 absolute top-full left-0 w-48">{err}</p>}
      {file && <AvatarEditorModal file={file} onCancel={() => setFile(null)} onApply={apply} />}
    </div>
  )
}
