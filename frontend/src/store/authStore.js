import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../utils/api'
import { connectSocket, disconnectSocket } from '../utils/socket'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      initAuth: async () => {
        const { token, user } = get()
        if (token && user) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          connectSocket(token)
          try {
            const res = await api.get('/auth/me')
            if (res.data && res.data.user) {
              set({ user: res.data.user })
            }
          } catch (e) {
            console.error('Failed to refresh user profile:', e)
          }
        }
      },

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/login', { email, password })
          const { token, user } = res.data
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          connectSocket(token)
          set({ user, token, isLoading: false })
          return { success: true, user }
        } catch (err) {
          set({ isLoading: false })
          return { success: false, message: err.response?.data?.message || 'Login failed' }
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch (e) {}
        disconnectSocket()
        delete api.defaults.headers.common['Authorization']
        set({ user: null, token: null })
      },

      updateUser: (userData) => set({ user: { ...get().user, ...userData } }),
    }),
    {
      name: 'hr-crm-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)

export default useAuthStore
