import mongoose from 'mongoose'
import { env } from './env.js'

let memoryServer = null

/**
 * Connect to MongoDB.
 *
 * Prod: set MONGO_URI to an Atlas connection string.
 * Dev:  if USE_MEMORY_DB is on (default when no MONGO_URI), spin up an
 *       in-memory MongoDB so the whole stack runs with zero local setup.
 */
export async function connectDB() {
  mongoose.set('strictQuery', true)

  let uri = env.mongoUri

  if (env.useMemoryDb || !uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    uri = memoryServer.getUri('vigno_smartclass')
    // eslint-disable-next-line no-console
    console.log('[db] using in-memory MongoDB (dev). Set MONGO_URI + USE_MEMORY_DB=false for a real DB.')
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })
  // eslint-disable-next-line no-console
  console.log(`[db] connected: ${mongoose.connection.host}/${mongoose.connection.name}`)

  mongoose.connection.on('error', (e) => console.error('[db] error:', e.message))
  return mongoose.connection
}

export async function disconnectDB() {
  await mongoose.connection.close()
  if (memoryServer) await memoryServer.stop()
}
