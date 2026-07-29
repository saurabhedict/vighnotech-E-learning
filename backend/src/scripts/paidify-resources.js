// One-off migration: individual (standalone) resources are always paid now, but
// some were created before that rule and are still FREE (price 0 / isPaid false).
// This sets them to isPaid=true with a default price so nothing stays free. The
// admin can then adjust each amount in the CMS.
//
//   node src/scripts/paidify-resources.js            # dry-run (shows what WOULD change)
//   node src/scripts/paidify-resources.js --apply    # actually write the changes
//   RESOURCE_DEFAULT_PRICE=149 node src/scripts/paidify-resources.js --apply
//
// A standalone resource is one with an empty courseKey (or the legacy
// 'Individual_Resources' bucket). Course lessons (price 0, unlocked by buying the
// course) are intentionally left untouched.
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  console.error('MONGO_URI not found in env — is backend/.env present?')
  process.exit(1)
}

const APPLY = process.argv.includes('--apply')
const DEFAULT_PRICE = Math.max(1, Math.round(Number(process.env.RESOURCE_DEFAULT_PRICE) || 99))

// Minimal Content shape — we only touch courseKey / isPaid / price.
const Content = mongoose.model(
  'Content',
  new mongoose.Schema({}, { strict: false, collection: 'contents' })
)

async function run() {
  await mongoose.connect(MONGO_URI)
  console.log(`Connected. Default price for free resources: ₹${DEFAULT_PRICE}`)

  // Standalone = no real courseKey. Free = price < 1 or isPaid false.
  const standaloneFilter = {
    $and: [
      { $or: [{ courseKey: { $in: ['', null] } }, { courseKey: { $exists: false } }, { courseKey: 'Individual_Resources' }] },
      { $or: [{ isPaid: { $ne: true } }, { price: { $lt: 1 } }] },
    ],
  }

  const free = await Content.find(standaloneFilter).select('title type price isPaid courseKey').lean()
  if (!free.length) {
    console.log('✓ No free individual resources found — nothing to change.')
    await mongoose.connection.close()
    return
  }

  console.log(`Found ${free.length} free individual resource(s):`)
  for (const c of free) {
    console.log(`  - [${c.type}] "${c.title}"  (price ₹${c.price ?? 0}, isPaid ${!!c.isPaid}) → ₹${DEFAULT_PRICE}, paid`)
  }

  if (!APPLY) {
    console.log('\nDRY RUN — re-run with --apply to write these changes.')
    await mongoose.connection.close()
    return
  }

  const r = await Content.updateMany(standaloneFilter, { $set: { isPaid: true, price: DEFAULT_PRICE } })
  console.log(`\n✓ Updated ${r.modifiedCount} resource(s). Adjust each amount in Admin → CMS → Individual Resources.`)
  await mongoose.connection.close()
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
