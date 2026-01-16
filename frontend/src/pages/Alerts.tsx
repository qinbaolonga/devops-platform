import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Tooltip,
  Switch,
  Row,
  Col,
  Tabs,
  Badge,
  Empty,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BellOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  AlertOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons/lib/icons'
import { api } from '../utils/request'
import { useAppStore } from '../stores/app'
import { AlertRule, Alert, Host } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

interface AlertRuleFormData {
  name: string
  metric: string
  operator: string
  threshold: number
  duration: number
  level: string
  enabled: boolean
  hostIds: string[]
}

const Alerts: React.FC = () => {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [activeTab, setActiveTab] = useState('rules')
  const [form] = Form.useForm()
  const { currentProject } = useAppStore()

  useEffect(() => {
    if (currentProject) {
      loadAlertRules()
      loadAlerts()
      loadHosts()
    }
  }, [currentProject])

  const loadAlertRules = async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const response = await api.get<{items: AlertRule[], total: number}>(`/projects/${currentProject.id}/alert-rules`)
      setAlertRules(response.items || [])
    } catch (error) {
      console.error('加载告警规则失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAlerts = async () => {
    if (!currentProject) return
    try {
      const response = await api.get<{items: Alert[], total: number}>(`/projects/${currentProject.id}/alerts`)
      setAlerts(response.items || [])
    } catch (error) {
      console.error('加载告警记录失败:', error)
    }
  }

  const loadHosts = async () => {
    if (!currentProject) return
    try {
      const response = await api.get<{items: Host[], total: number}>(`/projects/${currentProject.id}/hosts?pageSize=1000`)
      setHosts(response.items || [])
    } catch (error) {
      console.error('加载主机列表失败:', error)
    }
  }

  const handleAddRule = () => {
    setEditingRule(null)
    form.resetFields()
    form.setFieldsValue({
      enabled: true,
      metric: 'CPU',
      operator: 'GT',
      threshold: 80,
      duration: 5,
      level: 'WARNING',
    })
    setModalVisible(true)
  }

  const handleEditRule = (rule: AlertRule) => {
    setEditingRule(rule)
    form.setFieldsValue({
      name: rule.name,
      metric: rule.metric,
      operator: rule.operator,
      threshold: rule.threshold,
      duration: rule.duration,
      level: rule.level,
      enabled: rule.enabled,
      hostIds: rule.hostIds || [],
    })
    setModalVisible(true)
  }

  const handleDeleteRule = async (id: string) => {
    if (!currentProject) return
    try {
      await api.delete(`/projects/${currentProject.id}/alert-rules/${id}`)
      message.success('删除成功')
      loadAlertRules()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmitRule = async (values: AlertRuleFormData) => {
    if (!currentProject) return
    try {
      if (editingRule) {
        await api.patch(`/projects/${currentProject.id}/alert-rules/${editingRule.id}`, values)
        message.success('更新成功')
      } else {
        await api.post(`/projects/${currentProject.id}/alert-rules`, values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadAlertRules()
    } catch (error) {
      message.error(editingRule ? '更新失败' : '创建失败')
    }
  }

  const handleToggleRuleEnabled = async (rule: AlertRule, enabled: boolean) => {
    if (!currentProject) return
    try {
      await api.patch(`/projects/${currentProject.id}/alert-rules/${rule.id}`, { enabled })
      message.success(enabled ? '已启用' : '已禁用')
      loadAlertRules()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!currentProject) return
    try {
      await api.post(`/projects/${currentProject.id}/alerts/${alertId}/acknowledge`)
      message.success('告警已确认')
      loadAlerts()
    } catch (error) {
      message.error('确认失败')
    }
  }

  const getLevelColor = (level: string) => {
    const l = level?.toUpperCase()
    if (l === 'CRITICAL') return 'red'
    if (l === 'ERROR') return 'red'
    if (l === 'WARNING') return 'orange'
    if (l === 'INFO') return 'blue'
    return 'default'
  }

  const getLevelText = (level: string) => {
    const l = level?.toUpperCase()
    if (l === 'CRITICAL') return '严重'
    if (l === 'ERROR') return '错误'
    if (l === 'WARNING') return '警告'
    if (l === 'INFO') return '信息'
    return level
  }

  const getLevelIcon = (level: string) => {
    const l = level?.toUpperCase()
    if (l === 'CRITICAL' || l === 'ERROR') return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
    if (l === 'WARNING') return <WarningOutlined style={{ color: '#faad14' }} />
    if (l === 'INFO') return <InfoCircleOutlined style={{ color: '#1890ff' }} />
    return <BellOutlined />
  }

  const getMetricText = (metric: string) => {
    const m = metric?.toUpperCase()
    if (m === 'CPU') return 'CPU使用率'
    if (m === 'MEMORY') return '内存使用率'
    if (m === 'DISK') return '磁盘使用率'
    if (m === 'NETWORK_IN') return '网络入流量'
    if (m === 'NETWORK_OUT') return '网络出流量'
    if (m === 'LOAD') return '系统负载'
    return metric
  }

  const getOperatorText = (operator: string) => {
    const o = operator?.toUpperCase()
    if (o === 'GT') return '>'
    if (o === 'GTE') return '≥'
    if (o === 'LT') return '<'
    if (o === 'LTE') return '≤'
    if (o === 'EQ') return '='
    return operator
  }

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase()
    if (s === 'FIRING') return 'error'
    if (s === 'RESOLVED') return 'success'
    if (s === 'ACKNOWLEDGED') return 'warning'
    return 'default'
  }

  const getStatusText = (status: string) => {
    const s = status?.toUpperCase()
    if (s === 'FIRING') return '触发中'
    if (s === 'RESOLVED') return '已恢复'
    if (s === 'ACKNOWLEDGED') return '已确认'
    return status
  }

  // 统计数据
  const stats = {
    totalRules: alertRules.length,
    enabledRules: alertRules.filter(r => r.enabled).length,
    firingAlerts: alerts.filter(a => a.status?.toUpperCase() === 'FIRING').length,
    totalAlerts: alerts.length,
  }

  const ruleColumns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: AlertRule) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {getMetricText(record.metric)} {getOperatorText(record.operator)} {record.threshold}
            {['CPU', 'MEMORY', 'DISK'].includes(record.metric?.toUpperCase()) ? '%' : ''}
          </div>
        </div>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      align: 'center' as const,
      render: (level: string) => (
        <Tag color={getLevelColor(level)} icon={getLevelIcon(level)} style={{ margin: 0 }}>
          {getLevelText(level)}
        </Tag>
      ),
    },
    {
      title: '持续时间',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      align: 'center' as const,
      render: (duration: number) => <span style={{ fontSize: 13 }}>{duration} 分钟</span>,
    },
    {
      title: '目标主机',
      dataIndex: 'hostIds',
      key: 'hostIds',
      width: 120,
      render: (hostIds: string[]) => (
        <span style={{ fontSize: 13 }}>
          {hostIds && hostIds.length > 0 ? `${hostIds.length} 台主机` : <Tag>所有主机</Tag>}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      align: 'center' as const,
      render: (enabled: boolean, record: AlertRule) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleRuleEnabled(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (record: AlertRule) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditRule(record)} />
          </Tooltip>
          <Popconfirm title="确定要删除这个告警规则吗？" onConfirm={() => handleDeleteRule(record.id)}>
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const alertColumns = [
    {
      title: '告警信息',
      key: 'message',
      width: 300,
      render: (record: Alert) => (
        <div>
          <Space>
            {getLevelIcon(record.level)}
            <span style={{ fontWeight: 500, fontSize: 13 }}>{record.message}</span>
          </Space>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            主机: {(record as any).host?.name || hosts.find(h => h.id === record.hostId)?.name || '-'}
          </div>
        </div>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      align: 'center' as const,
      render: (level: string) => (
        <Tag color={getLevelColor(level)} style={{ margin: 0 }}>{getLevelText(level)}</Tag>
      ),
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      width: 80,
      align: 'center' as const,
      render: (value: number) => <span style={{ fontSize: 13 }}>{value?.toFixed(1) || '-'}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: string) => (
        <Badge status={getStatusColor(status)} text={<span style={{ fontSize: 13 }}>{getStatusText(status)}</span>} />
      ),
    },
    {
      title: '触发时间',
      dataIndex: 'firedAt',
      key: 'firedAt',
      width: 160,
      render: (date: string) => <span style={{ fontSize: 13 }}>{dayjs(date).format('YYYY-MM-DD HH:mm:ss')}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (record: Alert) => (
        record.status?.toUpperCase() === 'FIRING' && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleAcknowledgeAlert(record.id)}>
            确认
          </Button>
        )
      ),
    },
  ]

  if (!currentProject) {
    return (
      <div style={{ padding: 24 }}>
        <Card><Empty description="请先选择一个项目" /></Card>
      </div>
    )
  }

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            <AlertOutlined style={{ marginRight: 8 }} />
            告警管理
          </h1>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>配置告警规则，监控系统异常</div>
        </div>
        {activeTab === 'rules' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRule}>创建告警规则</Button>
        )}
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}>告警规则</span>}
              value={stats.totalRules}
              prefix={<SafetyCertificateOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontSize: 24 }}
              suffix={<span style={{ fontSize: 12, color: '#999' }}>/ {stats.enabledRules} 启用</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}>触发中告警</span>}
              value={stats.firingAlerts}
              prefix={<ThunderboltOutlined style={{ color: stats.firingAlerts > 0 ? '#ff4d4f' : '#52c41a' }} />}
              valueStyle={{ fontSize: 24, color: stats.firingAlerts > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}>告警总数</span>}
              value={stats.totalAlerts}
              prefix={<BellOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}>监控主机</span>}
              value={hosts.filter(h => h.status?.toLowerCase() === 'online').length}
              prefix={<CheckOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 24 }}
              suffix={<span style={{ fontSize: 12, color: '#999' }}>/ {hosts.length}</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* 主内容 */}
      <Card style={{ borderRadius: 8 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'rules',
              label: <span><SafetyCertificateOutlined /> 告警规则</span>,
              children: alertRules.length > 0 ? (
                <Table
                  columns={ruleColumns}
                  dataSource={alertRules}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条规则` }}
                />
              ) : (
                <Empty 
                  description={
                    <span>
                      暂无告警规则<br/>
                      <span style={{ fontSize: 12, color: '#999' }}>点击上方按钮创建第一个告警规则</span>
                    </span>
                  }
                  style={{ padding: '60px 0' }}
                >
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRule}>创建告警规则</Button>
                </Empty>
              ),
            },
            {
              key: 'alerts',
              label: (
                <span>
                  <BellOutlined /> 告警记录
                  {stats.firingAlerts > 0 && <Badge count={stats.firingAlerts} style={{ marginLeft: 8 }} />}
                </span>
              ),
              children: alerts.length > 0 ? (
                <Table
                  columns={alertColumns}
                  dataSource={alerts}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
                />
              ) : (
                <Empty 
                  description={
                    <span>
                      暂无告警记录<br/>
                      <span style={{ fontSize: 12, color: '#999' }}>系统运行正常，没有触发任何告警</span>
                    </span>
                  }
                  style={{ padding: '60px 0' }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 创建/编辑告警规则 Modal */}
      <Modal
        title={editingRule ? '编辑告警规则' : '创建告警规则'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitRule} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
            <Input placeholder="例如：CPU使用率过高告警" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="metric" label="监控指标" rules={[{ required: true }]}>
                <Select>
                  <Option value="CPU">CPU使用率</Option>
                  <Option value="MEMORY">内存使用率</Option>
                  <Option value="DISK">磁盘使用率</Option>
                  <Option value="NETWORK_IN">网络入流量</Option>
                  <Option value="NETWORK_OUT">网络出流量</Option>
                  <Option value="LOAD">系统负载</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="operator" label="比较条件" rules={[{ required: true }]}>
                <Select>
                  <Option value="GT">大于 (&gt;)</Option>
                  <Option value="GTE">大于等于 (≥)</Option>
                  <Option value="LT">小于 (&lt;)</Option>
                  <Option value="LTE">小于等于 (≤)</Option>
                  <Option value="EQ">等于 (=)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="threshold" label="阈值" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="80" addonAfter="%" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="duration" label="持续时间" rules={[{ required: true }]} extra="指标持续超过阈值的时间">
                <InputNumber min={1} max={60} style={{ width: '100%' }} placeholder="5" addonAfter="分钟" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level" label="告警级别" rules={[{ required: true }]}>
                <Select>
                  <Option value="INFO"><Tag color="blue">信息</Tag></Option>
                  <Option value="WARNING"><Tag color="orange">警告</Tag></Option>
                  <Option value="ERROR"><Tag color="red">错误</Tag></Option>
                  <Option value="CRITICAL"><Tag color="red">严重</Tag></Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="hostIds" label="目标主机" extra="不选择则应用到所有在线主机">
            <Select
              mode="multiple"
              placeholder="选择要监控的主机（可多选）"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {hosts.filter(h => h.status?.toLowerCase() === 'online').map(host => (
                <Option key={host.id} value={host.id}>{host.name} ({host.ip})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Alerts
