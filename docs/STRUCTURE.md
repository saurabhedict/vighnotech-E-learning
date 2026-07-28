# Project Structure

A monorepo-style layout with three packages (`frontend`, `backend`, `shared`)
plus docs, all under `Project/`.

```
Project/
├── README.md                  # top-level overview + quickstart
├── package.json               # convenience scripts (install/dev/seed/test all parts)
├── .gitignore                 # global ignores (node_modules, dist, .env, secrets)
│
├── frontend/                  # React + Vite web app (was the repo root)
│   ├── index.html
│   ├── package.json           # depends on @vigno/shared (file:../shared)
│   ├── vite.config.js · tailwind.config.js · postcss.config.js
│   ├── public/sample-notes.pdf
│   └── src/
│       ├── api/               # axios client + per-domain API modules
│       ├── store/             # Redux (auth w/ persistence, ui)
│       ├── components/        # layout, players, BuyButton, guards
│       ├── pages/             # Login, Signup, Home, ModuleView, ContentViewer,
│       │   └── admin/         #   Library, Profile, admin/AdminDashboard
│       ├── hooks/ · lib/      # data hooks, buy flow, device fingerprint
│       └── main.jsx · index.css
│
├── backend/                   # Express API + License Authority (was server/)
│   ├── package.json           # depends on @vigno/shared (file:../shared)
│   ├── .env.example
│   └── src/
│       ├── config/            # env (+ startup guards), db (in-memory fallback)
│       ├── models/            # User, TreeNode, Content, Purchase, License, Device, AuditLog
│       ├── middleware/        # auth/RBAC, validate, rateLimit, error
│       ├── services/          # keystore, licenseAuthority, signedUrl, payments, storage, contentTree
│       ├── controllers/       # auth, courses, payments, license, files, devices, admin
│       ├── routes/ · utils/   # route definitions, helpers
│       ├── seed/              # demo data (admin + aviation tree)
│       └── scripts/           # smoketest.js (38 checks), genKeys.js
│
├── launcher/                  # Electron desktop app (download lane)
│   ├── main.cjs · preload.cjs · index.html · renderer.js
│   └── (login, device binding, encrypted download, verify, decrypt-in-memory, offline grace)
│
├── shared/                    # @vigno/shared — domain constants (single source of truth)
│   └── src/{index,constants}.js
│
└── docs/
    ├── ARCHITECTURE.md
    ├── STRUCTURE.md           # (this file)
    ├── DEPLOYMENT.md
    └── design/               # the original HLD / Detailed / LLD PDFs
        ├── Plan-1/ · Plan-2/ · LLD-Design/
```

## Not committed (gitignored)

`**/node_modules`, `**/dist`, `**/.env`, `backend/keys/` (generated signing keys),
`backend/storage/` (uploaded objects). Each package keeps its own deps.

## Why `shared/`

Enums and the API vocabulary (roles, lanes, content types, license/purchase
statuses, license claim names) live once in `@vigno/shared` and are imported by
both `frontend` and `backend` as a local `file:` dependency — so the contract and
the UI can never drift apart.
