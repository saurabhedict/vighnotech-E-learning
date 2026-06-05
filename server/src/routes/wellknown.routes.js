import { Router } from 'express'
import { keystore } from '../services/keystore.js'

const router = Router()

/**
 * Publish the PUBLIC verify key (Doc 2 §5, §8.1). Clients (browser viewer and
 * the desktop launcher) fetch this once to verify license signatures offline.
 * The private key never appears here.
 */
router.get('/.well-known/vigno-public-key', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600')
  res.json(keystore.jwks())
})

export default router
