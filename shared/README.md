# @vigno/shared

Shared domain constants used by **both** the frontend and the backend, so the
API contract and the UI can never drift apart.

Consumed as a local file dependency (no publishing needed):

```jsonc
// frontend/package.json and backend/package.json
"dependencies": { "@vigno/shared": "file:../shared" }
```

```js
import { ROLES, LANES, CONTENT_TYPES, LICENSE_STATUS } from '@vigno/shared'
```

Exports: `ROLES`, `USER_ROLES`, `LANES`, `CONTENT_LANES`, `CONTENT_TYPES`,
`LICENSE_STATUS`, `LICENSE_TYPES`, `PURCHASE_STATUS`, `LICENSE_CLAIMS`,
`defaultLaneForType()`.
