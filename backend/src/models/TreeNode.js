import mongoose from 'mongoose'

/**
 * Content tree (LLD: Content Tree — boards/classes/subjects/modules/chapters).
 * Modeled as a single self-referential collection keyed by `parentId` so the
 * CMS can CRUD/reorder any level. Leaf *files* live in the Content collection.
 *
 * `kind` is extensible: 'board' | 'class' | 'course' | 'subject' | 'module' | 'chapter'.
 * The current frontend uses course → subject → module → chapter.
 */
const treeNodeSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['board', 'class', 'course', 'subject', 'module', 'chapter'],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    // URL-safe key for top-level course nodes (e.g. "PPL_Ground"); the frontend
    // routes by this value. Unique among course nodes only.
    slug: { type: String, trim: true, index: true, sparse: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreeNode', default: null, index: true },
    // Denormalized top-level course slug for fast ownership/scope queries.
    courseKey: { type: String, index: true },
    order: { type: Number, default: 0 },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
)

// Hot path: list a node's children (CMS tree + course tree walk), filtered by
// kind and sorted by display order. Compound covers parentId, parentId+kind,
// and the parentId+kind+order sort in one index.
treeNodeSchema.index({ parentId: 1, kind: 1, order: 1 })

export const TreeNode = mongoose.model('TreeNode', treeNodeSchema)
