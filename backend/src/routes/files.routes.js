import { Router } from 'express'
import * as files from '../controllers/files.controller.js'

// Mounted at /api/files. The stream endpoint is public but requires a valid,
// unexpired signed token (issued only after an ownership check).
const router = Router()

router.get('/local/:storageKey', files.streamLocalFile)
router.get('/:contentId/stream', files.streamFile)
// Adaptive HLS bundle (master/variant playlists + segments), one asset per request.
router.get('/:contentId/hls/:asset', files.streamHlsAsset)

export default router
