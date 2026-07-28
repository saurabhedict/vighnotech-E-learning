// `npm run keys:gen` — ensure the ES256 License Authority signing key exists
// (KMS stand-in). The keystore generates it on first access if missing.
import { keystore } from '../services/keystore.js'

const kid = keystore.activeKid()
console.log(`[keys] active signing key: ${kid}`)
console.log('[keys] public JWKS (publish at /.well-known/vigno-public-key):')
console.log(JSON.stringify(keystore.jwks(), null, 2))
process.exit(0)
