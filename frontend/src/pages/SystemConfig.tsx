import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  message,
  Tabs,
  Space,
  Divider,
  Select,
  Modal,
  Typography
} from 'antd'
import {
  SettingOutlined,
  MailOutlined,
  SecurityScanOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons/lib/icons'
import { api } from '../utils/request'

const { TabPane } = Tabs
const { TextArea } = Input
const { Option } = Select
const { Text } = Typography

const SystemConfigPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  // 获取系统配置
  const fetchConfig = async () => {
    try {
      setLoading(true)
      const configData = await api.get('/system/config')
      form.setFieldsValue(configData)
    } catch (error) {
      message.error('获取系统配置失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存系统配置
  const handleSave = async (values: any) => {
    try {
      setLoading(true)
      await api.put('/system/config', values)
      message.success('系统配置保存成功')
      await fetchConfig()
    } catch (error) {
      message.error('保存系统配置失败')
    } finally {
      setLoading(false)
    }
  }

  // 重置系统配置
  const handleReset = () => {
    Modal.confirm({
      title: '确认重置',
      icon: <ExclamationCircleOutlined />,
      content: '确定要重置所有系统配置为默认值吗？此操作不可撤销。',
      okText: '确认重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true)
          await api.post('/system/config/reset')
          message.success('系统配置重置成功')
          await fetchConfig()
        } catch (error) {
          message.error('重置系统配置失败')
        } finally {
          setLoading(false)
        }
      }
    })
  }

  // 测试邮件配置
  const handleTestEmail = async () => {
    try {
      setTestingEmail(true)
      await api.post('/system/config/test-email')
      message.success('测试邮件发送成功，请检查邮箱')
    } catch (error) {
      message.error('测试邮件发送失败')
    } finally {
      setTestingEmail(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
            <SettingOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            系统配置
          </h1>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            管理系统全局配置参数和功能设置
          </Text>
        </div>
        <Space>
          <Button onClick={handleReset} danger>
            重置配置
          </Button>
          <Button 
            type="primary" 
            onClick={() => form.submit()}
            loading={loading}
          >
            保存配置
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        <Tabs defaultActiveKey="basic" type="card">
          {/* 基础设置 */}
          <TabPane 
            tab={
              <span>
                <GlobalOutlined />
                基础设置
              </span>
            } 
            key="basic"
          >
            <Card>
              <Form.Item
                label="系统名称"
                name="systemName"
                rules={[{ required: true, message: '请输入系统名称' }]}
              >
                <Input placeholder="请输入系统名称" />
              </Form.Item>

              <Form.Item
                label="系统描述"
                name="systemDescription"
              >
                <TextArea 
                  rows={3} 
                  placeholder="请输入系统描述"
                  showCount
                  maxLength={500}
                />
              </Form.Item>

              <Form.Item
                label="系统版本"
                name="systemVersion"
                rules={[{ required: true, message: '请输入系统版本' }]}
              >
                <Input placeholder="请输入系统版本" />
              </Form.Item>

              <Form.Item
                label="时区"
                name="timezone"
                rules={[{ required: true, message: '请选择时区' }]}
              >
                <Select placeholder="请选择时区">
                  <Option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</Option>
                  <Option value="UTC">UTC (UTC+0)</Option>
                  <Option value="America/New_York">America/New_York (UTC-5)</Option>
                  <Option value="Europe/London">Europe/London (UTC+0)</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="语言"
                name="language"
                rules={[{ required: true, message: '请选择语言' }]}
              >
                <Select placeholder="请选择语言">
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                </Select>
              </Form.Item>
            </Card>
          </TabPane>

          {/* 安全设置 */}
          <TabPane 
            tab={
              <span>
                <SecurityScanOutlined />
                安全设置
              </span>
            } 
            key="security"
          >
            <Card title="会话管理">
              <Form.Item
                label="会话超时时间（分钟）"
                name="sessionTimeout"
                rules={[{ required: true, message: '请输入会话超时时间' }]}
              >
                <InputNumber 
                  min={5} 
                  max={1440} 
                  placeholder="请输入会话超时时间"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Card>

            <Card title="密码策略" style={{ marginTop: '16px' }}>
              <Form.Item
                label="密码最小长度"
                name="passwordMinLength"
                rules={[{ required: true, message: '请输入密码最小长度' }]}
              >
                <InputNumber 
                  min={6} 
                  max={32} 
                  placeholder="请输入密码最小长度"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="密码必须包含特殊字符"
                name="passwordRequireSpecialChar"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Card>

            <Card title="账户安全" style={{ marginTop: '16px' }}>
              <Form.Item
                label="最大登录失败次数"
                name="maxLoginAttempts"
                rules={[{ required: true, message: '请输入最大登录失败次数' }]}
              >
                <InputNumber 
                  min={3} 
                  max={10} 
                  placeholder="请输入最大登录失败次数"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="账户锁定时长（分钟）"
                name="accountLockoutDuration"
                rules={[{ required: true, message: '请输入账户锁定时长' }]}
              >
                <InputNumber 
                  min={5} 
                  max={1440} 
                  placeholder="请输入账户锁定时长"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Card>
          </TabPane>

          {/* 任务设置 */}
          <TabPane 
            tab={
              <span>
                <ClockCircleOutlined />
                任务设置
              </span>
            } 
            key="task"
          >
            <Card>
              <Form.Item
                label="最大并发任务数"
                name="maxConcurrentTasks"
                rules={[{ required: true, message: '请输入最大并发任务数' }]}
              >
                <InputNumber 
                  min={1} 
                  max={100} 
                  placeholder="请输入最大并发任务数"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="任务超时时间（秒）"
                name="taskTimeout"
                rules={[{ required: true, message: '请输入任务超时时间' }]}
              >
                <InputNumber 
                  min={30} 
                  max={3600} 
                  placeholder="请输入任务超时时间"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="任务重试次数"
                name="taskRetryAttempts"
                rules={[{ required: true, message: '请输入任务重试次数' }]}
              >
                <InputNumber 
                  min={0} 
                  max={5} 
                  placeholder="请输入任务重试次数"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Card>
          </TabPane>

          {/* 监控设置 */}
          <TabPane 
            tab={
              <span>
                <FileTextOutlined />
                监控设置
              </span>
            } 
            key="monitoring"
          >
            <Card>
              <Form.Item
                label="启用监控数据收集"
                name="enableMetricsCollection"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="监控数据采集间隔（秒）"
                name="monitoringInterval"
                rules={[{ required: true, message: '请输入监控数据采集间隔' }]}
              >
                <InputNumber 
                  min={30} 
                  max={300} 
                  placeholder="请输入监控数据采集间隔"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="告警检查间隔（秒）"
                name="alertCheckInterval"
                rules={[{ required: true, message: '请输入告警检查间隔' }]}
              >
                <InputNumber 
                  min={10} 
                  max={300} 
                  placeholder="请输入告警检查间隔"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="监控数据保留天数"
                name="metricsRetentionDays"
                rules={[{ required: true, message: '请输入监控数据保留天数' }]}
              >
                <InputNumber 
                  min={7} 
                  max={365} 
                  placeholder="请输入监控数据保留天数"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Card>
          </TabPane>

          {/* 文件设置 */}
          <TabPane 
            tab={
              <span>
                <FileTextOutlined />
                文件设置
              </span>
            } 
            key="file"
          >
            <Card>
              <Form.Item
                label="最大文件大小（MB）"
                name="maxFileSize"
                rules={[{ required: true, message: '请输入最大文件大小' }]}
              >
                <InputNumber 
                  min={1} 
                  max={1024} 
                  placeholder="请输入最大文件大小"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="允许的文件类型"
                name="allowedFileTypes"
              >
                <Select
                  mode="tags"
                  placeholder="请输入允许的文件类型"
                  style={{ width: '100%' }}
                >
                  <Option value=".txt">.txt</Option>
                  <Option value=".log">.log</Option>
                  <Option value=".conf">.conf</Option>
                  <Option value=".yml">.yml</Option>
                  <Option value=".yaml">.yaml</Option>
                  <Option value=".json">.json</Option>
                  <Option value=".xml">.xml</Option>
                  <Option value=".sh">.sh</Option>
                  <Option value=".py">.py</Option>
                  <Option value=".js">.js</Option>
                </Select>
              </Form.Item>
            </Card>
          </TabPane>

          {/* 邮件设置 */}
          <TabPane 
            tab={
              <span>
                <MailOutlined />
                邮件设置
              </span>
            } 
            key="email"
          >
            <Card>
              <Form.Item
                label="SMTP 服务器"
                name="smtpHost"
              >
                <Input placeholder="请输入SMTP服务器地址" />
              </Form.Item>

              <Form.Item
                label="SMTP 端口"
                name="smtpPort"
              >
                <InputNumber 
                  min={1} 
                  max={65535} 
                  placeholder="请输入SMTP端口"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="启用SSL/TLS"
                name="smtpSecure"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="SMTP 用户名"
                name="smtpUser"
              >
                <Input placeholder="请输入SMTP用户名" />
              </Form.Item>

              <Form.Item
                label="SMTP 密码"
                name="smtpPassword"
              >
                <Input.Password placeholder="请输入SMTP密码" />
              </Form.Item>

              <Form.Item
                label="发件人邮箱"
                name="smtpFromEmail"
              >
                <Input placeholder="请输入发件人邮箱" />
              </Form.Item>

              <Form.Item
                label="发件人名称"
                name="smtpFromName"
              >
                <Input placeholder="请输入发件人名称" />
              </Form.Item>

              <Divider />

              <Space>
                <Button 
                  type="primary" 
                  icon={<MailOutlined />}
                  onClick={handleTestEmail}
                  loading={testingEmail}
                >
                  测试邮件配置
                </Button>
                <Text type="secondary">
                  将发送测试邮件到系统管理员邮箱
                </Text>
              </Space>
            </Card>
          </TabPane>

          {/* 功能开关 */}
          <TabPane 
            tab={
              <span>
                <SettingOutlined />
                功能开关
              </span>
            } 
            key="features"
          >
            <Card>
              <Form.Item
                label="启用审计日志"
                name="enableAuditLog"
                valuePropName="checked"
                extra="记录所有用户操作和API调用"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="启用通知功能"
                name="enableNotifications"
                valuePropName="checked"
                extra="启用邮件、钉钉、企业微信等通知渠道"
              >
                <Switch />
              </Form.Item>
            </Card>
          </TabPane>
        </Tabs>
      </Form>
    </div>
  )
}

export default SystemConfigPage