import { Router } from 'express'
import { getSettings, downloadLauncher } from '../controllers/settings.controller.js'

// Public site settings (branding + footer) — consumed by the footer/site.
const router = Router()
router.get('/', getSettings)
// Public: redirect to the launcher installer download (S3-hosted, presigned).
router.get('/launcher-download', downloadLauncher)
export default router
