// Create (or promote) an ADMIN account directly in the configured database —
// WITHOUT touching any content (unlike `npm run seed`, which wipes the content tree).
// Idempotent: if the email already exists it is promoted to admin and its password
// is (re)set; otherwise a fresh admin is created. Password is bcrypt-hashed.
//
//   node src/scripts/seed-admin.js <email> <password>
//   # or rely on env: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
//   # against a specific DB:  set MONGO_URI first (see notes below)
//
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { User } from '../models/User.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const EMAIL = (process.argv[2] || process.env.SEED_ADMIN_EMAIL || '').toLowerCase().trim()
const PASSWORD = process.argv[3] || process.env.SEED_ADMIN_PASSWORD || ''

const run = async () => {
  if (!EMAIL || !PASSWORD) {
    console.error('Usage: node src/scripts/seed-admin.js <email> <password>')
    console.error('   (or set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD)')
    process.exit(1)
  }
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set (backend/.env or the environment).')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  const dbName = mongoose.connection.name

  let user = await User.findOne({ email: EMAIL }).select('+passwordHash')
  if (user) {
    user.role = 'admin'
    user.emailVerified = true
    await user.setPassword(PASSWORD)
    await user.save()
    console.log(`✓ Promoted "${EMAIL}" to admin and set its password.  (db: ${dbName})`)
  } else {
    user = new User({ email: EMAIL, name: 'Admin', role: 'admin', emailVerified: true })
    await user.setPassword(PASSWORD)
    await user.save()
    console.log(`✓ Created admin "${EMAIL}".  (db: ${dbName})`)
  }

  await mongoose.connection.close()
  process.exit(0)
}
run().catch((e) => { console.error('Failed:', e); process.exit(1) })
