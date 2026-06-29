import { createSlice } from '@reduxjs/toolkit'
import { logout } from './authSlice'

const STORAGE_KEY = 'vigno.cart'

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { items: [] }
    return { items: JSON.parse(raw) }
  } catch {
    return { items: [] }
  }
}

function persist(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota/private-mode errors */
  }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: loadPersisted(),
  reducers: {
    addCartItem(state, action) {
      const item = action.payload
      // prevent duplicates
      if (!state.items.find((i) => i.id === item.id)) {
        state.items.push(item)
        persist(state.items)
      }
    },
    removeCartItem(state, action) {
      state.items = state.items.filter((i) => i.id !== action.payload)
      persist(state.items)
    },
    clearCart(state) {
      state.items = []
      persist([])
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, (state) => {
      state.items = []
      persist([])
    })
  },
})

export const { addCartItem, removeCartItem, clearCart } = cartSlice.actions
export default cartSlice.reducer