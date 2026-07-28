// CLI seeder: `npm run seed`. Connects to the configured DB, seeds, exits.
// NOTE: with the in-memory dev DB this writes to a throwaway database; the
// server auto-seeds itself on boot in that mode (see src/index.js).
import { connectDB, disconnectDB } from '../config/db.js'
import { seedDatabase } from './seedData.js'

async function run() {
  await connectDB()
  await seedDatabase({ log: (m) => console.log(m) })
  await disconnectDB()
  console.log('[seed] done.')
  process.exit(0)
}

run().catch((e) => {
  console.error('[seed] failed:', e)
  process.exit(1)
})
