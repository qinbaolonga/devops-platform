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
  message,
  Popconfirm,
  Tooltip,
  Switch,
  Row,
  Col,
  Empty,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  WechatOutlined,
  SendOutlined,
  ApiOutlined,
} from '@ant-design/icons/lib/icons'
import { api } from '../utils/request'
import { useAppStore } from '../stores/app'
import { NotificationChannel } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

const Notifications: React.FC = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const { currentProject } = useAppStore()

  useEffect(() => {
    if (currentProject) {
      loadChannels()
    }
  }, [currentProject])

  const loadChannels = async () => {
    if (!currentProject) return
    
    setLoading(true)
    try {
      const response = await api.get<any>(`/projects/${currentProject.id}/notification-channels`)
      // 兼容两种返回格式：数组或分页对象
      const data = Array.isArray(response) ? response : (response.items || [])
      setChannels(data)
    } catch (error) {
      message.error('加载通知渠道失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingChannel(null)
    form.resetFields()
    form.setFieldsValue({ enabled: true, type: 'DINGTALK' })
    setModalVisible(true)
  }

  const handleEdit = (channel: NotificationChannel) => {
    setEditingChannel(channel)
    const config = channel.config as any || {}
    form.setFieldsValue({
      name: channel.name,
      type: channel.type,
      enabled: channel.enabled,
      webhook: config.webhook,
      secret: config.secret,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      to: config.to || config.recipients?.join(','),
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!currentProject) return
    
    try {
      await api.delete(`/projects/${currentProject.id}/notification-channels/${id}`)
      message.success('删除成功')
      loadChannels()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async (values: any) => {
    if (!currentProject) return
    
    const { name, type, enabled, webhook, secret, host, port, username, password, to } = values
    
    let config: any = {}
    if (type === 'DINGTALK') {
      config = { webhook, secret }
    } else if (type === 'WECHAT') {
      config = { webhook }
    } else if (type === 'EMAIL') {
      config = { 
        host, 
        port: parseInt(port), 
        username, 
        password, 
        recipients: to?.split(',').map((s: string) => s.trim()).filter(Boolean) 
      }
    }

    const data = { name, type, enabled, config }

    try {
      if (editingChannel) {
        await api.patch(`/projects/${currentProject.id}/notification-channels/${editingChannel.id}`, data)
        message.success('更新成功')
      } else {
        await api.post(`/projects/${currentProject.id}/notification-channels`, data)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadChannels()
    } catch (error) {
      message.error(editingChannel ? '更新失败' : '创建失败')
    }
  }

  const handleTest = async (channel: NotificationChannel) => {
    if (!currentProject) return
    
    setTestingId(channel.id)
    try {
      const result = await api.post<any>(`/projects/${currentProject.id}/notification-channels/${channel.id}/test`)
      if (result.success === false) {
        message.error(result.message || '测试失败')
      } else {
        message.success('测试消息已发送')
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '测试失败')
    } finally {
      setTestingId(null)
    }
  }

  const handleToggleEnabled = async (channel: NotificationChannel, enabled: boolean) => {
    if (!currentProject) return
    
    try {
      await api.patch(`/projects/${currentProject.id}/notification-channels/${channel.id}`, { enabled })
      message.success(enabled ? '已启用' : '已禁用')
      loadChannels()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const getTypeIcon = (type: string) => {
    const t = type?.toUpperCase()
    if (t === 'EMAIL') return <MailOutlined />
    if (t === 'DINGTALK') return <MessageOutlined />
    if (t === 'WECHAT') return <WechatOutlined />
    return <BellOutlined />
  }

  const getTypeText = (type: string) => {
    const t = type?.toUpperCase()
    if (t === 'EMAIL') return '邮件'
    if (t === 'DINGTALK') return '钉钉'
    if (t === 'WECHAT') return '企业微信'
    return type
  }

  const getTypeColor = (type: string) => {
    const t = type?.toUpperCase()
    if (t === 'EMAIL') return 'blue'
    if (t === 'DINGTALK') return 'cyan'
    if (t === 'WECHAT') return 'green'
    return 'default'
  }

  const renderConfigForm = (type: string) => {
    const t = type?.toUpperCase()
    if (t === 'EMAIL') {
      return (
        <>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="host" label="SMTP服务器" rules={[{ required: true, message: '请输入SMTP服务器' }]}>
                <Input placeholder="smtp.example.com" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="port" label="端口" rules={[{ required: true, message: '请输入端口' }]}>
                <Input placeholder="587" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder="your-email@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password placeholder="SMTP密码或应用密码" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="to" label="收件人" rules={[{ required: true, message: '请输入收件人' }]} extra="多个收件人用逗号分隔">
            <Input placeholder="admin@example.com, ops@example.com" />
          </Form.Item>
        </>
      )
    }
    if (t === 'DINGTALK') {
      return (
        <>
          <Form.Item name="webhook" label="Webhook URL" rules={[{ required: true, message: '请输入钉钉Webhook URL' }]}>
            <Input.TextArea rows={2} placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
          </Form.Item>
          <Form.Item name="secret" label="加签密钥" extra="可选，如果机器人开启了加签验证则需要填写">
            <Input placeholder="SEC..." />
          </Form.Item>
        </>
      )
    }
    if (t === 'WECHAT') {
      return (
        <Form.Item name="webhook" label="Webhook URL" rules={[{ required: true, message: '请输入企业微信Webhook URL' }]}>
          <Input.TextArea rows={2} placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." />
        </Form.Item>
      )
    }
    return null
  }

  // 统计
  const stats = {
    total: channels.length,
    enabled: channels.filter(c => c.enabled).length,
  }

  const columns = [
    {
      title: '渠道名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: NotificationChannel) => (
        <Space>
          {getTypeIcon(record.type)}
          <span style={{ fontWeight: 500, fontSize: 13 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      align: 'center' as const,
      render: (type: string) => (
        <Tag color={getTypeColor(type)} style={{ margin: 0 }}>{getTypeText(type)}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      align: 'center' as const,
      render: (enabled: boolean, record: NotificationChannel) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          size="small"
        />
      ),
    },
    {
      title: '配置信息',
      key: 'config',
      render: (record: NotificationChannel) => {
        const config = record.config as any || {}
        const t = record.type?.toUpperCase()
        if (t === 'EMAIL') {
          return (
            <div style={{ fontSize: 12, color: '#666' }}>
              <div>{config.host}:{config.port}</div>
              <div>收件人: {config.recipients?.join(', ') || config.to || '-'}</div>
            </div>
          )
        }
        if (t === 'DINGTALK' || t === 'WECHAT') {
          return (
            <div style={{ fontSize: 12, color: '#666' }}>
              <Tag color="green" icon={<CheckCircleOutlined />}>Webhook已配置</Tag>
            </div>
          )
        }
        return '-'
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => <span style={{ fontSize: 13 }}>{dayjs(date).format('YYYY-MM-DD HH:mm')}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      align: 'center' as const,
      render: (record: NotificationChannel) => (
        <Space size={4}>
          <Tooltip title="测试">
            <Button
              type="text"
              size="small"
              icon={<SendOutlined />}
              onClick={() => handleTest(record)}
              disabled={!record.enabled}
              loading={testingId === record.id}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm title="确定要删除这个通知渠道吗？" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
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
            <ApiOutlined style={{ marginRight: 8 }} />
            通知渠道
          </h1>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>配置告警通知的发送渠道</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加渠道</Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}>渠道总数</span>}
              value={stats.total}
              prefix={<BellOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}>已启用</span>}
              value={stats.enabled}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 24, color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 渠道列表 */}
      <Card style={{ borderRadius: 8 }}>
        {channels.length > 0 ? (
          <Table
            columns={columns}
            dataSource={channels}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 个渠道` }}
          />
        ) : (
          <Empty 
            description={
              <span>
                暂无通知渠道<br/>
                <span style={{ fontSize: 12, color: '#999' }}>添加钉钉、企业微信或邮件通知渠道</span>
              </span>
            }
            style={{ padding: '60px 0' }}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加渠道</Button>
          </Empty>
        )}
      </Card>

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingChannel ? '编辑通知渠道' : '添加通知渠道'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="渠道名称" rules={[{ required: true, message: '请输入渠道名称' }]}>
                <Input placeholder="例如：运维告警群" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="通知类型" rules={[{ required: true, message: '请选择通知类型' }]}>
                <Select placeholder="选择通知类型" disabled={!!editingChannel}>
                  <Option value="DINGTALK"><Space><MessageOutlined />钉钉机器人</Space></Option>
                  <Option value="WECHAT"><Space><WechatOutlined />企业微信机器人</Space></Option>
                  <Option value="EMAIL"><Space><MailOutlined />邮件通知</Space></Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => renderConfigForm(getFieldValue('type'))}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Notifications
