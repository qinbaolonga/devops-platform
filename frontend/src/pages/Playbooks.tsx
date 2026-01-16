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
  Row,
  Col,
  Typography,
  Tabs,
  List,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons/lib/icons'
import { api } from '../utils/request'
import { useAppStore } from '../stores/app'
import { Playbook, PlaybookVersion, Host } from '../types'

const { Option } = Select
const { TextArea } = Input
const { Text } = Typography

interface PlaybookFormData {
  name: string
  description?: string
  content: string
  variables?: Record<string, any>
}

interface ExecuteFormData {
  hostIds: string[]
  variables?: Record<string, any>
}

const Playbooks: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [executeModalVisible, setExecuteModalVisible] = useState(false)
  const [versionsModalVisible, setVersionsModalVisible] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null)
  const [executingPlaybook, setExecutingPlaybook] = useState<Playbook | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<PlaybookVersion[]>([])
  const [form] = Form.useForm()
  const [executeForm] = Form.useForm()
  const { currentProject } = useAppStore()

  useEffect(() => {
    if (currentProject) {
      loadPlaybooks()
      loadHosts()
    }
  }, [currentProject])

  const loadPlaybooks = async () => {
    if (!currentProject) return
    
    setLoading(true)
    try {
      const data = await api.get<{items: Playbook[], total: number} | Playbook[]>(`/projects/${currentProject.id}/playbooks`)
      // 兼容两种响应格式
      const playbooks = Array.isArray(data) ? data : (data.items || [])
      setPlaybooks(playbooks)
    } catch (error) {
      message.error('加载 Playbook 列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadHosts = async () => {
    if (!currentProject) return
    
    try {
      const data = await api.get<{items: Host[], total: number}>(`/projects/${currentProject.id}/hosts`)
      const hosts = data.items || []
      setHosts(hosts.filter(h => h.status?.toLowerCase() === 'online'))
    } catch (error) {
      message.error('加载主机列表失败')
    }
  }

  const handleAdd = () => {
    setEditingPlaybook(null)
    form.resetFields()
    form.setFieldsValue({
      content: `---
- name: Example Playbook
  hosts: all
  become: yes
  tasks:
    - name: Ensure a package is installed
      package:
        name: htop
        state: present
    
    - name: Create a directory
      file:
        path: /tmp/example
        state: directory
        mode: '0755'
`,
    })
    setModalVisible(true)
  }

  const handleEdit = (playbook: Playbook) => {
    setEditingPlaybook(playbook)
    form.setFieldsValue({
      name: playbook.name,
      description: playbook.description,
      content: playbook.content,
      variables: playbook.variables,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!currentProject) return
    
    try {
      await api.delete(`/projects/${currentProject.id}/playbooks/${id}`)
      message.success('删除成功')
      loadPlaybooks()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async (values: PlaybookFormData) => {
    if (!currentProject) return
    
    try {
      // 先验证语法
      await api.post(`/projects/${currentProject.id}/playbooks/validate`, {
        content: values.content,
      })

      if (editingPlaybook) {
        await api.patch(`/projects/${currentProject.id}/playbooks/${editingPlaybook.id}`, values)
        message.success('更新成功')
      } else {
        await api.post(`/projects/${currentProject.id}/playbooks`, values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadPlaybooks()
    } catch (error: any) {
      if (error.response?.data?.message?.includes('syntax')) {
        message.error('YAML 语法错误，请检查格式')
      } else {
        message.error(editingPlaybook ? '更新失败' : '创建失败')
      }
    }
  }

  const handleExecute = (playbook: Playbook) => {
    setExecutingPlaybook(playbook)
    executeForm.resetFields()
    setExecuteModalVisible(true)
  }

  const handleExecuteSubmit = async (values: ExecuteFormData) => {
    if (!currentProject || !executingPlaybook) return
    
    try {
      await api.post(`/projects/${currentProject.id}/playbooks/${executingPlaybook.id}/execute`, values)
      message.success('Playbook 执行已提交，请查看任务状态')
      setExecuteModalVisible(false)
    } catch (error) {
      message.error('执行失败')
    }
  }

  const handleViewVersions = async (playbook: Playbook) => {
    if (!currentProject) return
    
    try {
      const versions = await api.get<PlaybookVersion[]>(
        `/projects/${currentProject.id}/playbooks/${playbook.id}/versions`
      )
      setSelectedVersions(versions)
      setVersionsModalVisible(true)
    } catch (error) {
      message.error('加载版本历史失败')
    }
  }

  const handleCopyPlaybook = (playbook: Playbook) => {
    setEditingPlaybook(null)
    form.setFieldsValue({
      name: `${playbook.name} - 副本`,
      description: playbook.description,
      content: playbook.content,
      variables: playbook.variables,
    })
    setModalVisible(true)
  }

  const validateYaml = async () => {
    if (!currentProject) return
    
    const content = form.getFieldValue('content')
    if (!content) {
      message.warning('请输入 Playbook 内容')
      return
    }

    try {
      await api.post(`/projects/${currentProject.id}/playbooks/validate`, { content })
      message.success('YAML 语法验证通过')
    } catch (error) {
      message.error('YAML 语法错误，请检查格式')
    }
  }

  const columns = [
    {
      title: 'Playbook 名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Playbook) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (version: number) => (
        <Tag color="blue">v{version}</Tag>
      ),
    },
    {
      title: '最后修改',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '创建者',
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (user: any) => user?.username || '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Playbook) => (
        <Space>
          <Tooltip title="执行">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleExecute(record)}
            />
          </Tooltip>
          <Tooltip title="查看版本">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleViewVersions(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopyPlaybook(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个 Playbook 吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (!currentProject) {
    return (
      <div>
        <h1>Playbook 管理</h1>
        <Card>
          <p>请先选择一个项目</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Playbook 管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          创建 Playbook
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={Array.isArray(playbooks) ? playbooks : []}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 创建/编辑 Modal */}
      <Modal
        title={editingPlaybook ? '编辑 Playbook' : '创建 Playbook'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Playbook 名称"
                rules={[{ required: true, message: '请输入 Playbook 名称' }]}
              >
                <Input placeholder="请输入 Playbook 名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="描述">
                <Input placeholder="Playbook 描述" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="content"
            label={
              <Space>
                <span>Playbook 内容</span>
                <Button size="small" onClick={validateYaml} icon={<CheckCircleOutlined />}>
                  验证语法
                </Button>
              </Space>
            }
            rules={[{ required: true, message: '请输入 Playbook 内容' }]}
          >
            <TextArea
              rows={15}
              placeholder="请输入 YAML 格式的 Playbook 内容"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item name="variables" label="变量 (JSON 格式)">
            <TextArea
              rows={3}
              placeholder='{"var1": "value1", "var2": "value2"}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 执行 Modal */}
      <Modal
        title={`执行 Playbook - ${executingPlaybook?.name}`}
        open={executeModalVisible}
        onCancel={() => setExecuteModalVisible(false)}
        onOk={() => executeForm.submit()}
        width={600}
      >
        <Form
          form={executeForm}
          layout="vertical"
          onFinish={handleExecuteSubmit}
        >
          <Form.Item
            name="hostIds"
            label="目标主机"
            rules={[{ required: true, message: '请选择目标主机' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择要执行 Playbook 的主机"
              showSearch
              filterOption={(input, option) => {
                const children = option?.children?.toString()
                return children ? children.toLowerCase().includes(input.toLowerCase()) : false
              }}
            >
              {hosts.map(host => (
                <Option key={host.id} value={host.id}>
                  {host.name} ({host.ip})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="variables" label="运行时变量 (JSON 格式)">
            <TextArea
              rows={4}
              placeholder='{"var1": "value1", "var2": "value2"}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 版本历史 Modal */}
      <Modal
        title="版本历史"
        open={versionsModalVisible}
        onCancel={() => setVersionsModalVisible(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={Array.isArray(selectedVersions) ? selectedVersions : []}
          renderItem={(version) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color="blue">v{version.version}</Tag>
                    <Text>{new Date(version.createdAt).toLocaleString()}</Text>
                  </Space>
                }
                description={
                  <div>
                    <Text>创建者: {version.createdBy?.username}</Text>
                    {version.changelog && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">{version.changelog}</Text>
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  )
}

export default Playbooks