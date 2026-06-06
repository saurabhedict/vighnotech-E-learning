import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { verifyLimiter } from '../middleware/rateLimit.js'
import * as files from '../controllers/files.controller.js'

// Mounted at /api/content. Authenticated, ownership-gated content actions.
const router = Router()

router.get('/:id/stream-url', requireAuth, files.getStreamUrl)
router.get('/:id/drm-token', requireAuth, files.getDrmToken)
router.get('/:id/download', requireAuth, files.downloadEncrypted)
router.post('/:id/key', requireAuth, verifyLimiter, validate({ body: files.keySchema }), files.getDecryptionKey)

export default router
