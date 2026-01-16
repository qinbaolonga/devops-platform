import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Button, Dropdown, Avatar, Space, Badge, Select, Modal, Form, Input, message } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  KeyOutlined,
} from '@ant-design/icons/lib/icons'
import type { MenuProps } from 'antd'
import { useAuthStore } from '../../stores/auth'
import { useAppStore } from '../../stores/app'
import { api } from '../../utils/request'

const { Header: AntHeader } = Layout

const Header: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed, 
    currentProject, 
    setCurrentProject, 
    projects,
    wsConnected 
  } = useAppStore()

  const [profileModalVisible, setProfileModalVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const handleProfileClick = () => {
    profileForm.setFieldsValue({
      username: user?.username,
      email: user?.email,
    })
    setProfileModalVisible(true)
  }

  const handlePasswordClick = () => {
    passwordForm.resetFields()
    setPasswordModalVisible(true)
  }

  const handleProfileSubmit = async (values: { username: string; email: string }) => {
    setLoading(true)
    try {
      await api.patch('/auth/profile', values)
      message.success('个人信息更新成功')
      setProfileModalVisible(false)
    } catch (error) {
      message.error('更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      await api.put('/auth/password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      message.success('密码修改成功，请重新登录')
      setPasswordModalVisible(false)
      setTimeout(() => {
        handleLogout()
      }, 1500)
    } catch (error: any) {
      message.error(error.response?.data?.message || '密码修改失败')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = () => {
    navigate('/alerts')
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: handleProfileClick,
    },
    {
      key: 'password',
      icon: <KeyOutlined />,
      label: '修改密码',
      onClick: handlePasswordClick,
    },
    {
      key: 'divider',
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    setCurrentProject(project || null)
  }

  return (
    <>
      <AntHeader
        style={{
          padding: '0 24px',
          background: 'rgba(13, 19, 33, 0.95)',
          borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ fontSize: '16px', width: 48, height: 48, color: 'rgba(255,255,255,0.8)' }}
          />
          
          {projects.length > 0 && (
            <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 8, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>当前项目:</span>
              <Select
                value={currentProject?.id}
                onChange={handleProjectChange}
                style={{ width: 180 }}
                placeholder="选择项目"
              >
                {projects.map(project => (
                  <Select.Option key={project.id} value={project.id}>
                    {project.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <Space size="middle">
          {/* WebSocket 连接状态 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: wsConnected ? '#00ff88' : '#ff4757',
              boxShadow: `0 0 8px ${wsConnected ? '#00ff88' : '#ff4757'}`,
            }} />
            <span style={{ fontSize: 12, color: wsConnected ? '#00ff88' : '#ff4757' }}>
              {wsConnected ? '已连接' : '未连接'}
            </span>
          </div>
          
          {/* 通知铃铛 */}
          <Badge count={0} showZero={false}>
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}
              onClick={handleNotificationClick}
            />
          </Badge>

          {/* 用户菜单 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar 
                icon={<UserOutlined />} 
                size="small"
                style={{ 
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                }}
              />
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>{user?.username}</span>
            </Space>
          </Dropdown>
        </Space>
      </AntHeader>

      {/* 个人信息弹窗 */}
      <Modal
        title="个人信息"
        open={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        onOk={() => profileForm.submit()}
        confirmLoading={loading}
      >
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleProfileSubmit}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onOk={() => passwordForm.submit()}
        confirmLoading={loading}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordSubmit}
        >
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Header
