import { TreeNode } from '../models/TreeNode.js'
import { Content } from '../models/Content.js'

// Assemble the nested tree the frontend expects from the flat TreeNode/Content
// collections. Shape mirrors src/api/mockApi.js: course → subjects → modules →
// chapters → items.

export async function listCourseSlugs() {
  const courses = await TreeNode.find({ kind: 'course' }).sort({ order: 1, name: 1 }).lean()
  return courses.map((c) => c.slug)
}

export async function getCourseTree(slug) {
  const course = await TreeNode.findOne({ kind: 'course', slug }).lean()
  if (!course) return null

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
            ...(it.isPaid ? { price: it.price } : {}),
          })),
        })
      }
      moduleOut.push({ id: mod._id.toString(), name: mod.name, chapters: chapterOut })
    }
    out.push({ subject: subject.name, modules: moduleOut })
  }
  return out
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
        ...(it.isPaid ? { price: it.price } : {}),
      })),
    })
  }
  return { id: mod._id.toString(), name: mod.name, subject: subject?.name || '', chapters: chapterOut }
}
