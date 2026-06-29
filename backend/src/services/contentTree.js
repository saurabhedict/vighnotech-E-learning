import { TreeNode } from '../models/TreeNode.js'
import { Content } from '../models/Content.js'
import { createMediaUrl } from './storage.js'

// Assemble the nested tree the frontend expects from the flat TreeNode/Content
// collections. Shape mirrors src/api/mockApi.js: course → subjects → modules →
// chapters → items.
//
// Built with LEVEL-BATCHED queries (parentId $in) instead of one query per node:
// a course of S subjects × M modules × C chapters used to cost 1+S+S·M+S·M·C
// round-trips to Atlas; it now costs a FIXED 5 (course, subjects, modules,
// chapters, content) regardless of size. Same edges/filters/sort → identical output.

// Group rows by a (stringified) key, preserving each row's incoming sort order.
function groupBy(rows, key) {
  const m = new Map()
  for (const r of rows) {
    const k = String(r[key])
    const bucket = m.get(k)
    if (bucket) bucket.push(r)
    else m.set(k, [r])
  }
  return m
}

// Public item shape used by both the course tree and a single module.
const itemCard = (it) => ({
  id: it._id.toString(),
  title: it.title,
  type: it.type,
  paid: it.isPaid,
  price: it.price || 0,
  courseKey: it.courseKey || '',
})

export async function listCourseSlugs() {
  const courses = await TreeNode.find({ kind: 'course', slug: { $ne: 'Individual_Resources' } }).sort({ order: 1, name: 1 }).lean()
  for (const course of courses) {
    if (course.meta) {
      if (!course.meta.thumbnailStorageKey && course.meta.thumbnail) {
        const match = course.meta.thumbnail.match(/(obj_[a-z0-9]{20}(?:\.[a-z0-9]+)?)/i)
        if (match) {
          const key = match[1]
          course.meta.thumbnailStorageKey = key
          await TreeNode.updateOne({ _id: course._id }, { $set: { 'meta.thumbnailStorageKey': key } })
        }
      }
      if (course.meta.thumbnailStorageKey) {
        course.meta.thumbnail = await createMediaUrl(course.meta.thumbnailStorageKey)
      }
    }
  }
  return courses
}

export async function getCourseTree(slug) {
  const course = await TreeNode.findOne({ kind: 'course', slug }).lean()
  if (!course) return null
  if (course.meta) {
    if (!course.meta.thumbnailStorageKey && course.meta.thumbnail) {
      const match = course.meta.thumbnail.match(/(obj_[a-z0-9]{20}(?:\.[a-z0-9]+)?)/i)
      if (match) {
        const key = match[1]
        course.meta.thumbnailStorageKey = key
        await TreeNode.updateOne({ _id: course._id }, { $set: { 'meta.thumbnailStorageKey': key } })
      }
    }
    if (course.meta.thumbnailStorageKey) {
      course.meta.thumbnail = await createMediaUrl(course.meta.thumbnailStorageKey)
    }
  }

  // One query per level (not per node). Each $in query is sorted by `order`, so
  // grouping by parent preserves the same per-parent ordering as the old loops.
  const subjects = await TreeNode.find({ parentId: course._id, kind: 'subject' }).sort({ order: 1 }).lean()
  const subjectIds = subjects.map((s) => s._id)

  const modules = subjectIds.length
    ? await TreeNode.find({ parentId: { $in: subjectIds }, kind: 'module' }).sort({ order: 1 }).lean()
    : []
  const moduleIds = modules.map((m) => m._id)

  const chapters = moduleIds.length
    ? await TreeNode.find({ parentId: { $in: moduleIds }, kind: 'chapter' }).sort({ order: 1 }).lean()
    : []
  const chapterIds = chapters.map((c) => c._id)

  const content = chapterIds.length
    ? await Content.find({ chapterId: { $in: chapterIds }, published: true }).sort({ order: 1 }).lean()
    : []

  const modulesBySubject = groupBy(modules, 'parentId')
  const chaptersByModule = groupBy(chapters, 'parentId')
  const contentByChapter = groupBy(content, 'chapterId')

  // Keep the batched/groupBy build (fixed 5 queries), but return the { course, tree }
  // shape the redesigned frontend reads (Home.jsx → treeData.tree, course meta header).
  const tree = subjects.map((subject) => ({
    subject: subject.name,
    modules: (modulesBySubject.get(String(subject._id)) || []).map((mod) => ({
      id: mod._id.toString(),
      name: mod.name,
      chapters: (chaptersByModule.get(String(mod._id)) || []).map((ch) => ({
        name: ch.name,
        items: (contentByChapter.get(String(ch._id)) || []).map(itemCard),
      })),
    })),
  }))

  return { course, tree }
}

export async function getModule(courseSlug, moduleId) {
  const mod = await TreeNode.findOne({ _id: moduleId, kind: 'module' }).lean()
  if (!mod) return null
  const subject = mod.parentId ? await TreeNode.findById(mod.parentId).lean() : null

  const chapters = await TreeNode.find({ parentId: mod._id, kind: 'chapter' }).sort({ order: 1 }).lean()
  const chapterIds = chapters.map((c) => c._id)

  // Batch all chapters' content in one query instead of one query per chapter.
  const content = chapterIds.length
    ? await Content.find({ chapterId: { $in: chapterIds }, published: true }).sort({ order: 1 }).lean()
    : []
  const contentByChapter = groupBy(content, 'chapterId')

  return {
    id: mod._id.toString(),
    name: mod.name,
    subject: subject?.name || '',
    chapters: chapters.map((ch) => ({
      name: ch.name,
      items: (contentByChapter.get(String(ch._id)) || []).map(itemCard),
    })),
  }
}
