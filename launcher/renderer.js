const $ = (id) => document.getElementById(id)
const log = (m) => { $('log').textContent += `${new Date().toLocaleTimeString()}  ${m}\n`; $('log').scrollTop = 1e9 }
let challenge = null

vigno.config().then((c) => ($('apiInfo').textContent = `· ${c.api}`))

$('loginBtn').onclick = async () => {
  $('loginErr').textContent = ''
  try {
    if (challenge) {
      await vigno.verify2fa({ challenge, code: $('code').value.trim() })
      challenge = null
    } else {
      const r = await vigno.login({ email: $('email').value.trim(), password: $('password').value })
      if (r.twoFA) {
        challenge = r.challenge
        $('twoFA').classList.remove('hidden')
        $('loginErr').textContent = 'Enter your 2FA code, then Sign in again.'
        return
      }
    }
    log('Signed in. Registering this device…')
    const d = await vigno.registerDevice()
    log(`Device bound: ${d.deviceId}`)
    await showLibrary()
  } catch (e) {
    $('loginErr').textContent = e.message
  }
}

$('logoutBtn').onclick = async () => {
  await vigno.logout()
  challenge = null
  $('libCard').classList.add('hidden')
  $('loginCard').classList.remove('hidden')
  $('twoFA').classList.add('hidden')
  log('Logged out.')
}

async function showLibrary() {
  $('loginCard').classList.add('hidden')
  $('libCard').classList.remove('hidden')
  const items = await vigno.library()
  const lib = $('lib')
  lib.innerHTML = ''
  if (!items.length) { lib.innerHTML = '<p class="muted">No downloadable titles owned yet. Buy a game/software item in the web app.</p>'; return }
  for (const it of items) {
    const downloaded = await vigno.isDownloaded({ contentId: it.content.id })
    const row = document.createElement('div')
    row.className = 'row'
    row.innerHTML = `<div class="grow">🎮 <b>${it.content.title}</b> <span class="badge">${it.status}</span>
      <div class="muted">expires ${new Date(it.expiresAt).toLocaleDateString()}</div></div>`
    const dl = document.createElement('button'); dl.className = 'ghost'; dl.textContent = downloaded ? 'Re-download' : 'Download'
    const play = document.createElement('button'); play.textContent = '▶ Play'; play.disabled = !downloaded
    dl.onclick = async () => {
      dl.disabled = true; log(`Downloading "${it.content.title}" (encrypted)…`)
      try { const r = await vigno.download({ contentId: it.content.id }); log(`Downloaded ${r.bytes} encrypted bytes.`); play.disabled = false; dl.textContent = 'Re-download' }
      catch (e) { log(`✗ ${e.message}`) } finally { dl.disabled = false }
    }
    play.onclick = async () => {
      play.disabled = true; log(`Verifying license + device for "${it.content.title}"…`)
      try {
        const r = await vigno.play({ contentId: it.content.id, jti: it.jti })
        log(`✓ Decrypted in memory (${r.sizeBytes} bytes, ${r.online ? 'online' : 'offline grace'}). Launching… [${r.preview.replace(/\n/g, ' ')}]`)
      } catch (e) { log(`✗ ${e.message}`) } finally { play.disabled = false }
    }
    row.append(dl, play)
    lib.appendChild(row)
  }
}
