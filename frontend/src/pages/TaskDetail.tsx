import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Tag, Space, Spin, Row, Col, Typography } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons'
import { api } from '../utils/request'
import { useAppStore } from '../stores/app'
import { Task } from '../types'
import dayjs from 'dayjs'

const { Text } = Typography

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { currentProject } = useAppStore()
  const [task, setTask] = useState<Task | null>(null)
  const [logs, setLogs] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (taskId && currentProject) {
      loadTask()
      loadLogs()
      // 轮询更新日志
      pollRef.current = setInterval(() => {
        loadLogs()
        loadTask()
      }, 2000)
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [taskId, currentProject])

  // 自动滚动到底部
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // 任务完成后停止轮询
  useEffect(() => {
    if (task && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [task?.status])

  const loadTask = async () => {
    if (!currentProject || !taskId) return
    try {
      const data = await api.get<Task>(`/projects/${currentProject.id}/tasks/${taskId}`)
      setTask(data)
    } catch (error) {
      console.error('Failed to load task:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    if (!currentProject || !taskId) return
    try {
      const data = await api.get<{ output: string }>(`/projects/${currentProject.id}/tasks/${taskId}/logs`)
      // API 返回的是对象，提取 output 字段
      setLogs(typeof data === 'string' ? data : (data?.output || ''))
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }

  const handleCancel = async () => {
    if (!currentProject || !taskId) return
    try {
      await api.post(`/projects/${currentProject.id}/tasks/${taskId}/cancel`)
      loadTask()
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return 'success'
      case 'FAILED': return 'error'
      case 'RUNNING': return 'processing'
      case 'PENDING': return 'default'
      case 'CANCELLED': return 'warning'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return '已完成'
      case 'FAILED': return '失败'
      case 'RUNNING': return '运行中'
      case 'PENDING': return '等待中'
      case 'CANCELLED': return '已取消'
      default: return status
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!task) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>
          返回任务列表
        </Button>
        <Card style={{ marginTop: 16 }}>
          <p>任务不存在</p>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部信息栏 */}
      <div style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>
            返回
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => { loadTask(); loadLogs() }}>
            刷新
          </Button>
          {task.status === 'RUNNING' && (
            <Button icon={<StopOutlined />} danger onClick={handleCancel}>
              取消任务
            </Button>
          )}
        </Space>

        <Card size="small">
          <Row gutter={24}>
            <Col span={6}>
              <Text type="secondary">任务ID: </Text>
              <Text code>{task.id.slice(-8)}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">状态: </Text>
              <Tag color={getStatusColor(task.status)}>
                {getStatusText(task.status)}
              </Tag>
            </Col>
            <Col span={6}>
              <Text type="secondary">创建时间: </Text>
              <Text>{dayjs(task.createdAt).format('HH:mm:ss')}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">命令: </Text>
              <Text code>{task.command}</Text>
            </Col>
          </Row>
        </Card>
      </div>

      {/* 命令输出黑框 */}
      <div
        style={{
          flex: 1,
          background: '#1e1e1e',
          borderRadius: 8,
          padding: 16,
          overflow: 'auto',
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          fontSize: 13,
          lineHeight: 1.6,
          color: '#d4d4d4',
          minHeight: 400,
        }}
      >
        <div style={{ color: '#569cd6', marginBottom: 8 }}>
          $ {task.command}
        </div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {logs || (task.status === 'PENDING' ? '等待执行...' : task.status === 'RUNNING' ? '执行中...' : '暂无输出')}
        </pre>
        {task.status === 'RUNNING' && (
          <span style={{ color: '#4ec9b0' }}>▌</span>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}

export default TaskDetail
