import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  DatePicker,
  Select,
  Input,
  Tooltip,
  Modal,
  Typography,
  Row,
  Col,
  Empty,
  Statistic,
} from 'antd'
import {
  ExportOutlined,
  EyeOutlined,
  ReloadOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
} from '@ant-design/icons/lib/icons'
import { api } from '../utils/request'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select
const { Search } = Input
const { Text, Paragraph } = Typography

interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  details?: any
  ip: string
  userAgent?: string
  createdAt: string
  user?: {
    id: string
    username: string
    email: string
  }
}

interface AuditLogQuery {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
  action?: string
  resource?: string
  userId?: string
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState<AuditLogQuery>({
    page: 1,
    pageSize: 20,
  })
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    loadLogs()
  }, [query])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString())
        }
      })

      const response = await api.get<any>(`/audit-logs?${params}`)
      
      // 兼容两种返回格式
      const data = response.data || response.items || []
      const total = response.total || 0
      
      setLogs(data)
      setTotal(total)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setQuery(prev => ({ ...prev, resource: value, page: 1 }))
  }

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setQuery(prev => ({
        ...prev,
        startDate: dates[0].toISOString(),
        endDate: dates[1].toISOString(),
        page: 1,
      }))
    } else {
      setQuery(prev => ({
        ...prev,
        startDate: undefined,
        endDate: undefined,
        page: 1,
      }))
    }
  }

  const handleActionChange = (action: string) => {
    setQuery(prev => ({ ...prev, action: action || undefined, page: 1 }))
  }

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log)
    setDetailVisible(true)
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && key !== 'page' && key !== 'pageSize') {
          params.append(key, value.toString())
        }
      })

      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : `http://${window.location.hostname}:3000`
      
      const response = await fetch(`${backendUrl}/audit-logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        // 转换为CSV
        const headers = ['时间', '用户', '操作', '资源', 'IP地址']
        const rows = data.map((log: AuditLog) => [
          dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          log.user?.username || '-',
          log.action,
          log.resource,
          log.ip,
        ])
        
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `审计日志_${dayjs().format('YYYY-MM-DD')}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error)
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('创建') || action.includes('新增')) return 'green'
    if (action.includes('删除')) return 'red'
    if (action.includes('修改') || action.includes('更新')) return 'orange'
    if (action.includes('查询') || action.includes('获取')) return 'blue'
    if (action.includes('登录')) return 'cyan'
    if (action.includes('登出')) return 'default'
    return 'default'
  }

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => (
        <div style={{ fontSize: 12 }}>
          <div>{dayjs(date).format('YYYY-MM-DD')}</div>
          <div style={{ color: '#999' }}>{dayjs(date).format('HH:mm:ss')}</div>
        </div>
      ),
    },
    {
      title: '用户',
      key: 'user',
      width: 120,
      render: (record: AuditLog) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{record.user?.username || '-'}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{record.user?.email || '-'}</div>
        </div>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => (
        <Tag color={getActionColor(action)} style={{ margin: 0 }}>{action}</Tag>
      ),
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 100,
      render: (resource: string) => (
        <span style={{ fontSize: 13 }}>{resource}</span>
      ),
    },
    {
      title: '详情',
      key: 'details',
      ellipsis: true,
      render: (record: AuditLog) => {
        const details = record.details
        if (!details) return '-'
        const url = details.url || details.path || ''
        const method = details.method || ''
        return (
          <Tooltip title={url}>
            <span style={{ fontSize: 12 }}>
              {method && <Tag color="blue" style={{ marginRight: 4 }}>{method}</Tag>}
              <Text code style={{ fontSize: 11 }}>{url.length > 40 ? url.substring(0, 40) + '...' : url}</Text>
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 120,
      render: (ip: string) => (
        <Text code style={{ fontSize: 12 }}>{ip}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 60,
      align: 'center' as const,
      render: (record: AuditLog) => (
        <Tooltip title="查看详情">
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            <AuditOutlined style={{ marginRight: 8 }} />
            审计日志
          </h1>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>记录系统所有操作行为</div>
        </div>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
          <Button icon={<ReloadOutlined />} onClick={loadLogs}>刷新</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}>日志总数</span>}
              value={total}
              prefix={<FileSearchOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}>今日操作</span>}
              value={logs.filter(l => dayjs(l.createdAt).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')).length}
              prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选条件 */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }} styles={{ body: { padding: '16px 24px' } }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="搜索资源"
              onSearch={handleSearch}
              allowClear
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="操作类型"
              allowClear
              style={{ width: '100%' }}
              onChange={handleActionChange}
            >
              <Option value="查询">查询</Option>
              <Option value="创建">创建</Option>
              <Option value="修改">修改</Option>
              <Option value="删除">删除</Option>
              <Option value="登录">登录</Option>
              <Option value="登出">登出</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={12}>
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder={['开始时间', '结束时间']}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 日志列表 */}
      <Card style={{ borderRadius: 8 }}>
        {logs.length > 0 ? (
          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{
              current: query.page,
              pageSize: query.pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setQuery(prev => ({ ...prev, page, pageSize }))
              },
            }}
          />
        ) : (
          <Empty description="暂无审计日志" style={{ padding: '60px 0' }} />
        )}
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="审计日志详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedLog && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">时间</Text>
                <div style={{ fontWeight: 500 }}>{dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">用户</Text>
                <div style={{ fontWeight: 500 }}>{selectedLog.user?.username || '-'}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">操作</Text>
                <div><Tag color={getActionColor(selectedLog.action)}>{selectedLog.action}</Tag></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">资源</Text>
                <div style={{ fontWeight: 500 }}>{selectedLog.resource}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">IP地址</Text>
                <div><Text code>{selectedLog.ip}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">资源ID</Text>
                <div><Text code>{selectedLog.resourceId || '-'}</Text></div>
              </Col>
            </Row>

            {selectedLog.userAgent && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">User Agent</Text>
                <Paragraph style={{ fontSize: 12, marginTop: 4 }}>{selectedLog.userAgent}</Paragraph>
              </div>
            )}

            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">详细信息</Text>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 12, 
                  borderRadius: 6, 
                  fontSize: 12,
                  marginTop: 8,
                  maxHeight: 300,
                  overflow: 'auto'
                }}>
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AuditLogs
