import { createSlice } from '@reduxjs/toolkit'
import { logout, setCredentials, login } from './authSlice'

const KEY_PREFIX = 'vigno.cart.'

function getKey(userId) {
  return userId ? `${KEY_PREFIX}${userId}` : `${KEY_PREFIX}guest`
}

// Try to resolve userId from localStorage auth on cold start
function resolveUserIdFromStorage() {
  try {
    const raw = localStorage.getItem('vigno.auth')
    if (!raw) return null
    return JSON.parse(raw)?._id || JSON.parse(raw)?.id || null
  } catch {
    return null
  }
}

function loadPersisted(userId) {
  try {
    const key = getKey(userId)
    const raw = localStorage.getItem(key)
    if (!raw) return { items: [] }
    return { items: JSON.parse(raw) }
  } catch {
    return { items: [] }
  }
}

function persist(userId, items) {
  try {
    const key = getKey(userId)
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    /* ignore quota/private-mode errors */
  }
}

// On first load, try to restore from the currently logged-in user's stored cart, or guest cart
const coldUserId = resolveUserIdFromStorage()

const cartSlice = createSlice({
  name: 'cart',
  initialState: { ...loadPersisted(coldUserId), _userId: coldUserId },
  reducers: {
    addCartItem(state, action) {
      const item = action.payload
      // prevent duplicates
      if (!state.items.find((i) => i.id === item.id)) {
        state.items.push(item)
        persist(state._userId, state.items)
      }
    },
    removeCartItem(state, action) {
      state.items = state.items.filter((i) => i.id !== action.payload)
      persist(state._userId, state.items)
    },
    clearCart(state) {
      state.items = []
      persist(state._userId, [])
    },
  },
  extraReducers: (builder) => {
    // On login / setCredentials: load that user's saved cart and merge with any guest items
    builder.addCase(setCredentials, (state, action) => {
      const userId = action.payload.user?._id || action.payload.user?.id || null
      
      const guestItems = loadPersisted(null).items
      const userItems = loadPersisted(userId).items
      
      // Merge guest cart items into user cart items (preventing duplicates)
      const mergedItems = [...userItems]
      guestItems.forEach(gItem => {
        if (!mergedItems.some(uItem => uItem.id === gItem.id)) {
          mergedItems.push(gItem)
        }
      })
      
      state._userId = userId
      state.items = mergedItems
      
      persist(userId, mergedItems)
      persist(null, []) // Clear guest cart
    })

    builder.addCase(login, (state, action) => {
      const userId = action.payload?._id || action.payload?.id || null
      
      const guestItems = loadPersisted(null).items
      const userItems = loadPersisted(userId).items
      
      // Merge guest cart items into user cart items (preventing duplicates)
      const mergedItems = [...userItems]
      guestItems.forEach(gItem => {
        if (!mergedItems.some(uItem => uItem.id === gItem.id)) {
          mergedItems.push(gItem)
        }
      })
      
      state._userId = userId
      state.items = mergedItems
      
      persist(userId, mergedItems)
      persist(null, []) // Clear guest cart
    })

    // On logout: keep the items persisted under the user key (so they come back on next login)
    // clear active items from redux state, and clear the guest cart
    builder.addCase(logout, (state) => {
      state.items = []
      state._userId = null
      persist(null, []) // Clear guest cart
    })
  },
})

export const { addCartItem, removeCartItem, clearCart } = cartSlice.actions
export default cartSlice.reducer