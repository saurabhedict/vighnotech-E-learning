import { createSlice } from '@reduxjs/toolkit'

// Global UI state: theme + currently selected class + sidebar collapse.
const uiSlice = createSlice({
  name: 'ui',
  initialState: { theme: 'light', selectedClass: 'PPL_Ground', sidebarCollapsed: false },
  reducers: {
    setTheme: (state, action) => { state.theme = action.payload },
    toggleTheme: (state) => { state.theme = state.theme === 'dark' ? 'light' : 'dark' },
    setSelectedClass: (state, action) => { state.selectedClass = action.payload },
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed },
    setSidebarCollapsed: (state, action) => { state.sidebarCollapsed = action.payload },
  },
})

export const { setTheme, toggleTheme, setSelectedClass, toggleSidebar, setSidebarCollapsed } = uiSlice.actions
export default uiSlice.reducer
