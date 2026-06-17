import { Router } from 'express'
import { keystore } from '../services/keystore.js'
import { gameLicensePublicKey, gameLicenseJwk } from '../services/gameLicense.js'

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

// Public RSA key the in-game LicenseGuard embeds to verify device tokens. Returns
// modulus/exponent (what Unity/Mono needs via RSAParameters) plus the PEM.
router.get('/.well-known/game-license-public-key', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600')
  const { modulus, exponent } = gameLicenseJwk()
  res.json({ algorithm: 'RS256', modulus, exponent, pem: gameLicensePublicKey() })
})

export default router
