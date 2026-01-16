import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Select,
  DatePicker,
  Input,
  Modal,
  Typography,
  Progress,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
  message,
} from 'antd'
import {
  ReloadOutlined,
  EyeOutlined,
  StopOutlined,
  DeleteOutlined,
  RetweetOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons/lib/icons'
import { api } from '../utils/request'
import { useAppStore } from '../stores/app'
import { Task } from '../types'
import dayjs from 'dayjs'

const { Option } = Select
const { Search } = Input
const { RangePicker } = DatePicker
const { Text, Paragraph } = Typography

interface TaskQuery {
  page?: number
  limit?: number
  type?: string
  status?: string
  startTime?: string
  endTime?: string
  search?: string
}

interface TaskStatistics {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

const Tasks: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [query, setQuery] = useState<TaskQuery>({
    page: 1,
    limit: 20,
  })
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskLogs, setTaskLogs] = useState<string>('')
  const [logsLoading, setLogsLoading] = useState(false)
  const { currentProject } = useAppStore()

  // 如果 URL 中有 taskId，自动打开详情
  useEffect(() => {
    if (taskId && currentProject) {
      loadTaskDetail(taskId)
    }
  }, [taskId, currentProject])

  const loadTaskDetail = async (id: string) => {
    if (!currentProject) return
    
    try {
      const task = await api.get<Task>(`/projects/${currentProject.id}/tasks/${id}`)
      setSelectedTask(task)
      setDetailVisible(true)
      loadTaskLogs(id)
    } catch (error) {
      console.error('Failed to load task detail:', error)
    }
  }

  const loadTaskLogs = async (id: string) => {
    if (!currentProject) return
    
    setLogsLoading(true)
    try {
      const logs = await api.get<string>(`/projects/${currentProject.id}/tasks/${id}/logs`)
      setTaskLogs(logs)
    } catch (error) {
      console.error('Failed to load task logs:', error)
      setTaskLogs('无法加载任务日志')
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    if (currentProject) {
      loadTasks()
      loadStatistics()
    }
  }, [currentProject, query])

  const loadTasks = async () => {
    if (!currentProject) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString())
        }
      })

      const response = await api.get<{
        items: Task[]
        total: number
        page: number
        limit: number
      }>(`/projects/${currentProject.id}/tasks?${params}`)
      
      setTasks(response.items)
      setTotal(response.total)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    if (!currentProject) return
    
    try {
      const data = await api.get<TaskStatistics>(`/projects/${currentProject.id}/tasks/statistics`)
      setStatistics(data)
    } catch (error) {
      console.error('Failed to load task statistics:', error)
    }
  }

  const handleViewDetail = async (task: Task) => {
    setSelectedTask(task)
    setDetailVisible(true)
    navigate(`/tasks/${task.id}`)
    loadTaskLogs(task.id)
  }

  const handleCloseDetail = () => {
    setDetailVisible(false)
    setSelectedTask(null)
    setTaskLogs('')
    navigate('/tasks')
  }

  const handleCancelTask = async (taskId: string) => {
    if (!currentProject) return
    
    try {
      await api.post(`/projects/${currentProject.id}/tasks/${taskId}/cancel`)
      loadTasks()
      loadStatistics()
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  }

  const handleRetryTask = async (taskId: string) => {
    if (!currentProject) return
    
    try {
      await api.post(`/projects/${currentProject.id}/tasks/${taskId}/retry`)
      loadTasks()
      loadStatistics()
    } catch (error) {
      console.error('Failed to retry task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!currentProject) return
    
    try {
      await api.delete(`/projects/${currentProject.id}/tasks/${taskId}`)
      message.success('删除成功')
      loadTasks()
      loadStatistics()
    } catch (error) {
      console.error('Failed to delete task:', error)
      message.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (!currentProject || selectedRowKeys.length === 0) return
    
    try {
      await api.post(`/projects/${currentProject.id}/tasks/batch-delete`, { ids: selectedRowKeys })
      message.success(`成功删除 ${selectedRowKeys.length} 个任务`)
      setSelectedRowKeys([])
      loadTasks()
      loadStatistics()
    } catch (error: any) {
      console.error('Failed to batch delete tasks:', error)
      message.error(error.message || '批量删除失败')
    }
  }

  const handleSearch = (value: string) => {
    setQuery(prev => ({ ...prev, search: value, page: 1 }))
  }

  const handleTypeChange = (type: string) => {
    setQuery(prev => ({ ...prev, type: type || undefined, page: 1 }))
  }

  const handleStatusChange = (status: string) => {
    setQuery(prev => ({ ...prev, status: status || undefined, page: 1 }))
  }

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setQuery(prev => ({
        ...prev,
        startTime: dates[0].toISOString(),
        endTime: dates[1].toISOString(),
        page: 1,
      }))
    } else {
      setQuery(prev => ({
        ...prev,
        startTime: undefined,
        endTime: undefined,
        page: 1,
      }))
    }
  }

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase()
    switch (s) {
      case 'completed':
      case 'success':
        return 'success'
      case 'failed':
        return 'error'
      case 'running':
        return 'processing'
      case 'pending':
        return 'default'
      case 'cancelled':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getStatusText = (status: string) => {
    const s = status?.toLowerCase()
    switch (s) {
      case 'completed':
      case 'success':
        return '已完成'
      case 'failed':
        return '失败'
      case 'running':
        return '运行中'
      case 'pending':
        return '等待中'
      case 'cancelled':
        return '已取消'
      default:
        return status || '-'
    }
  }

  const getTypeColor = (type: string) => {
    const t = type?.toLowerCase()
    switch (t) {
      case 'command':
        return 'blue'
      case 'playbook':
        return 'green'
      case 'script':
        return 'orange'
      default:
        return 'default'
    }
  }

  const getTypeText = (type: string) => {
    const t = type?.toLowerCase()
    switch (t) {
      case 'command':
        return '命令'
      case 'playbook':
        return 'Playbook'
      case 'script':
        return '脚本'
      default:
        return type || '-'
    }
  }

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <Text code>{id.slice(-8)}</Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {getTypeText(type)}
        </Tag>
      ),
    },
    {
      title: '任务名称',
      key: 'name',
      render: (record: Task) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {record.name || record.command || '未命名任务'}
          </div>
          {record.command && record.name && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.command}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: Task) => (
        <div>
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
          {record.progress !== undefined && record.progress < 100 && (
            <Progress
              percent={record.progress}
              size="small"
              style={{ width: 80, marginTop: 4 }}
            />
          )}
        </div>
      ),
    },
    {
      title: '目标主机',
      dataIndex: 'targetHosts',
      key: 'targetHosts',
      width: 180,
      render: (hosts: string[]) => {
        if (!hosts || hosts.length === 0) {
          return <span style={{ color: '#999' }}>-</span>
        }
        return (
          <Tooltip title={hosts.join(', ')}>
            <div>
              {hosts.slice(0, 2).map((host, index) => (
                <Tag key={index} style={{ marginBottom: 2 }}>{host}</Tag>
              ))}
              {hosts.length > 2 && (
                <Tag color="blue">+{hosts.length - 2}</Tag>
              )}
            </div>
          </Tooltip>
        )
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => (
        <div style={{ fontSize: '12px' }}>
          <div>{dayjs(date).format('YYYY-MM-DD')}</div>
          <div>{dayjs(date).format('HH:mm:ss')}</div>
        </div>
      ),
    },
    {
      title: '耗时',
      key: 'duration',
      width: 80,
      render: (record: Task) => {
        if (!record.startTime) return '-'
        const start = new Date(record.startTime).getTime()
        const end = record.endTime ? new Date(record.endTime).getTime() : Date.now()
        const duration = Math.round((end - start) / 1000)
        return `${duration}s`
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: Task) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {record.status?.toUpperCase() === 'RUNNING' && (
            <Tooltip title="取消任务">
              <Button
                type="text"
                icon={<StopOutlined />}
                onClick={() => handleCancelTask(record.id)}
              />
            </Tooltip>
          )}
          {['FAILED', 'CANCELLED'].includes(record.status?.toUpperCase()) && (
            <Tooltip title="重试">
              <Button
                type="text"
                icon={<RetweetOutlined />}
                onClick={() => handleRetryTask(record.id)}
              />
            </Tooltip>
          )}
          {['SUCCESS', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(record.status?.toUpperCase()) && (
            <Popconfirm
              title="确定要删除这个任务吗？"
              onConfirm={() => handleDeleteTask(record.id)}
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  if (!currentProject) {
    return (
      <div>
        <h1>任务管理</h1>
        <Card>
          <p>请先选择一个项目</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>任务管理</h1>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`确定要删除选中的 ${selectedRowKeys.length} 个任务吗？`}
              onConfirm={handleBatchDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadTasks}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 统计信息 */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card styles={{ body: { padding: '12px 16px' } }}>
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>总任务数</span>}
                value={statistics.total} 
                valueStyle={{ color: '#00d4ff', fontSize: 28 }} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>等待中</span>}
                value={statistics.pending}
                valueStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 28 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>运行中</span>}
                value={statistics.running}
                valueStyle={{ color: '#00d4ff', fontSize: 28 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>已完成</span>}
                value={statistics.completed}
                valueStyle={{ color: '#00ff88', fontSize: 28 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>失败</span>}
                value={statistics.failed}
                valueStyle={{ color: '#ff4757', fontSize: 28 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>已取消</span>}
                value={statistics.cancelled}
                valueStyle={{ color: '#ffaa00', fontSize: 28 }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选条件 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="搜索任务名称或命令"
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="任务类型"
              allowClear
              style={{ width: '100%' }}
              onChange={handleTypeChange}
            >
              <Option value="command">命令</Option>
              <Option value="playbook">Playbook</Option>
              <Option value="script">脚本</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="任务状态"
              allowClear
              style={{ width: '100%' }}
              onChange={handleStatusChange}
            >
              <Option value="pending">等待中</Option>
              <Option value="running">运行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="failed">失败</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={6}>
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder={['开始时间', '结束时间']}
              onChange={(dates, _dateStrings) => handleDateRangeChange(dates)}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 任务列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={Array.isArray(tasks) ? tasks : []}
          rowKey="id"
          loading={loading}
          size="small"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
            getCheckboxProps: (record: Task) => ({
              disabled: record.status?.toUpperCase() === 'RUNNING',
            }),
          }}
          pagination={{
            current: query.page,
            pageSize: query.limit,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setQuery(prev => ({ ...prev, page, limit: pageSize }))
            },
          }}
        />
      </Card>

      {/* 任务详情 Modal */}
      <Modal
        title={
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleCloseDetail}
            />
            {`任务详情 - ${selectedTask?.id?.slice(-8)}`}
          </Space>
        }
        open={detailVisible}
        onCancel={handleCloseDetail}
        footer={
          <Space>
            <Button onClick={() => selectedTask && loadTaskLogs(selectedTask.id)} loading={logsLoading}>
              刷新日志
            </Button>
            <Button onClick={handleCloseDetail}>关闭</Button>
          </Space>
        }
        width={900}
      >
        {selectedTask && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Text strong>任务类型: </Text>
                <Tag color={getTypeColor(selectedTask.type)}>
                  {getTypeText(selectedTask.type)}
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong>状态: </Text>
                <Tag color={getStatusColor(selectedTask.status)}>
                  {getStatusText(selectedTask.status)}
                </Tag>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Text strong>创建时间: </Text>
                <Text>{dayjs(selectedTask.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </Col>
              <Col span={12}>
                <Text strong>完成时间: </Text>
                <Text>
                  {selectedTask.endTime 
                    ? dayjs(selectedTask.endTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'
                  }
                </Text>
              </Col>
            </Row>

            {selectedTask.command && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>执行命令: </Text>
                <Paragraph code copyable>{selectedTask.command}</Paragraph>
              </div>
            )}

            {selectedTask.hostIds && selectedTask.hostIds.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>目标主机: </Text>
                <div style={{ marginTop: 8 }}>
                  {selectedTask.hostIds.map((hostId: string) => (
                    <Tag key={hostId}>{hostId}</Tag>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Text strong>执行日志:</Text>
              <div
                style={{
                  background: '#000',
                  color: '#fff',
                  padding: 16,
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  maxHeight: 400,
                  overflow: 'auto',
                  marginTop: 8,
                }}
              >
                <pre>{taskLogs || '暂无日志'}</pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Tasks