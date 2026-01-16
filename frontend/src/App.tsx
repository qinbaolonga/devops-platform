import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import ErrorBoundary from './components/ErrorBoundary'
import AuthProvider from './components/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Hosts from './pages/Hosts'
import Playbooks from './pages/Playbooks'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import ScheduledTasks from './pages/ScheduledTasks'
import Alerts from './pages/Alerts'
import Notifications from './pages/Notifications'
import Users from './pages/Users'
import AuditLogs from './pages/AuditLogs'
import SystemConfig from './pages/SystemConfig'
import CommandExecute from './pages/CommandExecute'
import Test from './pages/Test'
import SimpleTest from './SimpleTest'

// 科技感主题配置
const techTheme = {
  token: {
    colorPrimary: '#00d4ff',
    colorBgContainer: 'rgba(17, 25, 40, 0.75)',
    colorBgElevated: 'rgba(17, 25, 40, 0.95)',
    colorBgLayout: '#0a0e17',
    colorText: 'rgba(255, 255, 255, 0.85)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    colorBorder: 'rgba(0, 212, 255, 0.2)',
    colorBorderSecondary: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 8,
    colorSuccess: '#00ff88',
    colorWarning: '#ffaa00',
    colorError: '#ff4757',
    colorInfo: '#00d4ff',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Layout: {
      siderBg: 'linear-gradient(180deg, #0d1321 0%, #1a1f35 100%)',
      headerBg: 'rgba(13, 19, 33, 0.95)',
      bodyBg: '#0a0e17',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'rgba(0, 212, 255, 0.05)',
      darkItemSelectedBg: 'linear-gradient(90deg, rgba(0, 212, 255, 0.2) 0%, transparent 100%)',
      darkItemHoverBg: 'rgba(0, 212, 255, 0.1)',
    },
    Card: {
      colorBgContainer: 'rgba(17, 25, 40, 0.75)',
      colorBorderSecondary: 'rgba(0, 212, 255, 0.15)',
    },
    Table: {
      colorBgContainer: 'transparent',
      headerBg: 'rgba(0, 212, 255, 0.08)',
      rowHoverBg: 'rgba(0, 212, 255, 0.05)',
    },
    Button: {
      primaryShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
    },
    Input: {
      colorBgContainer: 'rgba(0, 0, 0, 0.3)',
      activeBorderColor: '#00d4ff',
      hoverBorderColor: 'rgba(0, 212, 255, 0.5)',
    },
    Select: {
      colorBgContainer: 'rgba(0, 0, 0, 0.3)',
      colorBgElevated: 'rgba(17, 25, 40, 0.98)',
    },
    Modal: {
      contentBg: 'rgba(17, 25, 40, 0.98)',
      headerBg: 'rgba(17, 25, 40, 0.98)',
    },
  },
}

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider theme={techTheme} locale={zhCN}>
        <AntdApp>
          <Router>
            <AuthProvider>
              <Routes>
                <Route path="/simple" element={<SimpleTest />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/projects/*" element={<Projects />} />
                          <Route path="/hosts/*" element={<Hosts />} />
                          <Route path="/playbooks/*" element={<Playbooks />} />
                          <Route path="/tasks" element={<Tasks />} />
                          <Route path="/tasks/:taskId" element={<TaskDetail />} />
                          <Route path="/command" element={<CommandExecute />} />
                          <Route path="/scheduled-tasks/*" element={<ScheduledTasks />} />
                          <Route path="/alerts/*" element={<Alerts />} />
                          <Route path="/notifications/*" element={<Notifications />} />
                          <Route path="/users/*" element={<Users />} />
                          <Route path="/audit-logs" element={<AuditLogs />} />
                          <Route path="/system-config" element={<SystemConfig />} />
                          <Route path="/test" element={<Test />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AuthProvider>
          </Router>
        </AntdApp>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App