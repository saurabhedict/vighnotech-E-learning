import { Router } from 'express'
import { getSettings } from '../controllers/settings.controller.js'

// Public site settings (branding + footer) — consumed by the footer/site.
const router = Router()
router.get('/', getSettings)
export default router
