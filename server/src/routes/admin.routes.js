import { Router } from 'express'
import multer from 'multer'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import * as admin from '../controllers/admin.controller.js'
import * as lic from '../controllers/license.controller.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } })

// Everything here is admin-only.
router.use(requireAuth, requireRole('admin'))

// Dashboard
router.get('/stats', admin.stats)
router.get('/audit', admin.recentAudit)

// Content tree (CMS)
router.post('/nodes', validate({ body: admin.createNodeSchema }), admin.createNode)
router.patch('/nodes/:id', admin.updateNode)
router.delete('/nodes/:id', admin.deleteNode)
router.post('/nodes/reorder', validate({ body: admin.reorderSchema }), admin.reorderNodes)

// Content files
router.post('/content', validate({ body: admin.createContentSchema }), admin.createContent)
router.patch('/content/:id', admin.updateContent)
router.delete('/content/:id', admin.deleteContent)
router.post('/content/:id/upload', upload.single('file'), admin.uploadContentFile)

// License administration (issue grant / revoke for refunds & fraud)
router.post('/licenses/issue', validate({ body: lic.adminIssueSchema }), lic.adminIssue)
router.post('/licenses/:jti/revoke', lic.revoke)

export default router
