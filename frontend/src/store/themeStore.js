import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useThemeStore = create(
  persist(
    (set) => ({
      isDark: false,
      toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
      setDark: (val) => set({ isDark: val }),
    }),
    { name: 'hr-crm-theme' }
  )
)

export default useThemeStore
