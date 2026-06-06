import crypto from 'node:crypto'
import { describe, it, expect } from 'vitest'
import ms from '../src/utils/ms.js'
import { slugify } from '../src/utils/slugify.js'
import { createSignedToken, verifySignedToken } from '../src/services/signedUrl.js'
import { deriveContentKey, newSalt } from '../src/services/contentCrypto.js'
import { Coupon } from '../src/models/Coupon.js'

describe('ms() duration parser', () => {
  it('parses units', () => {
    expect(ms('15m')).toBe(900_000)
    expect(ms('7d')).toBe(604_800_000)
    expect(ms('30s')).toBe(30_000)
    expect(ms(5000)).toBe(5000)
  })
  it('throws on garbage (no silent zero)', () => {
    expect(() => ms('1w')).toThrow()
    expect(() => ms('nope')).toThrow()
  })
})

describe('slugify', () => {
  it('keeps underscore style', () => {
    expect(slugify('PPL Ground & Theory')).toBe('PPL_Ground_Theory')
    expect(slugify('  Hello  World  ')).toBe('Hello_World')
  })
})

describe('signed URLs', () => {
  it('round-trips and binds content + key', () => {
    const t = createSignedToken({ contentId: 'c1', storageKey: 'obj_x', userId: 'u1', ttlSec: 60 })
    const r = verifySignedToken(t)
    expect(r.valid).toBe(true)
    expect(r.payload.c).toBe('c1')
    expect(r.payload.k).toBe('obj_x')
  })
  it('rejects tampered token', () => {
    const t = createSignedToken({ contentId: 'c1', storageKey: 'obj_x', userId: 'u1' })
    expect(verifySignedToken(t.slice(0, -3) + 'aaa').valid).toBe(false)
  })
  it('rejects expired token', () => {
    const t = createSignedToken({ contentId: 'c1', storageKey: 'obj_x', userId: 'u1', ttlSec: -1 })
    expect(verifySignedToken(t).valid).toBe(false)
  })
})

describe('content key derivation + AES-256-GCM round trip', () => {
  it('is deterministic for the same (id, salt)', () => {
    const salt = newSalt()
    expect(deriveContentKey('abc', salt).equals(deriveContentKey('abc', salt))).toBe(true)
    expect(deriveContentKey('abc', salt).equals(deriveContentKey('abc', newSalt()))).toBe(false)
  })
  it('encrypts and decrypts back to the original', () => {
    const salt = newSalt()
    const key = deriveContentKey('content-1', salt)
    const iv = crypto.randomBytes(12)
    const plain = Buffer.from('secret game bytes')
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const ct = Buffer.concat([cipher.update(plain), cipher.final()])
    const tag = cipher.getAuthTag()
    const dec = crypto.createDecipheriv('aes-256-gcm', deriveContentKey('content-1', salt), iv)
    dec.setAuthTag(tag)
    expect(Buffer.concat([dec.update(ct), dec.final()]).equals(plain)).toBe(true)
  })
})

describe('Coupon.evaluate', () => {
  it('computes percent + flat discounts', () => {
    expect(new Coupon({ kind: 'percent', value: 20, active: true }).evaluate(500)).toMatchObject({ usable: true, discount: 100, finalAmount: 400 })
    expect(new Coupon({ kind: 'flat', value: 150, active: true }).evaluate(500)).toMatchObject({ usable: true, discount: 150, finalAmount: 350 })
  })
  it('never discounts below zero', () => {
    expect(new Coupon({ kind: 'flat', value: 999, active: true }).evaluate(300).finalAmount).toBe(0)
  })
  it('rejects inactive / expired / exhausted', () => {
    expect(new Coupon({ kind: 'percent', value: 10, active: false }).evaluate(100).usable).toBe(false)
    expect(new Coupon({ kind: 'percent', value: 10, active: true, expiresAt: new Date(Date.now() - 1000) }).evaluate(100).usable).toBe(false)
    expect(new Coupon({ kind: 'percent', value: 10, active: true, maxRedemptions: 2, redeemed: 2 }).evaluate(100).usable).toBe(false)
  })
})
