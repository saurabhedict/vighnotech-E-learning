import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { Device } from '../models/Device.js'

// POST /devices/register — bind a device fingerprint (Doc 2 §7).
export const registerSchema = z.object({
  fingerprint: z.string().min(8).max(256), // hash of CPU/MB/OS from the launcher
  name: z.string().max(120).optional(),
})

export const registerDevice = asyncHandler(async (req, res) => {
  const { fingerprint, name } = req.body
  const device = await Device.findOneAndUpdate(
    { userId: req.user.id, fingerprint },
    { $set: { name: name || '', lastSeenAt: new Date() }, $setOnInsert: { userId: req.user.id, fingerprint } },
    { new: true, upsert: true }
  )
  audit(req, 'device.register', { targetType: 'Device', targetId: device._id })
  res.status(201).json({ deviceId: device._id, name: device.name })
})

// GET /devices/mine
export const myDevices = asyncHandler(async (req, res) => {
  const devices = await Device.find({ userId: req.user.id }).sort({ lastSeenAt: -1 }).lean()
  res.json({ devices: devices.map((d) => ({ id: d._id, name: d.name, lastSeenAt: d.lastSeenAt })) })
})
