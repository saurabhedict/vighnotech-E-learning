import { createSlice } from '@reduxjs/toolkit'

// Global UI state: theme + currently selected class.
const uiSlice = createSlice({
  name: 'ui',
  initialState: { theme: 'dark', selectedClass: 'PPL_Ground' },
  reducers: {
    setTheme: (state, action) => { state.theme = action.payload },
    toggleTheme: (state) => { state.theme = state.theme === 'dark' ? 'light' : 'dark' },
    setSelectedClass: (state, action) => { state.selectedClass = action.payload },
  },
})

export const { setTheme, toggleTheme, setSelectedClass } = uiSlice.actions
export default uiSlice.reducer
