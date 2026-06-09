import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CONTENT_TYPES } from '@vigno/shared'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'

const CHILD = { course: 'subject', subject: 'module', module: 'chapter' }
const childKindOf = (node) => (!node ? 'course' : node.kind === 'chapter' ? 'content' : CHILD[node.kind] || null)
const ICON = { pdf: '📄', video: '🎬', game: '🎮', '3d': '✈' }

export default function CmsManager() {
  const qc = useQueryClient()
  const [path, setPath] = useState([]) // [{id,name,kind}]
  const current = path[path.length - 1] || null
  const childKind = childKindOf(current)
  const isContentLevel = childKind === 'content'
  const [err, setErr] = useState('')
  // Inline rename state (instead of a browser prompt popup).
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const key = ['admin', 'children', current?.id || 'root']
  const children = useQuery({
    queryKey: key,
    queryFn: () => {
      if (!current) return adminApi.listNodes({ root: 'true' })
      if (current.kind === 'chapter') return adminApi.listChapterContent(current.id)
      return adminApi.listNodes({ parentId: current.id })
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: key })
  const guard = (fn) => async (...a) => { setErr(''); try { await fn(...a); refresh() } catch (e) { setErr(apiErrorMessage(e)) } }

  // ── create child ──
  const [name, setName] = useState('')
  const [cType, setCType] = useState('pdf')
  const [cPaid, setCPaid] = useState(false)
  const [cPrice, setCPrice] = useState(0)

  const addChild = guard(async () => {
    if (isContentLevel) {
      if (!name.trim()) return
      await adminApi.createContent({ chapterId: current.id, title: name.trim(), type: cType, isPaid: cPaid, price: Number(cPrice) || 0 })
    } else {
      if (!name.trim()) return
      await adminApi.createNode({ kind: childKind, name: name.trim(), parentId: current?.id || null })
      if (childKind === 'course') qc.invalidateQueries({ queryKey: ['classes'] })
    }
    setName(''); setCPaid(false); setCPrice(0)
  })

  const startRename = (node) => { setErr(''); setEditingId(node._id); setEditName(node.name) }
  const cancelRename = () => { setEditingId(null); setEditName('') }
  const saveRename = guard(async () => {
    const n = editName.trim()
    if (!n) return cancelRename()
    await adminApi.updateNode(editingId, { name: n })
    cancelRename()
  })
  const delNode = guard(async (node) => {
    if (window.confirm(`Delete "${node.name}" and everything inside it?`)) await adminApi.deleteNode(node._id)
  })
  const move = guard(async (idx, dir) => {
    const list = children.data
    const j = idx + dir
    if (j < 0 || j >= list.length) return
    const ids = list.map((n) => n._id)
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    await adminApi.reorderNodes(ids)
  })

  const delContent = guard(async (c) => { if (window.confirm(`Delete "${c.title}"?`)) await adminApi.deleteContent(c._id) })
  const togglePublished = guard((c) => adminApi.updateContent(c._id, { published: !c.published }))
  const togglePaid = guard((c) => adminApi.updateContent(c._id, { isPaid: !c.isPaid }))
  const editPrice = guard(async (c) => {
    const p = window.prompt('Price (₹)', c.price)
    if (p != null) await adminApi.updateContent(c._id, { isPaid: Number(p) > 0, price: Number(p) || 0 })
  })
  const upload = guard(async (c, file) => { if (file) await adminApi.uploadContentFile(c._id, file) })

  const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent'

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
        <button onClick={() => setPath([])} className="text-vigno-accent2 hover:underline">Courses</button>
        {path.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1">
            <span className="text-vigno-muted">›</span>
            <button onClick={() => setPath(path.slice(0, i + 1))} className="text-vigno-accent2 hover:underline">{p.name}</button>
          </span>
        ))}
        {current && <span className="text-xs text-vigno-muted ml-2">({current.kind})</span>}
      </div>

      {err && <p className="text-sm text-red-300 mb-3">{err}</p>}

      {/* Add child */}
      {childKind && (
        <div className="bg-black/20 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-vigno-muted">Add {childKind}:</span>
          <input className={input + ' flex-1 min-w-[180px]'} placeholder={isContentLevel ? 'Title' : `${childKind} name`}
            value={name} onChange={(e) => setName(e.target.value)} />
          {isContentLevel && (
            <>
              <select className={input} value={cType} onChange={(e) => setCType(e.target.value)}>
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="text-xs text-vigno-muted flex items-center gap-1">
                <input type="checkbox" checked={cPaid} onChange={(e) => setCPaid(e.target.checked)} /> paid
              </label>
              {cPaid && <input type="number" className={input + ' w-24'} placeholder="₹" value={cPrice} onChange={(e) => setCPrice(e.target.value)} />}
            </>
          )}
          <button onClick={addChild} className="bg-vigno-accent text-[#1a0d0f] font-bold px-3 py-2 rounded-lg text-sm">Add</button>
        </div>
      )}

      {children.isLoading && <p className="text-vigno-muted">Loading…</p>}
      {!children.isLoading && children.data?.length === 0 && <p className="text-vigno-muted text-sm py-2">Empty. Add a {childKind} above.</p>}

      {/* Rows */}
      <ul className="flex flex-col gap-1.5">
        {!isContentLevel && children.data?.map((node, idx) => (
          <li key={node._id} className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 text-sm">
            {editingId === node._id ? (
              <>
                <span>📁</span>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename() }}
                  className={input + ' flex-1 py-1'}
                />
                <button onClick={saveRename} className="text-xs bg-vigno-accent text-[#1a0d0f] font-bold rounded px-2.5 py-1">Save</button>
                <button onClick={cancelRename} className="text-xs bg-white/10 hover:bg-white/20 rounded px-2.5 py-1">Cancel</button>
              </>
            ) : (
              <>
                <button className="flex-1 text-left hover:text-vigno-accent2"
                  onClick={() => setPath([...path, { id: node._id, name: node.name, kind: node.kind }])}>
                  📁 {node.name} <span className="text-xs text-vigno-muted">›</span>
                </button>
                <button title="up" onClick={() => move(idx, -1)} className="text-vigno-muted hover:text-vigno-txt px-1">▲</button>
                <button title="down" onClick={() => move(idx, 1)} className="text-vigno-muted hover:text-vigno-txt px-1">▼</button>
                <button onClick={() => startRename(node)} className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1">Rename</button>
                <button onClick={() => delNode(node)} className="text-xs bg-red-500/70 hover:bg-red-500 text-white rounded px-2 py-1">Delete</button>
              </>
            )}
          </li>
        ))}

        {isContentLevel && children.data?.map((c) => (
          <li key={c._id} className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 text-sm flex-wrap">
            <span className="flex-1 min-w-[160px]">{ICON[c.type] || '📦'} {c.title}
              <span className="text-xs text-vigno-muted ml-2">{c.type} · {c.lane}{c.storageKey ? ' · file ✓' : ''}</span>
            </span>
            <button onClick={() => togglePaid(c)} className={'text-xs rounded px-2 py-1 ' + (c.isPaid ? 'bg-[#ff9d6b]/20 text-[#ff9d6b]' : 'bg-green-500/20 text-green-300')}>
              {c.isPaid ? `₹${c.price}` : 'FREE'}
            </button>
            {c.isPaid && <button onClick={() => editPrice(c)} className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1">Price</button>}
            <button onClick={() => togglePublished(c)} className={'text-xs rounded px-2 py-1 ' + (c.published ? 'bg-white/10' : 'bg-yellow-500/20 text-yellow-200')}>
              {c.published ? 'Published' : 'Hidden'}
            </button>
            <label className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 cursor-pointer">
              Upload<input type="file" className="hidden" onChange={(e) => upload(c, e.target.files?.[0])} />
            </label>
            <button onClick={() => delContent(c)} className="text-xs bg-red-500/70 hover:bg-red-500 text-white rounded px-2 py-1">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
