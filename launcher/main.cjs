// Vigno Launcher — Electron main process (download lane, Doc 2 §7).
// Implements: login (+2FA), device binding, encrypted download, license+device
// verify, server-gated key fetch, in-memory decrypt, and offline grace.
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const crypto = require('node:crypto')
const { spawn, execSync } = require('node:child_process')
const AdmZip = require('adm-zip')

const API = process.env.VIGNO_API || 'http://localhost:4000/api'
const DATA_DIR = path.join(app.getPath('userData'), 'vigno')
const DL_DIR = path.join(DATA_DIR, 'downloads')

const session = { token: null, user: null, deviceId: null }

const ensureDirs = () => fs.mkdirSync(DL_DIR, { recursive: true })
const encPath = (cid) => path.join(DL_DIR, `${cid}.enc`)

// Online-only build: decryption keys are NEVER cached. Wipe any key files left by
// older launcher versions (which used an offline grace cache) so none linger.
function wipeCachedKeys() {
  try {
    for (const f of fs.readdirSync(DATA_DIR)) {
      if (f.startsWith('grace_') && f.endsWith('.json')) {
        try { fs.unlinkSync(path.join(DATA_DIR, f)) } catch { /* */ }
      }
    }
  } catch { /* dir may not exist yet */ }
}

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

// Stable per-machine GUID (Windows). The in-game LicenseGuard reads the SAME
// value from the registry, so a token bound to this id won't validate elsewhere.
function machineGuid() {
  try {
    const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf8', windowsHide: true })
    const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/i)
    return m ? m[1].trim() : fingerprint() // non-Windows fallback
  } catch {
    return fingerprint()
  }
}

// Running games, so we can wipe their decrypted files on quit. { dir, child }
const activeRuns = new Set()
// maxRetries handles Windows briefly holding file locks right after the game exits
// (without it the delete silently fails and decrypted files linger).
const rmrf = (dir) => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 400 }) } catch { /* best-effort */ } }

// Delete EVERY leftover decrypted-game temp dir (from crashes, force-quits, or a
// failed cleanup), skipping any game that's currently running.
function sweepTempGames() {
  const active = new Set([...activeRuns].map((r) => r.dir))
  try {
    for (const name of fs.readdirSync(os.tmpdir())) {
      const full = path.join(os.tmpdir(), name)
      if (name.startsWith('vigno-game-') && !active.has(full)) rmrf(full)
    }
  } catch { /* */ }
}

// Find the game's main executable in an extracted Unity build: skip the crash
// handler, and prefer the <name>.exe that has a sibling <name>_Data folder.
function findGameExe(root) {
  const exes = []
  const walk = (d, depth) => {
    if (depth > 3) return
    let entries = []
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) walk(full, depth + 1)
      else if (e.name.toLowerCase().endsWith('.exe') && !/crashhandler/i.test(e.name)) exes.push(full)
    }
  }
  walk(root, 0)
  if (!exes.length) return null
  const unityMain = exes.find((exe) => fs.existsSync(path.join(path.dirname(exe), path.basename(exe, '.exe') + '_Data')))
  return unityMain || exes[0]
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
  wipeCachedKeys() // online-only: clear any keys cached by previous versions
  sweepTempGames() // remove any decrypted-game temp dirs left by a crash/force-quit
  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit())

// On quit, stop any running games and wipe their decrypted temp dirs.
app.on('before-quit', () => {
  for (const run of activeRuns) {
    try { run.child.kill() } catch { /* */ }
    rmrf(run.dir)
  }
  activeRuns.clear()
  sweepTempGames() // belt-and-suspenders: clear any stragglers
})

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

// Stream a URL to disk, reporting progress to the renderer (throttled). Writes to
// a .part file then renames, so a half-finished download is never mistaken for done.
async function streamToDisk(e, contentId, url, total) {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error('Download failed (storage)')
  total = total || Number(res.headers.get('content-length')) || 0
  const tmp = encPath(contentId) + '.part'
  const out = fs.createWriteStream(tmp)
  const reader = res.body.getReader()
  let received = 0, last = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r)) // backpressure
    received += value.length
    const now = Date.now()
    if (now - last > 250) { last = now; e.sender.send('download-progress', { contentId, received, total }) }
  }
  await new Promise((r, rej) => out.end((err) => (err ? rej(err) : r())))
  fs.renameSync(tmp, encPath(contentId))
  e.sender.send('download-progress', { contentId, received, total: total || received })
  return { bytes: received }
}

ipcMain.handle('download', async (e, { contentId }) => {
  ensureDirs()
  // Prefer a direct, presigned URL (streamed from S3 with progress). Fall back to
  // the through-the-server download for older backends (no progress).
  const meta = await api(`/content/${contentId}/download-url`, { token: session.token })
  if (meta.status === 200 && meta.data?.url) {
    return streamToDisk(e, contentId, meta.data.url, meta.data.sizeBytes || 0)
  }
  if (meta.status !== 404) throw new Error(meta.data?.error?.message || 'Download failed (do you own it?)')
  const r = await api(`/content/${contentId}/download`, { token: session.token, raw: true })
  if (r.status !== 200) throw new Error(r.data?.error?.message || 'Download failed (do you own it?)')
  fs.writeFileSync(encPath(contentId), r.buf)
  return { bytes: r.buf.length }
})

ipcMain.handle('isDownloaded', (_e, { contentId }) => fs.existsSync(encPath(contentId)))

/**
 * Play (ONLINE-ONLY): verify license + device, fetch the server-gated key, and
 * decrypt the ciphertext IN MEMORY. The key is never written to disk — so a live
 * server check is required every time and no key file exists for anyone to read.
 */
ipcMain.handle('play', async (_e, { contentId, jti }) => {
  if (!fs.existsSync(encPath(contentId))) throw new Error('Not downloaded yet')

  // Online-only by design: the decryption key is fetched fresh on every play and
  // kept IN MEMORY ONLY — never written to disk. So there is no cached key file for
  // anyone to read; the title cannot run without a live server check.
  let licenseToken
  try {
    const t = await api(`/licenses/${jti}/refresh`, { method: 'POST', token: session.token })
    if (t.status !== 200) throw new Error(t.data?.error?.message || 'License refresh failed')
    licenseToken = t.data.token
  } catch (e) {
    throw new Error(`You must be online to play — couldn't reach the licence server. (${e.message})`)
  }

  const v = await api('/licenses/verify', { method: 'POST', body: { token: licenseToken, deviceId: session.deviceId } })
  if (!v.data?.valid) throw new Error(`License ${v.data?.reason || 'invalid'}`)
  const k = await api(`/content/${contentId}/key`, { method: 'POST', token: session.token, body: { token: licenseToken, deviceId: session.deviceId } })
  if (k.status !== 200) throw new Error(k.data?.error?.message || 'Key denied')
  const keyInfo = { key: k.data.key, iv: k.data.iv, tag: k.data.tag }

  // Device-bound in-game token (LicenseGuard verifies the machine) — also not cached.
  let gameLic = null
  try {
    const gl = await api(`/content/${contentId}/game-license`, { method: 'POST', token: session.token, body: { deviceId: session.deviceId, machineId: machineGuid() } })
    if (gl.status === 200) gameLic = { token: gl.data.token, fileName: gl.data.fileName }
  } catch { /* optional — older backend / unguarded game */ }
  const online = true

  const ct = fs.readFileSync(encPath(contentId))
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyInfo.key, 'base64'), Buffer.from(keyInfo.iv, 'base64'))
  d.setAuthTag(Buffer.from(keyInfo.tag, 'base64'))
  const plain = Buffer.concat([d.update(ct), d.final()]) // the decrypted game ZIP, in memory

  // Extract the decrypted ZIP to a throwaway temp dir and launch the game. The
  // decrypted files exist on disk ONLY while the game runs — we delete them when it
  // exits (and on launcher quit). At rest, only the encrypted .enc remains.
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vigno-game-'))
  try {
    new AdmZip(plain).extractAllTo(workDir, /* overwrite */ true)
  } catch (e) {
    rmrf(workDir)
    throw new Error(`Could not unpack the title: ${e.message}`)
  }
  const exe = findGameExe(workDir)
  if (!exe) { rmrf(workDir); throw new Error('No runnable .exe found in this title') }

  // Drop the device-bound license token into the game's _Data dir (disguised name)
  // so its LicenseGuard can verify THIS machine at startup. No-op for unguarded games.
  if (gameLic?.token && gameLic?.fileName) {
    try {
      const dataDir = path.join(path.dirname(exe), `${path.basename(exe, '.exe')}_Data`)
      const target = fs.existsSync(dataDir) ? dataDir : path.dirname(exe)
      fs.writeFileSync(path.join(target, gameLic.fileName), gameLic.token)
    } catch { /* best-effort */ }
  }

  const child = spawn(exe, [], { cwd: path.dirname(exe), detached: false, stdio: 'ignore', windowsHide: false })
  const run = { dir: workDir, child }
  activeRuns.add(run)
  const cleanup = () => { activeRuns.delete(run); rmrf(workDir) } // wipe decrypted files on exit
  child.on('exit', cleanup)
  child.on('error', cleanup)

  return { ok: true, online, launched: true, exe: path.basename(exe) }
})

ipcMain.handle('logout', () => {
  // End any running games and wipe every decrypted temp dir (incl. app.dat) so
  // nothing licensed to this session survives the logout.
  for (const run of activeRuns) {
    try { run.child.kill() } catch { /* */ }
    rmrf(run.dir)
  }
  activeRuns.clear()
  sweepTempGames()
  session.token = null
  session.user = null
  session.deviceId = null
  return { ok: true }
})
