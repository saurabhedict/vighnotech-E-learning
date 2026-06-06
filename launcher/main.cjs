// Vigno Launcher — Electron main process (download lane, Doc 2 §7).
// Implements: login (+2FA), device binding, encrypted download, license+device
// verify, server-gated key fetch, in-memory decrypt, and offline grace.
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const crypto = require('node:crypto')

const API = process.env.VIGNO_API || 'http://localhost:4000/api'
const GRACE_DAYS = 7
const DATA_DIR = path.join(app.getPath('userData'), 'vigno')
const DL_DIR = path.join(DATA_DIR, 'downloads')

const session = { token: null, user: null, deviceId: null }

const ensureDirs = () => fs.mkdirSync(DL_DIR, { recursive: true })
const encPath = (cid) => path.join(DL_DIR, `${cid}.enc`)
const gracePath = (cid) => path.join(DATA_DIR, `grace_${cid}.json`)

async function api(pathname, { method = 'GET', token, body, raw } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${pathname}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (raw) return { status: res.status, buf: Buffer.from(await res.arrayBuffer()) }
  let data = null
  try { data = await res.json() } catch { /* */ }
  return { status: res.status, data }
}

// Device fingerprint: hash of stable host/CPU/OS identifiers (console "home device").
function fingerprint() {
  const raw = [os.hostname(), os.platform(), os.arch(), (os.cpus()[0] || {}).model, os.totalmem()].join('|')
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 880,
    height: 680,
    title: 'Vigno Launcher',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  win.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(() => {
  ensureDirs()
  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit())

// ── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle('config', () => ({ api: API, host: os.hostname() }))

ipcMain.handle('login', async (_e, { email, password }) => {
  const r = await api('/auth/login', { method: 'POST', body: { email, password } })
  if (r.data?.twoFARequired) return { twoFA: true, challenge: r.data.challenge, method: r.data.method }
  if (r.status !== 200) throw new Error(r.data?.error?.message || 'Login failed')
  session.token = r.data.token
  session.user = r.data.user
  return { user: r.data.user }
})

ipcMain.handle('verify2fa', async (_e, { challenge, code }) => {
  const r = await api('/auth/2fa/verify', { method: 'POST', body: { challenge, code } })
  if (r.status !== 200) throw new Error(r.data?.error?.message || 'Invalid code')
  session.token = r.data.token
  session.user = r.data.user
  return { user: r.data.user }
})

ipcMain.handle('registerDevice', async () => {
  const r = await api('/devices/register', {
    method: 'POST',
    token: session.token,
    body: { fingerprint: fingerprint(), name: `${os.hostname()} (${os.platform()})` },
  })
  if (r.status !== 201) throw new Error('Device registration failed')
  session.deviceId = r.data.deviceId
  return { deviceId: r.data.deviceId }
})

ipcMain.handle('library', async () => {
  const r = await api('/licenses/mine', { token: session.token })
  return (r.data?.licenses || []).filter((l) => l.type === 'download' && l.content)
})

ipcMain.handle('download', async (_e, { contentId }) => {
  ensureDirs()
  const r = await api(`/content/${contentId}/download`, { token: session.token, raw: true })
  if (r.status !== 200) throw new Error('Download failed (do you own it?)')
  fs.writeFileSync(encPath(contentId), r.buf) // stays ENCRYPTED on disk
  return { bytes: r.buf.length }
})

ipcMain.handle('isDownloaded', (_e, { contentId }) => fs.existsSync(encPath(contentId)))

/**
 * Play: verify license + device (online), fetch the server-gated key, decrypt
 * the ciphertext IN MEMORY. Caches the key within a grace window so the title
 * still runs offline on this home device (console-style).
 */
ipcMain.handle('play', async (_e, { contentId, jti }) => {
  if (!fs.existsSync(encPath(contentId))) throw new Error('Not downloaded yet')
  let keyInfo
  let online = true
  try {
    const t = await api(`/licenses/${jti}/refresh`, { method: 'POST', token: session.token })
    if (t.status !== 200) throw new Error('refresh failed')
    const licenseToken = t.data.token
    const v = await api('/licenses/verify', { method: 'POST', body: { token: licenseToken, deviceId: session.deviceId } })
    if (!v.data?.valid) throw new Error(`License ${v.data?.reason || 'invalid'}`)
    const k = await api(`/content/${contentId}/key`, { method: 'POST', token: session.token, body: { token: licenseToken, deviceId: session.deviceId } })
    if (k.status !== 200) throw new Error(k.data?.error?.message || 'Key denied')
    keyInfo = { key: k.data.key, iv: k.data.iv, tag: k.data.tag }
    fs.writeFileSync(gracePath(contentId), JSON.stringify({ ...keyInfo, at: Date.now() }))
  } catch (e) {
    // Offline grace: use cached key if within the window.
    online = false
    if (!fs.existsSync(gracePath(contentId))) throw new Error(`Offline and no cached entitlement: ${e.message}`)
    const g = JSON.parse(fs.readFileSync(gracePath(contentId), 'utf8'))
    if (Date.now() - g.at > GRACE_DAYS * 86400000) throw new Error('Offline grace expired — go online to re-verify')
    keyInfo = g
  }

  const ct = fs.readFileSync(encPath(contentId))
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyInfo.key, 'base64'), Buffer.from(keyInfo.iv, 'base64'))
  d.setAuthTag(Buffer.from(keyInfo.tag, 'base64'))
  const plain = Buffer.concat([d.update(ct), d.final()]) // decrypted in memory only
  // A real launcher would spawn/run the decrypted binary; we report success and
  // never persist the plaintext (on close, only the encrypted file remains).
  return { ok: true, online, sizeBytes: plain.length, preview: plain.slice(0, 48).toString('utf8') }
})

ipcMain.handle('logout', () => {
  session.token = null
  session.user = null
  session.deviceId = null
  return { ok: true }
})
