import { Router } from 'express'
import * as files from '../controllers/files.controller.js'

// Mounted at /api/files. The stream endpoint is public but requires a valid,
// unexpired signed token (issued only after an ownership check).
const router = Router()

router.get('/:contentId/stream', files.streamFile)

export default router
