import { Router } from 'express'
import multer from 'multer'
import { validate } from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import * as admin from '../controllers/admin.controller.js'
import * as lic from '../controllers/license.controller.js'
import * as settings from '../controllers/settings.controller.js'
import * as notif from '../controllers/notification.controller.js'
import * as filt from '../controllers/filters.controller.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } })

// Everything here is admin-only.
router.use(requireAuth, requireRole('admin'))

// Dashboard
router.get('/stats', admin.stats)
router.get('/audit', admin.recentAudit)
router.delete('/audit', admin.clearAuditLog)

// Reports + export (CSV / XLSX / PDF)
router.get('/reports/:type', admin.getReport)
router.get('/reports/:type/export', admin.exportReportHandler)

// Users (LLD: Admin Management — promote/demote with last-admin guard)
router.get('/users', admin.listUsers)
router.patch('/users/:id/role', validate({ body: admin.setUserRoleSchema }), admin.setUserRole)
router.delete('/users/:id', admin.deleteUser)

// Content tree (CMS)
router.get('/nodes', admin.listNodes)
router.post('/nodes', validate({ body: admin.createNodeSchema }), admin.createNode)
router.post('/nodes/reorder', validate({ body: admin.reorderSchema }), admin.reorderNodes)
router.patch('/nodes/:id', admin.updateNode)
router.post('/nodes/:id/upload-thumbnail', upload.single('file'), admin.uploadCourseThumbnail)
router.delete('/nodes/:id', admin.deleteNode)
router.get('/chapters/:chapterId/content', admin.listContentByChapter)

// Content files
router.post('/content', validate({ body: admin.createContentSchema }), admin.createContent)
router.patch('/content/:id', admin.updateContent)
router.delete('/content/:id', admin.deleteContent)
router.post('/content/:id/upload', upload.single('file'), admin.uploadContentFile)
router.post('/content/:id/upload-thumbnail', upload.single('file'), admin.uploadContentThumbnail)

// Standalone resources
router.post('/resources', admin.createStandaloneResource)
router.get('/resources', admin.listStandaloneResources)
router.delete('/resources/:id', admin.deleteStandaloneResource)
// Direct browser→S3 upload (stream lane): presign a URL, then confirm completion.
router.post('/content/:id/upload-url', admin.getContentUploadUrl)
router.post('/content/:id/upload-complete', validate({ body: admin.completeContentUploadSchema }), admin.completeContentUpload)

// License administration (list all / issue grant / revoke / unflag)
router.get('/licenses', lic.adminList)
router.post('/licenses/issue', validate({ body: lic.adminIssueSchema }), lic.adminIssue)
router.post('/licenses/:jti/revoke', lic.revoke)
router.post('/licenses/:jti/unflag', lic.unflag)

// Filters (dynamic categories used to classify courses/programs)
router.get('/filters', filt.list)
router.post('/filters', validate({ body: filt.createCategorySchema }), filt.createCategory)
router.patch('/filters/:id', validate({ body: filt.updateCategorySchema }), filt.updateCategory)
router.delete('/filters/:id', filt.deleteCategory)
router.post('/filters/:id/options', validate({ body: filt.addOptionSchema }), filt.addOption)
router.delete('/filters/:id/options/:optionId', filt.removeOption)

// Broadcast notifications (admin → everyone)
router.get('/notifications', notif.list)
router.post('/notifications', validate({ body: notif.createSchema }), notif.create)
router.delete('/notifications/:id', notif.remove)

// Coupons
router.get('/coupons', admin.listCoupons)
router.post('/coupons', validate({ body: admin.createCouponSchema }), admin.createCoupon)
router.delete('/coupons/:id', admin.deleteCoupon)

// Refunds (refund → revoke license + wallet credit)
router.post('/purchases/:id/refund', admin.refundPurchase)

// Site settings (branding + footer) — fully admin-editable, no code changes
router.put('/settings', validate({ body: settings.updateSettingsSchema }), settings.updateSettings)

export default router
