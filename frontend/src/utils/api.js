import axios from 'axios'
import toast from 'react-hot-toast'

const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL,
  timeout: 15000,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('hr-crm-auth')
    if (authData) {
      try {
        const { state } = JSON.parse(authData)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (e) {}
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong'

    if (error.response?.status === 401) {
      // Don't redirect if the 401 came from the login request itself
      if (error.config && error.config.url && error.config.url.includes('/auth/login')) {
        return Promise.reject(error)
      }
      
      // Token expired or invalid - clear auth and redirect
      localStorage.removeItem('hr-crm-auth')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (error.response?.status === 403) {
      toast.error('Access denied')
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.')
    }

    return Promise.reject(error)
  }
)

export default api
