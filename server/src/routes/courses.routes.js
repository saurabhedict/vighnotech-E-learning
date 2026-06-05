import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import * as c from '../controllers/courses.controller.js'

const router = Router()

// Browsing is public; optionalAuth lets owned paid content unlock when logged in.
router.get('/courses', c.listCourses)
router.get('/courses/:className/tree', c.courseTree)
router.get('/courses/:className/modules/:moduleId', c.moduleView)
router.get('/contents/:contentId', optionalAuth, c.getContent)

export default router
