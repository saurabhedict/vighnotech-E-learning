// One-off migration: purchased licenses used to default to a 7-day lifetime, so
// every purchase older than a week silently EXPIRED — ownership checks
// (hasActiveLicense) then returned false and the app read as "not purchased"
// (e.g. APK activation → 402). The default is now ~10 years; this extends the
// EXISTING active purchase licenses so past buyers get their access back.
//
//   node src/scripts/extend-purchase-licenses.js            # dry-run (shows what WOULD change)
//   node src/scripts/extend-purchase-licenses.js --apply    # write the changes
//
// Client-GRANT licenses (admin-provisioned to role:'client' accounts, with a real
// validity date) are intentionally LEFT ALONE so their expiry still applies.
// Revoked/refunded licenses (status != 'active') are untouched.
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  console.error('MONGO_URI not found in env — is backend/.env present (or set MONGO_URI)?')
  process.exit(1)
}

const APPLY = process.argv.includes('--apply')
const YEARS = 10
const newExpiry = new Date(Date.now() + YEARS * 365 * 86_400_000)

const User = mongoose.model('User', new mongoose.Schema({ role: String }, { strict: false, collection: 'users' }))
const License = mongoose.model('License', new mongoose.Schema({}, { strict: false, collection: 'licenses' }))

async function run() {
  await mongoose.connect(MONGO_URI)

  // Client accounts get grants with their own validity date — exclude them.
  const clientIds = await User.find({ role: 'client' }).distinct('_id')
  const filter = { status: 'active', userId: { $nin: clientIds } }

  const total = await License.countDocuments(filter)
  const expired = await License.countDocuments({ ...filter, expiresAt: { $lt: new Date() } })
  console.log(`Active non-client (purchase/admin) licenses: ${total}`)
  console.log(`  of which currently EXPIRED (access lost): ${expired}`)
  console.log(`Excluded client-grant accounts: ${clientIds.length}`)
  console.log(`New expiry to set: ${newExpiry.toISOString()} (+${YEARS}y)`)

  if (!total) {
    console.log('Nothing to extend.')
    await mongoose.connection.close()
    return
  }
  if (!APPLY) {
    console.log('\nDRY RUN — re-run with --apply to write these changes.')
    await mongoose.connection.close()
    return
  }

  const r = await License.updateMany(filter, { $set: { expiresAt: newExpiry } })
  console.log(`\n✓ Extended ${r.modifiedCount} license(s). Past buyers now own their content again.`)
  await mongoose.connection.close()
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
