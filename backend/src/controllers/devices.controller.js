import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { forbidden, notFound } from '../utils/ApiError.js'
import { env } from '../config/env.js'
import { Device } from '../models/Device.js'
import { License } from '../models/License.js'

// POST /devices/register — bind a device fingerprint (Doc 2 §7).
export const registerSchema = z.object({
  fingerprint: z.string().min(8).max(256), // hash of CPU/MB/OS from the launcher
  name: z.string().max(120).optional(),
})

export const registerDevice = asyncHandler(async (req, res) => {
  const { fingerprint, name } = req.body
  const existing = await Device.findOne({ userId: req.user.id, fingerprint })

  // Enforce the "home devices" cap for NEW devices only (re-registering a known
  // device is always fine). Deauthorize one to free a slot for a new machine.
  if (!existing) {
    const count = await Device.countDocuments({ userId: req.user.id })
    if (count >= env.security.maxDevicesPerUser) {
      throw forbidden(
        `Device limit reached (${env.security.maxDevicesPerUser}). Remove a device under Profile → Devices to add this one.`
      )
    }
  }

  const device = await Device.findOneAndUpdate(
    { userId: req.user.id, fingerprint },
    { $set: { name: name || '', lastSeenAt: new Date() }, $setOnInsert: { userId: req.user.id, fingerprint } },
    { new: true, upsert: true }
  )
  audit(req, 'device.register', { targetType: 'Device', targetId: device._id, meta: { new: !existing } })
  res.status(201).json({ deviceId: device._id, name: device.name })
})

// GET /devices/mine
export const myDevices = asyncHandler(async (req, res) => {
  const devices = await Device.find({ userId: req.user.id }).sort({ lastSeenAt: -1 }).lean()
  res.json({
    devices: devices.map((d) => ({ id: d._id, name: d.name, lastSeenAt: d.lastSeenAt })),
    max: env.security.maxDevicesPerUser,
  })
})

// DELETE /devices/:id — deauthorize a device. Frees a slot AND unbinds any
// download-lane license tied to it, so the title can re-activate on a new machine.
export const deauthorizeDevice = asyncHandler(async (req, res) => {
  const device = await Device.findOne({ _id: req.params.id, userId: req.user.id })
  if (!device) throw notFound('Device not found')

  // Unbind licenses bound to this device so they can re-bind on first use elsewhere.
  const unbound = await License.updateMany(
    { userId: req.user.id, deviceId: device._id },
    { $set: { deviceId: null } }
  )
  await device.deleteOne()
  audit(req, 'device.deauthorize', { targetType: 'Device', targetId: device._id, meta: { unboundLicenses: unbound.modifiedCount } })
  res.json({ ok: true, unboundLicenses: unbound.modifiedCount })
})
