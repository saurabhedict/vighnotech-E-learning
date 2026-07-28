import mongoose from 'mongoose'

/**
 * Admin-defined filter categories used to classify courses/programs. Fully
 * dynamic: an admin can create any number of categories (e.g. "Content Type",
 * "Training Program"), each holding a set of options. A course stores the
 * option ids it belongs to in TreeNode.meta.filters (a flat array), so the user
 * side can offer one multi-select dropdown per category.
 */
const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true } // each option gets its own _id — that's what courses reference
)

const filterCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, trim: true, default: '', index: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    options: { type: [optionSchema], default: [] },
  },
  { timestamps: true }
)

export const FilterCategory = mongoose.model('FilterCategory', filterCategorySchema)
