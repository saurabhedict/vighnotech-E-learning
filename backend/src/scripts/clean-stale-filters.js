// Remove ORPHANED filter option IDs from courses (TreeNode.meta.filters) and
// individual resources (Content.filters). An option that was deleted/recreated
// leaves items tagged with an ID that no longer exists, so those items match no
// filter. This strips those dead IDs (valid tags are kept untouched).
//
//   node src/scripts/clean-stale-filters.js            # dry-run
//   node src/scripts/clean-stale-filters.js --apply    # write
//
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const DB = 'vigno_smartclass'
const APPLY = process.argv.includes('--apply')

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI)
  const db = mongoose.connection.getClient().db(DB)

  const cats = await db.collection('filtercategories').find({}).toArray()
  const valid = new Set()
  cats.forEach((c) => (c.options || []).forEach((o) => valid.add(String(o._id))))
  console.log(`Current valid option IDs: ${valid.size}`)

  let courseFixes = 0, resFixes = 0

  // Courses
  const courses = await db.collection('treenodes').find({ kind: 'course', 'meta.filters.0': { $exists: true } }).toArray()
  for (const c of courses) {
    const cur = (c.meta.filters || []).map(String)
    const kept = cur.filter((id) => valid.has(id))
    if (kept.length !== cur.length) {
      console.log(`  course "${c.name}": ${JSON.stringify(cur)} -> ${JSON.stringify(kept)}`)
      courseFixes++
      if (APPLY) await db.collection('treenodes').updateOne({ _id: c._id }, { $set: { 'meta.filters': kept } })
    }
  }

  // Resources
  const rows = await db.collection('contents').find({ 'filters.0': { $exists: true } }).toArray()
  for (const r of rows) {
    const cur = (r.filters || []).map(String)
    const kept = cur.filter((id) => valid.has(id))
    if (kept.length !== cur.length) {
      console.log(`  resource "${r.title}": ${JSON.stringify(cur)} -> ${JSON.stringify(kept)}`)
      resFixes++
      if (APPLY) await db.collection('contents').updateOne({ _id: r._id }, { $set: { filters: kept } })
    }
  }

  console.log(`\n${APPLY ? 'Cleaned' : 'Would clean'} ${courseFixes} course(s) + ${resFixes} resource(s) of stale tag IDs.`)
  if (!APPLY) console.log('DRY RUN — re-run with --apply to write.')
  await mongoose.connection.close()
}
run().catch((e) => { console.error(e); process.exit(1) })
