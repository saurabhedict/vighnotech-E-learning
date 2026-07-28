import { Router } from 'express'
import * as filters from '../controllers/filters.controller.js'

const router = Router()

// Public — used to build the catalog filter dropdowns.
router.get('/', filters.list)

export default router
