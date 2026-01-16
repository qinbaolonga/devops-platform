import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Space,
  Tag,
  Form,
  Input,
  Select,
  message,
  Row,
  Col,
  Typography,
  Divider,
  Checkbox,
  Tooltip,
  Badge,
  Empty,
  Spin,
  Alert,
  Modal,
  Tabs,
} from 'antd'
import {
  PlayCircleOutlined,
  ThunderboltOutlined,
  DesktopOutlined,
  HistoryOutlined,
  StarOutlined,
  StarFilled,
  SearchOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons/lib/icons'
import { api } from '../utils/request'
import { useAppStore } from '../stores/app'
import { Host } from '../types'

const { Option } = Select
const { TextArea } = Input
const { Title, Text } = Typography

interface ExecuteResponse {
  taskId: string
  message: string
}

interface QuickCommand {
  name: string
  command: string
  category: string
  isCustom?: boolean
}

const defaultCommands: QuickCommand[] = [
  { name: '系统运行时间', command: 'uptime', category: '系统信息' },
  { name: '系统版本', command: 'cat /etc/os-release', category: '系统信息' },
  { name: '内核版本', command: 'uname -a', category: '系统信息' },
  { name: '主机名', command: 'hostname', category: '系统信息' },
  { name: '磁盘使用', command: 'df -h', category: '资源监控' },
  { name: '内存使用', command: 'free -h', category: '资源监控' },
  { name: 'CPU信息', command: 'lscpu | head -20', category: '资源监控' },
  { name: '系统负载', command: 'cat /proc/loadavg', category: '资源监控' },
  { name: 'Top进程', command: 'ps aux --sort=-%mem | head -15', category: '进程网络' },
  { name: '端口监听', command: 'ss -tlnp', category: '进程网络' },
  { name: '网络连接', command: 'ss -s', category: '进程网络' },
  { name: '网卡信息', command: 'ip addr', category: '进程网络' },
  { name: '系统日志', command: 'tail -50 /var/log/messages 2>/dev/null || tail -50 /var/log/syslog', category: '日志查看' },
  { name: '登录日志', command: 'last -20', category: '日志查看' },
  { name: '运行服务', command: 'systemctl list-units --type=service --state=running | head -20', category: '服务管理' },
  { name: 'Docker状态', command: 'docker ps 2>/dev/null || echo "Docker未安装"', category: '服务管理' },
]

const CommandExecute: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [customForm] = Form.useForm()
  const { currentProject } = useAppStore()
  
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [selectedHosts, setSelectedHosts] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [favoriteCommands, setFavoriteCommands] = useState<string[]>([])
  const [customCommands, setCustomCommands] = useState<QuickCommand[]>([])
  const [customModalVisible, setCustomModalVisible] = useState(false)
  const [editingCommand, setEditingCommand] = useState<QuickCommand | null>(null)
  const [activeTab, setActiveTab] = useState<string>('all')

  useEffect(() => {
    if (currentProject) {
      loadHosts()
    }
    const savedFavorites = localStorage.getItem('favoriteCommands')
    if (savedFavorites) {
      setFavoriteCommands(JSON.parse(savedFavorites))
    }
    const savedCustom = localStorage.getItem('customCommands')
    if (savedCustom) {
      setCustomCommands(JSON.parse(savedCustom))
    }
  }, [currentProject])

  const loadHosts = async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const response = await api.get<{items: Host[], total: number}>(
        `/projects/${currentProject.id}/hosts?pageSize=1000`
      )
      setHosts(response.items || [])
    } catch (error) {
      message.error('加载主机列表失败')
    } finally {
      setLoading(false)
    }
  }

  const onlineHosts = hosts.filter(h => h.status?.toLowerCase() === 'online')
  const offlineHosts = hosts.filter(h => h.status?.toLowerCase() !== 'online')

  const handleExecuteCommand = async (values: { command: string; timeout?: number }) => {
    if (!currentProject) return
    if (selectedHosts.length === 0) {
      message.warning('请选择至少一台目标主机')
      return
    }
    
    setExecuting(true)
    try {
      const response = await api.post<ExecuteResponse>(
        `/projects/${currentProject.id}/commands/execute`,
        {
          command: values.command,
          hostIds: selectedHosts,
          timeout: values.timeout || 300,
        }
      )
      message.success('命令已提交执行')
      if (response?.taskId) {
        navigate(`/tasks/${response.taskId}`)
      }
    } catch (error) {
      message.error('命令执行失败')
    } finally {
      setExecuting(false)
    }
  }

  const handleQuickCommand = (cmd: QuickCommand) => {
    form.setFieldsValue({ command: cmd.command })
  }

  const toggleFavorite = (command: string) => {
    const newFavorites = favoriteCommands.includes(command)
      ? favoriteCommands.filter(c => c !== command)
      : [...favoriteCommands, command]
    setFavoriteCommands(newFavorites)
    localStorage.setItem('favoriteCommands', JSON.stringify(newFavorites))
  }

  const handleSelectAll = () => {
    setSelectedHosts(onlineHosts.map(h => h.id))
  }

  const handleClearSelection = () => {
    setSelectedHosts([])
  }

  const handleHostToggle = (hostId: string) => {
    setSelectedHosts(prev => 
      prev.includes(hostId) 
        ? prev.filter(id => id !== hostId)
        : [...prev, hostId]
    )
  }

  const handleAddCustomCommand = () => {
    setEditingCommand(null)
    customForm.resetFields()
    setCustomModalVisible(true)
  }

  const handleEditCustomCommand = (cmd: QuickCommand) => {
    setEditingCommand(cmd)
    customForm.setFieldsValue(cmd)
    setCustomModalVisible(true)
  }

  const handleDeleteCustomCommand = (cmd: QuickCommand) => {
    const newCustom = customCommands.filter(c => c.command !== cmd.command)
    setCustomCommands(newCustom)
    localStorage.setItem('customCommands', JSON.stringify(newCustom))
    message.success('删除成功')
  }

  const handleSaveCustomCommand = (values: { name: string; command: string; category: string }) => {
    let newCustom: QuickCommand[]
    if (editingCommand) {
      newCustom = customCommands.map(c => 
        c.command === editingCommand.command ? { ...values, isCustom: true } : c
      )
    } else {
      newCustom = [...customCommands, { ...values, isCustom: true }]
    }
    setCustomCommands(newCustom)
    localStorage.setItem('customCommands', JSON.stringify(newCustom))
    setCustomModalVisible(false)
    message.success(editingCommand ? '修改成功' : '添加成功')
  }

  const allCommands = [...defaultCommands, ...customCommands]
  const categories = ['全部', ...Array.from(new Set(allCommands.map(c => c.category)))]
  
  const getFilteredCommands = () => {
    let commands = allCommands
    if (activeTab === 'favorites') {
      commands = allCommands.filter(cmd => favoriteCommands.includes(cmd.command))
    } else if (activeTab === 'custom') {
      commands = customCommands
    }
    
    return commands.filter(cmd => {
      if (selectedCategory !== '全部' && cmd.category !== selectedCategory) return false
      if (searchText && !cmd.name.toLowerCase().includes(searchText.toLowerCase()) && 
          !cmd.command.toLowerCase().includes(searchText.toLowerCase())) return false
      return true
    })
  }

  const filteredCommands = getFilteredCommands()

  if (!currentProject) {
    return (
      <div style={{ padding: 24 }}>
        <Card><Empty description="请先选择一个项目" /></Card>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <ThunderboltOutlined style={{ marginRight: 8, color: '#00d4ff' }} />
            命令执行
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.5)' }}>在多台主机上批量执行命令</Text>
        </div>
        <Button icon={<HistoryOutlined />} onClick={() => navigate('/tasks')}>执行历史</Button>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card title={<Space><PlayCircleOutlined />命令输入</Space>} style={{ marginBottom: 24 }}>
            <Form form={form} layout="vertical" onFinish={handleExecuteCommand} initialValues={{ timeout: 300 }}>
              <Form.Item name="command" label="执行命令" rules={[{ required: true, message: '请输入要执行的命令' }]}>
                <TextArea 
                  rows={5} 
                  placeholder="输入要执行的命令，支持多行命令"
                  style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 13 }}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="timeout" label="超时时间" extra="命令执行的最大等待时间">
                    <Select>
                      <Option value={60}>1 分钟</Option>
                      <Option value={300}>5 分钟</Option>
                      <Option value={600}>10 分钟</Option>
                      <Option value={1800}>30 分钟</Option>
                      <Option value={3600}>1 小时</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="已选主机">
                    <div style={{ 
                      padding: '8px 12px', 
                      background: 'rgba(0,0,0,0.2)', 
                      borderRadius: 6,
                      border: '1px solid rgba(0, 212, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Space>
                        <Badge count={selectedHosts.length} style={{ backgroundColor: selectedHosts.length > 0 ? '#00ff88' : '#666' }} />
                        <Text>台主机</Text>
                      </Space>
                      {selectedHosts.length > 0 && (
                        <Button type="link" size="small" onClick={handleClearSelection} icon={<ClearOutlined />}>清空</Button>
                      )}
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              <Button 
                type="primary" 
                htmlType="submit" 
                loading={executing}
                icon={<PlayCircleOutlined />}
                size="large"
                block
                disabled={selectedHosts.length === 0}
                style={{ height: 48 }}
              >
                {executing ? '执行中...' : `执行命令 (${selectedHosts.length} 台主机)`}
              </Button>
            </Form>
          </Card>

          <Card 
            title={<Space><ThunderboltOutlined />快捷命令</Space>}
            extra={
              <Space>
                <Input.Search
                  placeholder="搜索命令"
                  allowClear
                  size="small"
                  style={{ width: 160 }}
                  onSearch={setSearchText}
                  onChange={e => setSearchText(e.target.value)}
                />
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddCustomCommand}>
                  添加命令
                </Button>
              </Space>
            }
          >
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={[
                { key: 'all', label: '全部命令' },
                { key: 'favorites', label: `收藏 (${favoriteCommands.length})` },
                { key: 'custom', label: `自定义 (${customCommands.length})` },
              ]}
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
              <Space wrap size={[8, 8]}>
                {categories.map(cat => (
                  <Tag
                    key={cat}
                    color={selectedCategory === cat ? 'blue' : 'default'}
                    style={{ cursor: 'pointer', padding: '4px 12px' }}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Tag>
                ))}
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {filteredCommands.map((cmd, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: '1px solid rgba(0, 212, 255, 0.15)',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => handleQuickCommand(cmd)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.4)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.2)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {cmd.name}
                        {cmd.isCustom && <Tag color="purple" style={{ fontSize: 10 }}>自定义</Tag>}
                      </div>
                      <Text 
                        style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={cmd.command}
                      >
                        {cmd.command}
                      </Text>
                    </div>
                    <Space size={4}>
                      {cmd.isCustom && (
                        <>
                          <Tooltip title="编辑">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined style={{ fontSize: 12 }} />}
                              onClick={(e) => { e.stopPropagation(); handleEditCustomCommand(cmd) }}
                            />
                          </Tooltip>
                          <Tooltip title="删除">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                              onClick={(e) => { e.stopPropagation(); handleDeleteCustomCommand(cmd) }}
                            />
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title={favoriteCommands.includes(cmd.command) ? '取消收藏' : '收藏'}>
                        <Button
                          type="text"
                          size="small"
                          icon={favoriteCommands.includes(cmd.command) ? 
                            <StarFilled style={{ color: '#faad14', fontSize: 14 }} /> : 
                            <StarOutlined style={{ fontSize: 14 }} />
                          }
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(cmd.command) }}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                </div>
              ))}
            </div>

            {filteredCommands.length === 0 && (
              <Empty description={activeTab === 'favorites' ? '暂无收藏命令' : activeTab === 'custom' ? '暂无自定义命令' : '没有找到匹配的命令'} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <DesktopOutlined />
                <span>选择目标主机</span>
                <Badge count={`${onlineHosts.length}/${hosts.length}`} style={{ backgroundColor: '#00ff88' }} />
              </Space>
            }
            extra={
              <Space>
                <Button size="small" onClick={handleSelectAll} disabled={onlineHosts.length === 0}>全选在线</Button>
                <Button size="small" onClick={handleClearSelection} disabled={selectedHosts.length === 0}>清空</Button>
              </Space>
            }
            style={{ position: 'sticky', top: 24 }}
            styles={{ body: { maxHeight: 'calc(100vh - 250px)', overflow: 'auto' } }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="加载主机列表..." /></div>
            ) : onlineHosts.length === 0 ? (
              <Empty description="没有在线主机" />
            ) : (
              <>
                <Input.Search placeholder="搜索主机名或IP" allowClear style={{ marginBottom: 16 }} prefix={<SearchOutlined />} />

                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>在线主机 ({onlineHosts.length})</Text>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {onlineHosts.map(host => (
                    <div
                      key={host.id}
                      style={{
                        padding: '12px 16px',
                        background: selectedHosts.includes(host.id) ? 'rgba(0, 212, 255, 0.15)' : 'rgba(0,0,0,0.2)',
                        borderRadius: 8,
                        border: selectedHosts.includes(host.id) ? '1px solid rgba(0, 212, 255, 0.5)' : '1px solid rgba(0, 212, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => handleHostToggle(host.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Checkbox checked={selectedHosts.includes(host.id)} />
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {host.name}
                              {selectedHosts.includes(host.id) && (
                                <CheckCircleOutlined style={{ marginLeft: 8, color: '#00ff88' }} />
                              )}
                            </div>
                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                              {host.ip}
                              {host.osType && ` · ${host.osType}`}
                            </Text>
                          </div>
                        </div>
                        <Badge status="success" text={<span style={{ color: '#00ff88' }}>在线</span>} />
                      </div>
                    </div>
                  ))}
                </div>

                {offlineHosts.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginTop: 16 }}
                    message={`${offlineHosts.length} 台主机离线，无法执行命令`}
                  />
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingCommand ? '编辑命令' : '添加自定义命令'}
        open={customModalVisible}
        onCancel={() => setCustomModalVisible(false)}
        onOk={() => customForm.submit()}
      >
        <Form form={customForm} layout="vertical" onFinish={handleSaveCustomCommand}>
          <Form.Item name="name" label="命令名称" rules={[{ required: true, message: '请输入命令名称' }]}>
            <Input placeholder="例如：查看磁盘使用" />
          </Form.Item>
          <Form.Item name="command" label="命令内容" rules={[{ required: true, message: '请输入命令内容' }]}>
            <TextArea rows={3} placeholder="例如：df -h" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="选择分类">
              <Option value="系统信息">系统信息</Option>
              <Option value="资源监控">资源监控</Option>
              <Option value="进程网络">进程网络</Option>
              <Option value="日志查看">日志查看</Option>
              <Option value="服务管理">服务管理</Option>
              <Option value="自定义">自定义</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CommandExecute
