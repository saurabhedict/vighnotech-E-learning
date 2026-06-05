// "PPL Ground & Theory" → "PPL_Ground_Theory" (keeps the underscore style the
// frontend course keys already use, e.g. PPL_Ground).
export function slugify(name) {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
