import React, { useEffect, useState } from 'react'
import { Card, Button, Space, Alert, Spin } from 'antd'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'
import { api } from '../utils/request'

const Test: React.FC = () => {
  const { user, isAuthenticated, token } = useAuthStore()
  const { projects, systemConfig, loadProjects, loadSystemConfig } = useAppStore()
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  console.log('🧪 Test页面渲染中...')
  console.log('🧪 认证状态:', { isAuthenticated, user: user?.username, token: !!token })

  const runTests = async () => {
    console.log('🧪 开始运行测试...')
    setLoading(true)
    const results = []

    // Test 1: Authentication status
    results.push({
      name: 'Authentication Status',
      status: isAuthenticated ? 'success' : 'error',
      message: isAuthenticated ? `Logged in as ${user?.username}` : 'Not authenticated'
    })

    // Test 2: Token exists
    results.push({
      name: 'Token Status',
      status: token ? 'success' : 'error',
      message: token ? 'Token exists' : 'No token found'
    })

    // Test 3: System info API
    try {
      console.log('🧪 测试系统信息API...')
      const systemInfo = await api.get('/system/info')
      results.push({
        name: 'System Info API',
        status: 'success',
        message: `System: ${systemInfo.systemName}`
      })
    } catch (error) {
      console.error('🧪 系统信息API失败:', error)
      results.push({
        name: 'System Info API',
        status: 'error',
        message: `Error: ${error}`
      })
    }

    // Test 4: Projects API (only if authenticated)
    if (isAuthenticated) {
      try {
        console.log('🧪 测试项目API...')
        const projectsData = await api.get('/projects')
        results.push({
          name: 'Projects API',
          status: 'success',
          message: `Found ${projectsData.length} projects`
        })
      } catch (error) {
        console.error('🧪 项目API失败:', error)
        results.push({
          name: 'Projects API',
          status: 'error',
          message: `Error: ${error}`
        })
      }

      // Test 5: System stats API
      try {
        console.log('🧪 测试系统统计API...')
        const stats = await api.get('/system/stats')
        results.push({
          name: 'System Stats API',
          status: 'success',
          message: `Users: ${stats.users}, Projects: ${stats.projects}, Hosts: ${stats.hosts}`
        })
      } catch (error) {
        console.error('🧪 系统统计API失败:', error)
        results.push({
          name: 'System Stats API',
          status: 'error',
          message: `Error: ${error}`
        })
      }
    }

    console.log('🧪 测试完成，结果:', results)
    setTestResults(results)
    setLoading(false)
  }

  useEffect(() => {
    console.log('🧪 Test页面useEffect触发')
    runTests()
  }, [])

  console.log('🧪 Test页面即将渲染JSX')

  return (
    <div>
      <h1>🧪 系统测试页面</h1>
      
      <Card title="页面渲染测试" style={{ marginBottom: 16 }}>
        <Alert message="如果你能看到这个页面，说明React渲染正常" type="success" />
      </Card>
      
      <Card title="认证状态" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div><strong>用户:</strong> {user?.username || 'N/A'}</div>
          <div><strong>角色:</strong> {user?.role || 'N/A'}</div>
          <div><strong>认证状态:</strong> {isAuthenticated ? '✅ 已认证' : '❌ 未认证'}</div>
          <div><strong>Token:</strong> {token ? '✅ 存在' : '❌ 不存在'}</div>
        </Space>
      </Card>

      <Card title="应用状态" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div><strong>项目数量:</strong> {projects.length}</div>
          <div><strong>当前项目:</strong> {useAppStore.getState().currentProject?.name || '无'}</div>
          <div><strong>系统配置:</strong> {systemConfig ? '✅ 已加载' : '❌ 未加载'}</div>
        </Space>
      </Card>

      <Card title="API 测试结果" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button onClick={runTests} loading={loading}>
            🔄 重新测试
          </Button>
          
          {loading && <Spin />}
          
          {testResults.map((result, index) => (
            <Alert
              key={index}
              message={result.name}
              description={result.message}
              type={result.status === 'success' ? 'success' : 'error'}
              showIcon
            />
          ))}
        </Space>
      </Card>

      <Card title="数据加载测试">
        <Space>
          <Button onClick={loadProjects}>📁 加载项目</Button>
          <Button onClick={loadSystemConfig}>⚙️ 加载系统配置</Button>
        </Space>
      </Card>
    </div>
  )
}

export default Test