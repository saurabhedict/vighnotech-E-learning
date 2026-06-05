# Vigno Smart Class — Frontend (Web App)

React + Vite single-page app for the license-based learning platform. Talks to the
[backend](../backend) API and shares domain constants via [`@vigno/shared`](../shared).

## Run

```bash
npm install        # links @vigno/shared (file:../shared)
npm run dev        # http://localhost:5173
npm run build
npm run preview
```

Set `VITE_API_BASE_URL` in `.env` if the API isn't at `http://localhost:4000/api`
(see `.env.example`). The mock data layer falls back to demo content only on a true
network failure, so real API errors surface normally.

## Tech

React 18 · React Router 6 · Redux Toolkit (auth w/ persistence) · TanStack Query 5 ·
Axios (Bearer + cookies + silent refresh) · Tailwind 3 (`vigno` theme) · Plyr + HLS.js
(secure video) · PDF.js (in-browser PDF, download disabled).

## Layout

```
src/
├── api/         axios client + per-domain modules (auth, payments, license, devices, admin)
├── store/       Redux: authSlice (persisted), uiSlice
├── components/  AppLayout, Navbar, Sidebar, players, BuyButton, RequireAdmin
├── pages/       Login, Signup, Home, ModuleView, ContentViewer, Library, Profile, admin/
├── hooks/ lib/  data hooks, buy flow, device fingerprint
└── main.jsx · index.css
```
