// Directly set an APK content's identifier AND make sure the buyer owns it —
// bypasses the CMS. Run with the identifier your APK actually reports (see the
// server log line:  [activateapp] identifier="…"  after one login attempt).
//
//   node src/scripts/set-apk-identifier.js <IDENTIFIER>
//   node src/scripts/set-apk-identifier.js <IDENTIFIER> "<APK title>"   (default title: GAME)
//
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const DB = 'vigno_smartclass'
const BUYER = '103220654@tcetmumbai.in'
const IDN = (process.argv[2] || '').trim()
const TITLE = (process.argv[3] || 'GAME').trim()

const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('')

const run = async () => {
  if (!IDN) {
    console.error('Usage: node src/scripts/set-apk-identifier.js <IDENTIFIER> ["<APK title>"]')
    process.exit(1)
  }
  await mongoose.connect(process.env.MONGO_URI)
  const db = mongoose.connection.getClient().db(DB)
  const contents = db.collection('contents')
  const licenses = db.collection('licenses')
  const users = db.collection('users')

  const game = await contents.findOne({ type: 'apk', title: TITLE })
  if (!game) {
    const all = await contents.find({ type: 'apk' }).project({ title: 1 }).toArray()
    console.error(`No apk content titled "${TITLE}". Existing apk titles: ${JSON.stringify(all.map((a) => a.title))}`)
    process.exit(1)
  }

  // Put the identifier on this content (free it from any other apk first).
  await contents.updateMany({ type: 'apk', identifier: IDN, _id: { $ne: game._id } }, { $set: { identifier: '' } })
  await contents.updateOne({ _id: game._id }, { $set: { identifier: IDN } })
  console.log(`Set "${game.title}" (_id=${game._id}) identifier = "${IDN}"`)

  // Ensure the buyer holds an active, long-lived license for it.
  const buyer = await users.findOne({ email: BUYER })
  if (!buyer) { console.error(`Buyer ${BUYER} not found`); process.exit(1) }
  const exp = new Date(Date.now() + 10 * 365 * 86_400_000)
  const existing = await licenses.findOne({ userId: buyer._id, contentId: game._id })
  if (existing) {
    await licenses.updateOne({ _id: existing._id }, { $set: { status: 'active', expiresAt: exp } })
    console.log(`Reactivated license ${existing._id}`)
  } else {
    const jti = 'lic_' + hex(16)
    await licenses.insertOne({
      _id: jti, userId: buyer._id, contentId: game._id, type: game.lane || 'download',
      status: 'active', deviceId: null, kid: 'vigno-key-2026', issuedAt: new Date(),
      expiresAt: exp, deniedDevices: [], flagged: false, createdAt: new Date(), updatedAt: new Date(),
    })
    console.log(`Granted license ${jti} to ${BUYER}`)
  }

  // Verify exactly what /activateapp will check.
  const apk = await contents.findOne({ type: 'apk', identifier: IDN, published: true })
  const lic = await licenses.findOne({ userId: buyer._id, contentId: apk?._id, status: 'active' })
  const ok = !!(apk && lic && new Date(lic.expiresAt) > new Date())
  console.log(`\nVERIFY: identifier "${IDN}" → "${apk?.title}"; buyer owns & usable? ${ok ? 'YES ✅ → activation will pass' : 'NO ❌'}`)
  await mongoose.connection.close()
}
run().catch((e) => { console.error(e); process.exit(1) })
