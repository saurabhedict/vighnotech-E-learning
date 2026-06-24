import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CONTENT_TYPES } from '@vigno/shared'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'
import { subscribeUploads, startUpload } from '../../lib/uploadManager'



// ── SVG Components (Formal / Clean) ──────────────────────────────────────────
function CourseIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function LessonIcon({ type, className = "w-4 h-4" }) {
  if (type === 'video') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      </svg>
    )
  }
  if (type === 'pdf') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
  if (type === '3d') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  }
  // Fallback (Interactive game or standard resource)
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  )
}

function ChevronIcon({ expanded, className = "w-3.5 h-3.5" }) {
  return (
    <svg className={`${className} transform transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ArrowUpIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7-7 7 7" />
    </svg>
  )
}

function ArrowDownIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7 7-7-7" />
    </svg>
  )
}

function TrashIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function EditIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function CheckIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

// ── Course Selector Grid ──────────────────────────────────────────────────────
function CourseList({ onSelect, isDark }) {
  const qc = useQueryClient()
  const { data: courses, isLoading, isError } = useQuery({
    queryKey: ['admin', 'nodes', 'courses'],
    queryFn: () => adminApi.listNodes({ root: 'true' }),
  })
  const [newCourseName, setNewCourseName] = useState('')
  const [newInstructor, setNewInstructor] = useState('')
  const [newTags, setNewTags] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const handleAddCourse = async (e) => {
    e.preventDefault()
    if (!newCourseName.trim()) return
    setAdding(true)
    setError('')
    const tagsArr = newTags.split(',').map(t => t.trim()).filter(Boolean)
    try {
      await adminApi.createNode({
        kind: 'course',
        name: newCourseName.trim(),
        parentId: null,
        meta: {
          instructor: newInstructor.trim(),
          tags: tagsArr,
        }
      })
      setNewCourseName('')
      setNewInstructor('')
      setNewTags('')
      qc.invalidateQueries({ queryKey: ['admin', 'nodes', 'courses'] })
      qc.invalidateQueries({ queryKey: ['classes'] })
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create course'))
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteCourse = async (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to delete "${name}"? This will delete all subjects, modules, chapters, and files inside it!`)) return
    try {
      await adminApi.deleteNode(id)
      qc.invalidateQueries({ queryKey: ['admin', 'nodes', 'courses'] })
      qc.invalidateQueries({ queryKey: ['classes'] })
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to delete course'))
    }
  }

  if (isLoading) return <p className="text-vigno-muted text-sm py-4">Loading courses…</p>
  if (isError) return <p className="text-red-300 text-sm py-4">Failed to load courses.</p>

  return (
    <div className="space-y-6">
      {/* Add Course bar */}
      <div className="bg-vigno-card border border-vigno-line/50 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-extrabold text-vigno-accent uppercase tracking-widest mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-vigno-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create New Course
        </h3>
        <form onSubmit={handleAddCourse} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-vigno-muted uppercase tracking-wider">Course Title</label>
            <input
              type="text"
              placeholder="e.g. Navigation Ground"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-vigno-bg2/60 border border-vigno-line/60 text-sm text-vigno-txt outline-none transition-all w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-vigno-muted uppercase tracking-wider">Instructor</label>
            <input
              type="text"
              placeholder="e.g. AeroLearn Expert"
              value={newInstructor}
              onChange={(e) => setNewInstructor(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-vigno-bg2/60 border border-vigno-line/60 text-sm text-vigno-txt outline-none transition-all w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-vigno-muted uppercase tracking-wider">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Flight, Ground"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-vigno-bg2/60 border border-vigno-line/60 text-sm text-vigno-txt outline-none transition-all w-full"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="h-[42px] bg-vigno-accent hover:brightness-105 active:scale-[0.98] text-vigno-bg1 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 w-full shadow-md disabled:opacity-50"
          >
            {adding ? (
              <span>Creating…</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Add Course</span>
              </>
            )}
          </button>
        </form>
      </div>

      {error && <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

      {courses?.length === 0 ? (
        <div className="text-center py-12 text-vigno-muted bg-vigno-card border border-vigno-line/40 rounded-2xl">
          <p className="text-sm">No courses found. Add a course above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses?.map((course) => (
            <div
              key={course._id}
              className="bg-vigno-card border border-vigno-line/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-vigno-accent/40 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-vigno-accent/10 flex items-center justify-center text-vigno-accent border border-vigno-accent/20 transition-colors group-hover:bg-vigno-accent/15">
                    <CourseIcon className="w-3.5 h-3.5" />
                  </div>
                  <button
                    onClick={() => handleDeleteCourse(course._id, course.name)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95 transition-all"
                    title="Delete Course"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-vigno-txt leading-snug group-hover:text-vigno-accent transition-colors truncate" title={course.name}>
                    {course.name}
                  </h3>
                  {course.meta?.instructor ? (
                    <div className="flex items-center gap-1.5 text-xs text-vigno-muted">
                      <svg className="w-3.5 h-3.5 shrink-0 text-vigno-muted/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <span className="truncate">By {course.meta.instructor}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-vigno-muted">
                      <svg className="w-3.5 h-3.5 shrink-0 text-vigno-muted/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <span className="truncate">AeroLearn Expert</span>
                    </div>
                  )}
                </div>

                {course.meta?.tags && course.meta.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {course.meta.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md uppercase border border-vigno-line/40 text-vigno-muted bg-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-vigno-line/20">
                <button
                  onClick={() => onSelect(course)}
                  className="w-full flex items-center justify-center gap-1.5 text-center text-xs font-extrabold bg-vigno-accent text-vigno-accent-txt rounded-xl py-2.5 hover:brightness-105 active:scale-[0.98] transition-all shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                  Edit Curriculum
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chapter Lessons Manager ──────────────────────────────────────────────────
function LessonsList({ chapterId, isDark }) {
  const qc = useQueryClient()
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['admin', 'chapter', chapterId, 'content'],
    queryFn: () => adminApi.listChapterContent(chapterId),
  })

  const [title, setTitle] = useState('')
  const [type, setType] = useState('video')
  const [adding, setAdding] = useState(false)
  const [metaOpenId, setMetaOpenId] = useState(null)
  const [uploads, setUploads] = useState({})

  useEffect(() => subscribeUploads(setUploads), [])

  const handleAddLesson = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setAdding(true)
    try {
      await adminApi.createContent({
        chapterId,
        title: title.trim(),
        type,
        isPaid: true,
        price: 0,
      })
      setTitle('')
      qc.invalidateQueries({ queryKey: ['admin', 'chapter', chapterId, 'content'] })
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to add lesson'))
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteLesson = async (id, name) => {
    if (!window.confirm(`Delete lesson "${name}"?`)) return
    try {
      await adminApi.deleteContent(id)
      qc.invalidateQueries({ queryKey: ['admin', 'chapter', chapterId, 'content'] })
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const togglePublished = async (id, currentVal) => {
    try {
      await adminApi.updateContent(id, { published: !currentVal })
      qc.invalidateQueries({ queryKey: ['admin', 'chapter', chapterId, 'content'] })
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const handleUpload = (lesson, file) => {
    if (!file) return
    startUpload(lesson, file)
  }

  const move = async (idx, dir) => {
    if (!lessons) return
    const targetIdx = idx + dir
    if (targetIdx < 0 || targetIdx >= lessons.length) return
    const ids = lessons.map(l => l._id)
    ;[ids[idx], ids[targetIdx]] = [ids[targetIdx], ids[idx]]
    try {
      await adminApi.reorderNodes(ids) // Reorder contents
      qc.invalidateQueries({ queryKey: ['admin', 'chapter', chapterId, 'content'] })
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const saveMeta = async (id, data) => {
    try {
      await adminApi.updateContent(id, data)
      qc.invalidateQueries({ queryKey: ['admin', 'chapter', chapterId, 'content'] })
      setMetaOpenId(null)
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  return (
    <div className="mt-3 pl-8 border-l border-vigno-line/20 space-y-3">
      {isLoading ? (
        <p className="text-[11px] text-vigno-muted">Loading lessons…</p>
      ) : (
        <div className="space-y-2">
          {lessons?.length === 0 && <p className="text-[11px] text-vigno-muted/60">No lessons inside this chapter yet.</p>}
          {lessons?.map((lesson, idx) => {
            const up = uploads[lesson._id]
            const isEditingMeta = metaOpenId === lesson._id
            return (
              <div key={lesson._id} className="bg-black/10 border border-vigno-line/30 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[150px]">
                    <span className="text-vigno-accent2 shrink-0">
                      <LessonIcon type={lesson.type} className="w-4 h-4" />
                    </span>
                    <span
                      onClick={() => window.open(`/app/content/${lesson._id}`, '_blank')}
                      className="font-bold text-vigno-txt hover:text-vigno-accent hover:underline cursor-pointer transition-colors"
                      title="Click to preview content in new tab"
                    >
                      {lesson.title}
                    </span>
                    <span className="text-[10px] text-vigno-muted capitalize font-mono shrink-0">({lesson.type})</span>
                  </div>

                  <div className="flex items-center gap-3.5 flex-wrap">
                    {/* Move controls */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-vigno-muted hover:text-vigno-txt disabled:opacity-30 p-1" title="Move Up">
                        <ArrowUpIcon className="w-3 h-3" />
                      </button>
                      <button onClick={() => move(idx, 1)} disabled={idx === lessons.length - 1} className="text-vigno-muted hover:text-vigno-txt disabled:opacity-30 p-1" title="Move Down">
                        <ArrowDownIcon className="w-3 h-3" />
                      </button>
                    </div>



                    {/* Published status */}
                    <button
                      onClick={() => togglePublished(lesson._id, lesson.published)}
                      className={`px-2 py-0.5 rounded font-semibold ${lesson.published ? 'bg-white/10 text-vigno-txt border border-vigno-line/50' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}
                    >
                      {lesson.published ? 'Live' : 'Draft'}
                    </button>

                    {/* Hover Card Meta */}
                    <button
                      onClick={() => setMetaOpenId(isEditingMeta ? null : lesson._id)}
                      className={`px-2 py-0.5 rounded font-semibold border ${isEditingMeta ? 'bg-vigno-accent/20 border-vigno-accent text-vigno-accent' : 'bg-white/5 border-vigno-line/40 text-vigno-muted hover:text-vigno-txt'}`}
                    >
                      Details
                    </button>

                    {/* File Upload / Status */}
                    {up ? (
                      <span className="text-[10px] text-vigno-accent font-bold">
                        {up.status === 'uploading' ? `Uploading ${up.pct}%` : up.status === 'done' ? '✓ Uploaded' : 'Failed'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {lesson.storageKey && (
                          <span className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/25 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <span className="text-xs">✓</span> File uploaded
                          </span>
                        )}
                        <label className="bg-vigno-accent/10 hover:bg-vigno-accent/25 border border-vigno-accent/30 text-vigno-accent text-[10px] font-extrabold px-2 py-1 rounded cursor-pointer transition-all">
                          {lesson.storageKey ? 'Edit file' : 'Upload file'}
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleUpload(lesson, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteLesson(lesson._id, lesson.title)}
                      className="text-red-400 hover:text-red-350 p-1 transition-colors"
                      title="Delete Lesson"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Details Editor */}
                {isEditingMeta && (
                  <LessonDetailsEditor lesson={lesson} onSave={(data) => saveMeta(lesson._id, data)} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Lesson Form */}
      <form onSubmit={handleAddLesson} className="flex gap-2 flex-wrap items-center bg-black/10 p-2.5 rounded-xl border border-vigno-line/30">
        <input
          type="text"
          placeholder="New Lesson Title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 min-w-[150px] px-2 py-1 rounded-md bg-vigno-bg2 border border-vigno-line/50 text-xs text-vigno-txt outline-none"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-2 py-1 rounded-md bg-vigno-bg2 border border-vigno-line/50 text-xs outline-none"
        >
          <option value="video">Video</option>
          <option value="pdf">PDF</option>
          <option value="3d">3D Model</option>
          <option value="game">Interactive Game</option>
        </select>
        <button
          type="submit"
          disabled={adding}
          className="bg-vigno-accent text-vigno-bg1 font-extrabold px-3 py-1 rounded-md text-xs hover:brightness-110"
        >
          Add Lesson
        </button>
      </form>
    </div>
  )
}

// ── Lesson Details Editor ────────────────────────────────────────────────────
function LessonDetailsEditor({ lesson, onSave }) {
  const [desc, setDesc] = useState(lesson.description || '')
  const [previewText, setPreviewText] = useState(lesson.previewText || '')
  const [thumb, setThumb] = useState(lesson.thumbnailUrl || '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleUploadFile = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const r = await adminApi.uploadContentThumbnail(lesson._id, file)
      setThumb(r.thumbnail)
    } catch (err) {
      setUploadError('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-black/20 p-3 rounded-lg border border-vigno-line/40 text-xs space-y-3">
      <h4 className="font-bold uppercase tracking-wider text-[10px] text-vigno-accent">Lesson Meta Settings</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-vigno-muted block font-semibold text-[10px]">Description</label>
          <textarea
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Full description shown on content view page…"
            className="w-full px-2 py-1 rounded-md bg-vigno-bg2 border border-vigno-line/50 outline-none resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-vigno-muted block font-semibold text-[10px]">Hover Card Preview text</label>
          <textarea
            rows={3}
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Short 2-line summary shown on catalogue hover…"
            className="w-full px-2 py-1 rounded-md bg-vigno-bg2 border border-vigno-line/50 outline-none resize-none"
          />
        </div>
      </div>

      <div className="space-y-2 bg-black/10 border border-vigno-line/45 rounded-xl p-3">
        <label className="text-[10px] text-vigno-muted font-bold block">Lesson Thumbnail</label>
        {thumb && (
          <div className="w-28 aspect-video rounded-lg overflow-hidden border border-vigno-line/60 bg-slate-900 relative">
            <img src={thumb} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setThumb('')}
              className="absolute top-1 right-1 w-4 h-4 bg-black/70 hover:bg-black text-red-400 rounded-full flex items-center justify-center text-[10px] font-bold"
              title="Remove Thumbnail"
            >
              ×
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] text-vigno-muted font-semibold block">Upload Image File</label>
            <label className="inline-block bg-vigno-accent hover:brightness-110 text-vigno-bg1 font-bold text-[10px] px-3.5 py-2 rounded-lg cursor-pointer transition-all">
              {uploading ? 'Uploading…' : 'Choose Local File'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadFile(e.target.files?.[0])}
                disabled={uploading}
              />
            </label>
            {uploadError && <p className="text-[9px] text-red-300 mt-1">{uploadError}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] text-vigno-muted font-semibold block">Or Paste Image URL</label>
            <input
              type="text"
              value={thumb}
              onChange={(e) => setThumb(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full px-2 py-1 rounded-md bg-vigno-bg2 border border-vigno-line/50 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={() => onSave({ description: desc, previewText, thumbnailUrl: thumb })}
          className="bg-vigno-accent text-vigno-bg1 font-extrabold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5"
        >
          <CheckIcon className="w-3.5 h-3.5" />
          Save Details
        </button>
      </div>
    </div>
  )
}

// ── Recursive Syllabus Nodes ──────────────────────────────────────────────────
function SyllabusNode({ node, depth, onNodeModified, isDark }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(node.name)
  const [newChildName, setNewChildName] = useState('')
  const [addingChild, setAddingChild] = useState(false)

  const childKind = node.kind === 'course' ? 'subject' : node.kind === 'subject' ? 'module' : node.kind === 'module' ? 'chapter' : 'content'

  const { data: children, isLoading } = useQuery({
    queryKey: ['admin', 'node', node._id, 'children'],
    queryFn: () => adminApi.listNodes({ parentId: node._id }),
    enabled: expanded && childKind !== 'content',
  })

  const handleRename = async (e) => {
    e.preventDefault()
    if (!newName.trim() || newName.trim() === node.name) return setRenaming(false)
    try {
      await adminApi.updateNode(node._id, { name: newName.trim() })
      node.name = newName.trim()
      setRenaming(false)
      onNodeModified?.()
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete this ${node.kind} "${node.name}" and all children inside?`)) return
    try {
      await adminApi.deleteNode(node._id)
      onNodeModified?.()
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const handleAddChild = async (e) => {
    e.preventDefault()
    if (!newChildName.trim()) return
    try {
      await adminApi.createNode({
        kind: childKind,
        name: newChildName.trim(),
        parentId: node._id,
      })
      setNewChildName('')
      setAddingChild(false)
      setExpanded(true)
      qc.invalidateQueries({ queryKey: ['admin', 'node', node._id, 'children'] })
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const moveNode = async (dir) => {
    try {
      const siblings = await adminApi.listNodes({ parentId: node.parentId })
      const idx = siblings.findIndex(s => s._id === node._id)
      const targetIdx = idx + dir
      if (targetIdx < 0 || targetIdx >= siblings.length) return
      const ids = siblings.map(s => s._id)
      ;[ids[idx], ids[targetIdx]] = [ids[targetIdx], ids[idx]]
      await adminApi.reorderNodes(ids)
      onNodeModified?.()
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const styles = {
    subject: {
      bg: isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-vigno-line shadow-sm',
      title: 'text-sm font-black text-vigno-txt',
      badge: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25',
    },
    module: {
      bg: isDark ? 'bg-slate-800/40 border-slate-700/40' : 'bg-slate-50 border-vigno-line/70',
      title: 'text-xs font-extrabold text-vigno-txt',
      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    },
    chapter: {
      bg: isDark ? 'bg-black/10 border-vigno-line/30' : 'bg-white border border-vigno-line/60',
      title: 'text-xs font-bold text-vigno-txt',
      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
  }[node.kind] || { bg: 'bg-white/5 border-vigno-line/40', title: 'text-xs', badge: 'bg-white/10' }

  return (
    <div className={`border rounded-xl p-3.5 space-y-3 ${styles.bg}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {/* Collapse/Expand Toggle (Always render for folders & chapters) */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center transition-all text-vigno-muted hover:text-vigno-txt"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <ChevronIcon expanded={expanded} className="w-3.5 h-3.5" />
          </button>

          {renaming ? (
            <form onSubmit={handleRename} className="flex gap-2 flex-1 max-w-sm">
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-2 py-0.5 rounded bg-vigno-bg2 border border-vigno-line/60 text-xs outline-none text-vigno-txt"
              />
              <button type="submit" className="text-[10px] bg-vigno-accent text-vigno-bg1 font-bold px-2 rounded">Save</button>
              <button type="button" onClick={() => setRenaming(false)} className="text-[10px] text-vigno-muted hover:underline">Cancel</button>
            </form>
          ) : (
            <span className={`capitalize select-none leading-snug ${styles.title}`}>
              {node.name}
            </span>
          )}

          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${styles.badge}`}>
            {node.kind}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <button onClick={() => moveNode(-1)} className="text-vigno-muted hover:text-vigno-txt p-1" title="Move Up">
            <ArrowUpIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => moveNode(1)} className="text-vigno-muted hover:text-vigno-txt p-1" title="Move Down">
            <ArrowDownIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setRenaming(true)} className="text-vigno-muted hover:text-vigno-txt p-1" title="Rename">
            <EditIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} className="text-red-400 hover:text-red-300 p-1" title="Delete">
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Accordion Children */}
      {expanded && childKind !== 'content' && (
        <div className="pl-6 border-l border-vigno-line/20 space-y-3 pt-1">
          {isLoading && <p className="text-xs text-vigno-muted">Loading children…</p>}
          {!isLoading && children?.length === 0 && (
            <p className="text-xs text-vigno-muted/50">No {childKind}s added under this {node.kind} yet.</p>
          )}
          {!isLoading && children?.map((child) => (
            <SyllabusNode
              key={child._id}
              node={child}
              depth={depth + 1}
              onNodeModified={() => qc.invalidateQueries({ queryKey: ['admin', 'node', node._id, 'children'] })}
              isDark={isDark}
            />
          ))}
        </div>
      )}

      {/* Chapters (lowest Tree Level) get the LessonsList instead of children list */}
      {expanded && node.kind === 'chapter' && (
        <LessonsList chapterId={node._id} isDark={isDark} />
      )}

      {/* Add New Child Form Trigger */}
      {childKind !== 'content' && (
        <div className="pt-1">
          {addingChild ? (
            <form onSubmit={handleAddChild} className="flex gap-2 max-w-sm">
              <input
                type="text"
                autoFocus
                placeholder={`Name of new ${childKind}…`}
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                className="px-2.5 py-1 rounded-md bg-vigno-bg2 border border-vigno-line/50 text-xs outline-none text-vigno-txt"
              />
              <button type="submit" className="bg-vigno-accent text-vigno-bg1 font-bold text-[11px] px-3 rounded-md">Add</button>
              <button type="button" onClick={() => setAddingChild(false)} className="text-xs text-vigno-muted hover:underline">Cancel</button>
            </form>
          ) : (
            <button
              onClick={() => setAddingChild(true)}
              className="text-xs text-vigno-accent2 hover:underline font-bold"
            >
              + Add {childKind}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Course Curriculum Editor ──────────────────────────────────────────────────
function CurriculumBuilder({ course, onBack, isDark }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('curriculum') // 'curriculum' | 'landing'
  const [newSubjectName, setNewSubjectName] = useState('')
  const [addingSubject, setAddingSubject] = useState(false)

  // Landing page form states
  const [subtitle, setSubtitle] = useState(course.meta?.subtitle || '')
  const [description, setDescription] = useState(course.meta?.description || '')
  const [instructor, setInstructor] = useState(course.meta?.instructor || '')
  const [price, setPrice] = useState(course.meta?.price || '')
  const [tagsText, setTagsText] = useState(
    Array.isArray(course.meta?.tags) ? course.meta.tags.join(', ') : (course.meta?.tags || '')
  )
  const [thumbnail, setThumbnail] = useState(course.meta?.thumbnail || '')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [thumbnailError, setThumbnailError] = useState('')
  const [learningOutcomesText, setLearningOutcomesText] = useState(
    Array.isArray(course.meta?.learningOutcomes) ? course.meta.learningOutcomes.join('\n') : ''
  )
  const [requirementsText, setRequirementsText] = useState(
    Array.isArray(course.meta?.requirements) ? course.meta.requirements.join('\n') : (course.meta?.requirements || '')
  )
  const [targetAudienceText, setTargetAudienceText] = useState(
    Array.isArray(course.meta?.targetAudience) ? course.meta.targetAudience.join('\n') : (course.meta?.targetAudience || '')
  )
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState(null)

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['admin', 'nodes', course._id, 'subjects'],
    queryFn: () => adminApi.listNodes({ parentId: course._id }),
  })

  const handleAddSubject = async (e) => {
    e.preventDefault()
    if (!newSubjectName.trim()) return
    try {
      await adminApi.createNode({
        kind: 'subject',
        name: newSubjectName.trim(),
        parentId: course._id,
      })
      setNewSubjectName('')
      setAddingSubject(false)
      qc.invalidateQueries({ queryKey: ['admin', 'nodes', course._id, 'subjects'] })
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to add subject'))
    }
  }

  const handleThumbnailUploadFile = async (file) => {
    if (!file) return
    setThumbnailUploading(true)
    setThumbnailError('')
    try {
      const r = await adminApi.uploadCourseThumbnail(course._id, file)
      setThumbnail(r.thumbnail)
    } catch (err) {
      setThumbnailError('Thumbnail upload failed. Please try again.')
    } finally {
      setThumbnailUploading(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsMsg(null)
    const outcomes = learningOutcomesText.split('\n').map(l => l.trim()).filter(Boolean)
    const reqs = requirementsText.split('\n').map(r => r.trim()).filter(Boolean)
    const audience = targetAudienceText.split('\n').map(a => a.trim()).filter(Boolean)
    const parsedTags = tagsText.split(',').map(t => t.trim()).filter(Boolean)
    try {
      const updatedMeta = {
        ...course.meta,
        subtitle: subtitle.trim(),
        description: description.trim(),
        learningOutcomes: outcomes,
        requirements: reqs,
        targetAudience: audience,
        instructor: instructor.trim(),
        price: Number(price) || 0,
        tags: parsedTags,
        thumbnail: thumbnail.trim(),
      }
      await adminApi.updateNode(course._id, { meta: updatedMeta })
      setSettingsMsg({ ok: true, text: 'Landing page settings saved successfully!' })
      qc.invalidateQueries({ queryKey: ['admin', 'nodes', 'courses'] })
    } catch (err) {
      setSettingsMsg({ ok: false, text: apiErrorMessage(err, 'Failed to save settings') })
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-vigno-line/30 pb-4">
        <div className="space-y-1">
          <button onClick={onBack} className="text-xs text-vigno-accent2 hover:underline flex items-center gap-1 font-bold">
            ← Back to all courses
          </button>
          <h2 className="text-xl font-extrabold text-vigno-txt">Curriculum for {course.name}</h2>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-vigno-line/30 pb-2">
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'curriculum'
              ? 'bg-vigno-accent/15 border border-vigno-accent/30 text-vigno-accent'
              : 'text-vigno-muted hover:text-vigno-txt'
          }`}
        >
          Curriculum Tree
        </button>
        <button
          onClick={() => setActiveTab('landing')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'landing'
              ? 'bg-vigno-accent/15 border border-vigno-accent/30 text-vigno-accent'
              : 'text-vigno-muted hover:text-vigno-txt'
          }`}
        >
          Landing Page Settings
        </button>
      </div>

      {activeTab === 'curriculum' ? (
        <div className="space-y-6">
          {/* Curriculum list */}
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-vigno-muted text-sm">Loading syllabus…</p>
            ) : (
              <div className="space-y-4">
                {subjects?.length === 0 && (
                  <p className="text-sm text-vigno-muted">This course syllabus is empty. Add a subject below to begin.</p>
                )}
                {subjects?.map((sub) => (
                  <SyllabusNode
                    key={sub._id}
                    node={sub}
                    depth={1}
                    onNodeModified={() => qc.invalidateQueries({ queryKey: ['admin', 'nodes', course._id, 'subjects'] })}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add Subject form */}
          <div>
            {addingSubject ? (
              <form onSubmit={handleAddSubject} className="flex gap-2 max-w-sm bg-black/10 p-3 rounded-xl border border-vigno-line/30">
                <input
                  type="text"
                  placeholder="e.g. Flight Instruments"
                  autoFocus
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-vigno-bg2 border border-vigno-line/50 text-xs outline-none text-vigno-txt"
                />
                <button
                  type="submit"
                  className="bg-vigno-accent text-vigno-bg1 font-bold px-3 py-1.5 rounded-lg text-xs hover:brightness-110"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setAddingSubject(false)}
                  className="text-xs text-vigno-muted hover:underline px-1"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setAddingSubject(true)}
                className="bg-vigno-accent text-vigno-bg1 font-bold px-4 py-2.5 rounded-xl text-xs hover:brightness-110 transition-all"
              >
                + Add New Subject
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-5 max-w-3xl bg-black/10 border border-vigno-line/30 rounded-2xl p-5">
          <h3 className="text-base font-bold text-vigno-accent">Course Landing Page Settings</h3>
          
          {settingsMsg && (
            <p className={`text-sm px-3 py-2 rounded-lg border ${
              settingsMsg.ok ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}>
              {settingsMsg.text}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-xs text-vigno-muted font-bold block">Course Subtitle / Tagline</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Master flight navigation from absolute basics to professional commercial licensing."
              className="w-full px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none text-vigno-txt"
            />
          </div>

          <div className="space-y-2.5 bg-black/10 border border-vigno-line/45 rounded-xl p-4">
            <label className="text-xs text-vigno-muted font-bold block">Course Thumbnail (Face of the Course)</label>
            {thumbnail && (
              <div className="w-40 aspect-video rounded-lg overflow-hidden border border-vigno-line/60 bg-slate-900 relative">
                <img src={thumbnail} alt="Course Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setThumbnail('')}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-black text-red-400 rounded-full flex items-center justify-center text-xs font-bold"
                  title="Remove Image"
                >
                  ×
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-vigno-muted font-bold block">Upload Image File</label>
                <label className="inline-block bg-vigno-accent hover:brightness-110 text-vigno-bg1 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all">
                  {thumbnailUploading ? 'Uploading Image…' : 'Choose Local File'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleThumbnailUploadFile(e.target.files?.[0])}
                    disabled={thumbnailUploading}
                  />
                </label>
                {thumbnailError && <p className="text-[10px] text-red-300 mt-1">{thumbnailError}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-vigno-muted font-bold block">Or Paste Image URL</label>
                <input
                  type="text"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://images.unsplash.com/... or /ppl_ground_thumb.png"
                  className="w-full px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-xs outline-none text-vigno-txt"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-vigno-muted font-bold block">Instructor Name</label>
              <input
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="e.g. Maximilian Schwarzmüller"
                className="w-full px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none text-vigno-txt"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-vigno-muted font-bold block">Course Price (₹)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 659"
                className="w-full px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none text-vigno-txt"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-vigno-muted font-bold block">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="e.g. Flight, Ground, Navigation"
                className="w-full px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none text-vigno-txt"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-vigno-muted font-bold block">Course Detailed Description</label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed explanation of the course course syllabus, goals, and structure..."
              className="w-full px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none text-vigno-txt resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-vigno-muted font-bold block">What You'll Learn (one outcome per line)</label>
            <textarea
              rows={4}
              value={learningOutcomesText}
              onChange={(e) => setLearningOutcomesText(e.target.value)}
              placeholder="e.g. Understand the principles of dead reckoning&#10;Interpret standard aviation METAR/TAF weather reports"
              className="w-full px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none text-vigno-txt resize-none font-sans"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-vigno-muted font-bold block">Requirements (one per line)</label>
              <textarea
                rows={3}
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                placeholder="e.g. Basic secondary school level mathematics&#10;PPL Ground course completed (for flight training)"
                className="w-full px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none text-vigno-txt resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-vigno-muted font-bold block">Target Audience (one per line)</label>
              <textarea
                rows={3}
                value={targetAudienceText}
                onChange={(e) => setTargetAudienceText(e.target.value)}
                placeholder="e.g. Aspiring student pilots&#10;Aviation hobbyists and flight simulator enthusiasts"
                className="w-full px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none text-vigno-txt resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="bg-vigno-accent hover:brightness-110 text-vigno-bg1 font-bold px-5 py-2 rounded-xl text-sm transition-all"
          >
            {savingSettings ? 'Saving Settings…' : 'Save Landing Page Settings'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Standalone Resources Manager (Manage Standalone Files/Lessons) ──────────
function StandaloneResourcesManager({ isDark }) {
  const qc = useQueryClient()
  const { data: resources, isLoading, isError } = useQuery({
    queryKey: ['admin', 'resources'],
    queryFn: () => adminApi.listResources(),
  })

  const [title, setTitle] = useState('')
  const [type, setType] = useState('video')
  const [price, setPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [metaOpenId, setMetaOpenId] = useState(null)
  const [uploads, setUploads] = useState({})

  useEffect(() => subscribeUploads(setUploads), [])

  const handleAddResource = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setAdding(true)
    try {
      await adminApi.createStandaloneResource({
        title: title.trim(),
        type,
        price: Number(price) || 0,
      })
      setTitle('')
      setPrice('')
      qc.invalidateQueries({ queryKey: ['admin', 'resources'] })
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to add resource'))
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteResource = async (id, name) => {
    if (!window.confirm(`Delete standalone resource "${name}"?`)) return
    try {
      await adminApi.deleteResource(id)
      qc.invalidateQueries({ queryKey: ['admin', 'resources'] })
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const togglePublished = async (id, currentVal) => {
    try {
      await adminApi.updateContent(id, { published: !currentVal })
      qc.invalidateQueries({ queryKey: ['admin', 'resources'] })
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const handleUpload = (res, file) => {
    if (!file) return
    startUpload(res, file)
  }

  const saveMeta = async (id, data) => {
    try {
      await adminApi.updateContent(id, data)
      qc.invalidateQueries({ queryKey: ['admin', 'resources'] })
      setMetaOpenId(null)
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const getTypeLabel = (type) => {
    if (type === 'video') return 'Video'
    if (type === 'pdf') return 'PDF'
    if (type === '3d') return '3D Model / Animation'
    if (type === 'game') return 'Interactive Game'
    return type
  }

  return (
    <div className="space-y-6">
      {/* Create standalone resource form */}
      <div className="bg-vigno-card border border-vigno-line/50 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-extrabold text-vigno-accent uppercase tracking-widest mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-vigno-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Individual Resource
        </h3>
        <form onSubmit={handleAddResource} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-vigno-muted uppercase tracking-wider">Resource Title</label>
            <input
              type="text"
              placeholder="Resource Title (e.g. ANO 1 Flight Planning)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-vigno-bg2/60 border border-vigno-line/60 text-sm text-vigno-txt outline-none transition-all w-full"
            />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-vigno-muted uppercase tracking-wider">Resource Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-vigno-bg2/60 border border-vigno-line/60 text-sm outline-none text-vigno-txt transition-all w-full cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748b' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'></path></svg>")`,
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem',
                backgroundRepeat: 'no-repeat',
                paddingRight: '2rem'
              }}
            >
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="3d">3D Model / Animation</option>
              <option value="game">Interactive Game</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-vigno-muted uppercase tracking-wider">Price (INR)</label>
            <div className="relative w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-vigno-muted text-sm select-none">₹</span>
              <input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-vigno-bg2/60 border border-vigno-line/60 text-sm text-vigno-txt outline-none transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="h-[42px] bg-vigno-accent hover:brightness-105 active:scale-[0.98] text-vigno-bg1 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 w-full shadow-md disabled:opacity-50"
          >
            {adding ? (
              <span>Adding…</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Add Resource</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Standalone resources list */}
      {isLoading ? (
        <p className="text-vigno-muted text-sm py-4">Loading resources…</p>
      ) : isError ? (
        <p className="text-red-300 text-sm py-4">Failed to load resources.</p>
      ) : resources?.length === 0 ? (
        <div className="text-center py-12 text-vigno-muted bg-vigno-card border border-vigno-line/45 rounded-2xl">
          <p className="text-sm">No individual resources found. Create one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources?.map((res) => {
            const up = uploads[res._id]
            const isEditingMeta = metaOpenId === res._id
            return (
              <div key={res._id} className="bg-vigno-card border border-vigno-line/50 rounded-2xl p-4 hover:border-vigno-accent/30 transition-all duration-200 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Icon, Title, and badging info */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-vigno-accent/10 border border-vigno-accent/20 flex items-center justify-center text-vigno-accent shrink-0 select-none">
                      <LessonIcon type={res.type} className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => window.open(`/app/content/${res._id}`, '_blank')}
                          className="font-bold text-sm text-vigno-txt hover:text-vigno-accent hover:underline cursor-pointer transition-colors truncate block"
                          title="Click to preview content in new tab"
                        >
                          {res.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-vigno-muted font-medium select-none">
                        <span>{getTypeLabel(res.type)}</span>
                        <span className="text-vigno-muted/40">•</span>
                        <span className={res.price > 0 ? "text-vigno-accent font-semibold" : "text-emerald-500 font-semibold"}>
                          {res.price > 0 ? `₹${res.price}` : 'Free'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action controls group */}
                  <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0 self-start lg:self-center">
                    {/* Live/Draft Toggle */}
                    <button
                      onClick={() => togglePublished(res._id, res.published)}
                      className={`h-8 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        res.published
                          ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${res.published ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                      <span>{res.published ? 'Live' : 'Draft'}</span>
                    </button>

                    {/* Details Button */}
                    <button
                      onClick={() => setMetaOpenId(isEditingMeta ? null : res._id)}
                      className={`h-8 px-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isEditingMeta
                          ? 'bg-vigno-accent border-vigno-accent text-vigno-accent-txt shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border-vigno-line/40 text-vigno-muted hover:text-vigno-txt'
                      }`}
                    >
                      Details
                    </button>

                    {/* File Status Icon & Action */}
                    <div className="flex items-center gap-2">
                      {up ? (
                        up.status === 'uploading' ? (
                          <span className="h-8 px-2.5 rounded-xl flex items-center justify-center text-[10px] font-bold bg-vigno-accent/10 border border-vigno-accent/20 text-vigno-accent min-w-[55px] select-none" title={`Uploading: ${up.pct}%`}>
                            {up.pct}%
                          </span>
                        ) : up.status === 'done' ? (
                          <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0 select-none animate-pulse" title="File Uploaded Successfully">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : (
                          <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 shrink-0 select-none" title="Upload Failed">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )
                      ) : res.storageKey ? (
                        <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0 select-none" title="File Uploaded">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0 select-none" title="No File Uploaded">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </span>
                      )}

                      <label className="h-8 px-3.5 rounded-xl border border-vigno-accent/30 bg-vigno-accent/10 hover:bg-vigno-accent/25 text-vigno-accent text-xs font-bold flex items-center justify-center cursor-pointer transition-all gap-1.5 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span>{res.storageKey ? 'Edit File' : 'Upload File'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleUpload(res, e.target.files?.[0])}
                        />
                      </label>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteResource(res._id, res.title)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95 transition-all cursor-pointer text-red-500"
                      title="Delete Resource"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details Editor Drawer */}
                {isEditingMeta && (
                  <div className="border-t border-vigno-line/20 pt-4 mt-3">
                    <LessonDetailsEditor lesson={res} onSave={(data) => saveMeta(res._id, data)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── CmsManager Main Controller ────────────────────────────────────────────────
export default function CmsManager() {
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [activeMainTab, setActiveMainTab] = useState('courses') // 'courses' | 'resources'

  if (selectedCourse) {
    return (
      <CurriculumBuilder
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
        isDark={isDark}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Main Tabs */}
      <div className="flex gap-2 border-b border-vigno-line/30 pb-2">
        <button
          onClick={() => setActiveMainTab('courses')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'courses'
              ? 'bg-vigno-accent/15 border border-vigno-accent/30 text-vigno-accent'
              : 'text-vigno-muted hover:text-vigno-txt'
          }`}
        >
          Courses
        </button>
        <button
          onClick={() => setActiveMainTab('resources')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'resources'
              ? 'bg-vigno-accent/15 border border-vigno-accent/30 text-vigno-accent'
              : 'text-vigno-muted hover:text-vigno-txt'
          }`}
        >
          Individual Resources
        </button>
      </div>

      {activeMainTab === 'courses' ? (
        <CourseList
          onSelect={(course) => setSelectedCourse(course)}
          isDark={isDark}
        />
      ) : (
        <StandaloneResourcesManager isDark={isDark} />
      )}
    </div>
  )
}
