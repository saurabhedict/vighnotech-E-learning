import { TreeNode } from '../models/TreeNode.js'
import { Content } from '../models/Content.js'
import { createMediaUrl } from './storage.js'

// Assemble the nested tree the frontend expects from the flat TreeNode/Content
// collections. Shape mirrors src/api/mockApi.js: course → subjects → modules →
// chapters → items.

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

  const subjects = await TreeNode.find({ parentId: course._id, kind: 'subject' }).sort({ order: 1 }).lean()
  const out = []

  for (const subject of subjects) {
    const modules = await TreeNode.find({ parentId: subject._id, kind: 'module' }).sort({ order: 1 }).lean()
    const moduleOut = []

    for (const mod of modules) {
      const chapters = await TreeNode.find({ parentId: mod._id, kind: 'chapter' }).sort({ order: 1 }).lean()
      const chapterOut = []

      for (const ch of chapters) {
        const items = await Content.find({ chapterId: ch._id, published: true }).sort({ order: 1 }).lean()
        chapterOut.push({
          name: ch.name,
          items: items.map((it) => ({
            id: it._id.toString(),
            title: it.title,
            type: it.type,
            paid: it.isPaid,
            price: it.price || 0,
            courseKey: it.courseKey || '',
          })),
        })
      }
      moduleOut.push({ id: mod._id.toString(), name: mod.name, chapters: chapterOut })
    }
    out.push({ subject: subject.name, modules: moduleOut })
  }
  return { course, tree: out }
}

export async function getModule(courseSlug, moduleId) {
  const mod = await TreeNode.findOne({ _id: moduleId, kind: 'module' }).lean()
  if (!mod) return null
  const subject = mod.parentId ? await TreeNode.findById(mod.parentId).lean() : null

  const chapters = await TreeNode.find({ parentId: mod._id, kind: 'chapter' }).sort({ order: 1 }).lean()
  const chapterOut = []
  for (const ch of chapters) {
    const items = await Content.find({ chapterId: ch._id, published: true }).sort({ order: 1 }).lean()
    chapterOut.push({
      name: ch.name,
      items: items.map((it) => ({
        id: it._id.toString(),
        title: it.title,
        type: it.type,
        paid: it.isPaid,
        price: it.price || 0,
        courseKey: it.courseKey || '',
      })),
    })
  }
  return { id: mod._id.toString(), name: mod.name, subject: subject?.name || '', chapters: chapterOut }
}
