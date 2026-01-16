import React, { useEffect } from 'react'
import { Layout as AntLayout } from 'antd'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'
import Sidebar from './Sidebar'
import Header from './Header'
import WebSocketProvider from '../WebSocketProvider'

const { Content } = AntLayout

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarCollapsed, loadProjects, loadSystemConfig } = useAppStore()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && user) {
      loadProjects()
      loadSystemConfig()
    }
  }, [isAuthenticated, user, loadProjects, loadSystemConfig])

  return (
    <WebSocketProvider>
      <AntLayout style={{ minHeight: '100vh' }}>
        <Sidebar collapsed={sidebarCollapsed} />
        <AntLayout style={{ marginLeft: sidebarCollapsed ? 80 : 256 }}>
          <Header />
          <Content
            style={{
              margin: '16px',
              padding: '24px',
              background: '#fff',
              borderRadius: '8px',
              minHeight: 'calc(100vh - 112px)',
            }}
          >
            {children}
          </Content>
        </AntLayout>
      </AntLayout>
    </WebSocketProvider>
  )
}

export default Layout