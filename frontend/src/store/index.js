import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import uiReducer from './uiSlice'
import cartReducer from './cartSlice'
 
export const store = configureStore({
  reducer: { auth: authReducer, ui: uiReducer, cart: cartReducer },
})