# AeroLearn — Aviation Training Platform (Frontend)

Frontend of the AeroLearn aviation e-learning platform. Data comes from a mock layer that
**already calls a real backend via Axios** and falls back to mock data until the
API is running — so swapping to live data is a config change, not a rewrite.

## Tech stack
- **Node.js + npm**, **Vite** — tooling, dev server, build
- **React 18** — components (`components/`, `pages/`)
- **React Router 6** — routing (login → course → module → content viewer)
- **Tailwind CSS 3** — styling (`vigno` theme in `tailwind.config.js`)
- **TanStack Query 5** — data fetching/caching (`hooks/useContent.js`)
- **Redux Toolkit + react-redux** — global state: login, theme, selected course (`src/store/`)
- **Axios** — API client with auth-token + error interceptors (`api/axiosClient.js`)
- **Plyr + HLS.js** — secure adaptive video player (`components/VideoPlayer.jsx`)
- **PDF.js (pdfjs-dist)** — in-browser PDF rendering, download disabled (`components/PdfViewer.jsx`)
- env via Vite `import.meta.env` (`.env.example`)

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Try it
1. Sign in (Redux stores auth) → you land on PPL Ground course.
2. Open a **video** item → adaptive HLS stream in Plyr (right-click + download disabled, watermarked).
3. Open a **PDF (notes)** item → rendered by PDF.js to canvas (no download button), watermarked.
4. Toggle **theme** (navbar) and switch **course** (sidebar) → both held in Redux.

## Courses in mock data
- PPL_Ground, PPL_Flight, CPL_Ground, CPL_Flight
- ATPL_Ground, ATPL_Flight, IR_Training
- MCC_Course, CRM_Training, Dispatch_Ops, Cabin_Crew, ATC_Basics

## Structure
```
src/store/            # Redux Toolkit: store, authSlice, uiSlice
src/api/axiosClient.js# Axios instance + interceptors
src/api/mockApi.js    # tries Axios, falls back to mock
src/components/VideoPlayer.jsx  # Plyr + HLS.js
src/components/PdfViewer.jsx    # PDF.js
src/pages/ContentViewer.jsx     # routes content type → correct viewer
public/sample-notes.pdf         # sample PDF for the viewer
```

Notes: the HLS video uses a public test stream (needs internet). State resets on
refresh (no persistence yet). Backend, auth API, payments and license system come next.
