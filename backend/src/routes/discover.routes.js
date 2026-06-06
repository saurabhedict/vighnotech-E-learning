import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import * as d from '../controllers/discover.controller.js'

// Mounted at /api. Discovery & personalization (all require auth).
const router = Router()

// Search (auth so it can be personalized later; browsing tree stays public)
router.get('/search', requireAuth, validate({ query: d.searchSchema }), d.search)

// Favorites
router.get('/favorites/mine', requireAuth, d.myFavorites)
router.get('/favorites/ids', requireAuth, d.myFavoriteIds)
router.post('/favorites/:contentId', requireAuth, d.addFavorite)
router.delete('/favorites/:contentId', requireAuth, d.removeFavorite)

// Progress (recently viewed / continue watching)
router.get('/progress/mine', requireAuth, d.myProgress)
router.post('/progress/:contentId', requireAuth, validate({ body: d.progressSchema }), d.upsertProgress)

// Recommended
router.get('/recommended', requireAuth, d.recommended)

export default router
