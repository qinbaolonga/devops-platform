import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project } from '../types'
import { api } from '../utils/request'

interface AppState {
  // 当前选中的项目
  currentProject: Project | null
  projects: Project[]
  
  // 系统配置
  systemConfig: any | null
  
  // UI 状态
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
  
  // WebSocket 连接状态
  wsConnected: boolean
  
  // Actions
  setCurrentProject: (project: Project | null) => void
  loadProjects: () => Promise<void>
  loadSystemConfig: () => Promise<void>
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  setWsConnected: (connected: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      projects: [],
      systemConfig: null,
      sidebarCollapsed: false,
      theme: 'light',
      wsConnected: false,

      setCurrentProject: (project: Project | null) => {
        set({ currentProject: project })
      },

      loadProjects: async () => {
        try {
          const projects = await api.get<Project[]>('/projects')
          set({ projects })
          
          // 如果没有当前项目，设置第一个项目为当前项目
          const { currentProject } = get()
          if (!currentProject && projects.length > 0) {
            set({ currentProject: projects[0] })
          }
        } catch (error) {
          console.error('Failed to load projects:', error)
        }
      },

      loadSystemConfig: async () => {
        try {
          const systemConfig = await api.get<any>('/system/info')
          set({ systemConfig })
        } catch (error) {
          console.error('Failed to load system config:', error)
        }
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed })
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme })
      },

      setWsConnected: (connected: boolean) => {
        set({ wsConnected: connected })
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        currentProject: state.currentProject,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
)