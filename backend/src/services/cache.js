/**
 * In-memory TTL cache — stand-in for Redis (LLD: Optimization → Redis Cache).
 * The get/set/del/wrap interface mirrors a Redis client, so going live is a
 * config swap: back these methods with ioredis using REDIS_URL.
 */
const store = new Map() // key -> { value, exp }

export const cache = {
  get(key) {
    const e = store.get(key)
    if (!e) return undefined
    if (e.exp && e.exp < Date.now()) {
      store.delete(key)
      return undefined
    }
    return e.value
  },
  set(key, value, ttlSec = 60) {
    store.set(key, { value, exp: ttlSec ? Date.now() + ttlSec * 1000 : 0 })
  },
  del(key) {
    store.delete(key)
  },
  // Memoize an async function for ttlSec seconds.
  async wrap(key, ttlSec, fn) {
    const hit = this.get(key)
    if (hit !== undefined) return hit
    const value = await fn()
    this.set(key, value, ttlSec)
    return value
  },
}
