import React from 'react'
import { Layout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ProjectOutlined,
  DesktopOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  BellOutlined,
  NotificationOutlined,
  UserOutlined,
  AuditOutlined,
  SettingOutlined,
  CodeOutlined,
} from '@ant-design/icons/lib/icons'

const { Sider } = Layout

interface SidebarProps {
  collapsed: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '监控中心',
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: '项目管理',
    },
    {
      key: '/hosts',
      icon: <DesktopOutlined />,
      label: '主机管理',
    },
    {
      key: '/playbooks',
      icon: <FileTextOutlined />,
      label: 'Playbook',
    },
    {
      key: '/command',
      icon: <CodeOutlined />,
      label: '命令执行',
    },
    {
      key: '/tasks',
      icon: <UnorderedListOutlined />,
      label: '任务管理',
    },
    {
      key: '/scheduled-tasks',
      icon: <ClockCircleOutlined />,
      label: '定时任务',
    },
    {
      key: 'alerts-group',
      icon: <BellOutlined />,
      label: '告警管理',
      children: [
        {
          key: '/alerts',
          label: '告警规则',
        },
        {
          key: '/notifications',
          icon: <NotificationOutlined />,
          label: '通知渠道',
        },
      ],
    },
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: '系统管理',
      children: [
        {
          key: '/users',
          icon: <UserOutlined />,
          label: '用户管理',
        },
        {
          key: '/audit-logs',
          icon: <AuditOutlined />,
          label: '审计日志',
        },
        {
          key: '/system-config',
          icon: <SettingOutlined />,
          label: '系统配置',
        },
      ],
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const getSelectedKeys = () => {
    const path = location.pathname
    return [path]
  }

  const getOpenKeys = () => {
    const path = location.pathname
    if (path.startsWith('/alerts') || path.startsWith('/notifications')) {
      return ['alerts-group']
    }
    if (path.startsWith('/users') || path.startsWith('/audit-logs') || path.startsWith('/system-config')) {
      return ['system']
    }
    return []
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.1) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
          }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>D</span>
          </div>
          {!collapsed && (
            <span style={{ 
              color: '#fff', 
              fontSize: 16, 
              fontWeight: 600,
              background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              DevOps 平台
            </span>
          )}
        </div>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={getOpenKeys()}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0, marginTop: 8 }}
      />
    </Sider>
  )
}

export default Sidebar
