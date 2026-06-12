import { Router } from 'express'
import { keystore } from '../services/keystore.js'
import { gameLicensePublicKey } from '../services/gameLicense.js'

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

// Public RSA key (PEM) the in-game LicenseGuard embeds to verify device tokens.
router.get('/.well-known/game-license-public-key', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600')
  res.type('text/plain').send(gameLicensePublicKey())
})

export default router
