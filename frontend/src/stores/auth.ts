import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, LoginRequest, LoginResponse } from '../types'
import { api } from '../utils/request'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      login: async (credentials: LoginRequest) => {
        set({ loading: true })
        try {
          const response = await api.post<LoginResponse>('/auth/login', credentials)
          const { token, user } = response
          
          localStorage.setItem('token', token)
          set({
            user,
            token,
            isAuthenticated: true,
            loading: false,
          })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          const updatedUser = await api.put<User>('/auth/profile', data)
          set({ user: updatedUser })
        } catch (error) {
          throw error
        }
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        try {
          await api.put('/auth/password', {
            oldPassword,
            newPassword,
          })
        } catch (error) {
          throw error
        }
      },

      checkAuth: async () => {
        set({ loading: true })
        const token = localStorage.getItem('token')
        
        if (!token) {
          set({ isAuthenticated: false, loading: false })
          return
        }

        try {
          const user = await api.get<User>('/auth/profile')
          set({
            user,
            token,
            isAuthenticated: true,
            loading: false,
          })
        } catch (error) {
          localStorage.removeItem('token')
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)