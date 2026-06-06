const { contextBridge, ipcRenderer } = require('electron')

// Expose a minimal, safe API to the renderer (no Node access in the page).
contextBridge.exposeInMainWorld('vigno', {
  config: () => ipcRenderer.invoke('config'),
  login: (creds) => ipcRenderer.invoke('login', creds),
  verify2fa: (p) => ipcRenderer.invoke('verify2fa', p),
  registerDevice: () => ipcRenderer.invoke('registerDevice'),
  library: () => ipcRenderer.invoke('library'),
  isDownloaded: (p) => ipcRenderer.invoke('isDownloaded', p),
  download: (p) => ipcRenderer.invoke('download', p),
  play: (p) => ipcRenderer.invoke('play', p),
  logout: () => ipcRenderer.invoke('logout'),
})
