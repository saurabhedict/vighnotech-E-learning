import { env } from './config/env.js'
import { connectDB, disconnectDB } from './config/db.js'
import { keystore } from './services/keystore.js'
import { seedDatabase, isSeeded } from './seed/seedData.js'
import { createApp } from './app.js'

async function start() {
  await connectDB()

  // Ensure the License Authority signing key exists on boot (KMS stand-in).
  keystore.activeKid()

  // The in-memory dev DB is empty on every boot — auto-seed so the stack is
  // usable immediately. For a real DB, run `npm run seed` once instead.
  if (env.useMemoryDb && !(await isSeeded())) {
    console.log('[boot] in-memory DB detected — auto-seeding…')
    await seedDatabase({ log: (m) => console.log(m) })
  }

  const app = createApp()
  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`\n  Vigno Smart Class API → http://localhost:${env.port}`)
    console.log(`  Health:     http://localhost:${env.port}/health`)
    console.log(`  Public key: http://localhost:${env.port}/.well-known/vigno-public-key`)
    console.log(`  Payments:   ${env.razorpay.mock ? 'MOCK gateway (no Razorpay keys set)' : 'Razorpay live keys'}`)
    console.log(`  DB:         ${env.useMemoryDb || !env.mongoUri ? 'in-memory MongoDB (dev)' : 'configured MONGO_URI'}\n`)
  })

  const shutdown = async (sig) => {
    console.log(`\n[${sig}] shutting down…`)
    server.close()
    await disconnectDB()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((e) => {
  console.error('[fatal] failed to start:', e)
  process.exit(1)
})
