import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { keyLimiter } from '../middleware/rateLimit.js'
import * as files from '../controllers/files.controller.js'

// Mounted at /api/content. Authenticated, ownership-gated content actions.
const router = Router()

router.get('/:id/stream-url', requireAuth, files.getStreamUrl)
router.get('/:id/drm-token', requireAuth, files.getDrmToken)
router.get('/:id/download', requireAuth, files.downloadEncrypted)
router.get('/:id/download-url', requireAuth, files.getDownloadUrl)
router.get('/:id/download-apk', requireAuth, files.downloadApk) // decrypted direct install (Android)
router.post('/:id/key', requireAuth, keyLimiter, validate({ body: files.keySchema }), files.getDecryptionKey)
router.post('/:id/game-license', requireAuth, keyLimiter, validate({ body: files.gameLicenseSchema }), files.getGameLicense)

export default router
