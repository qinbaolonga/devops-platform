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
  Avatar,
  List,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons/lib/icons'
import { api } from '../utils/request'
import { useAppStore } from '../stores/app'
import { Project, User, ProjectMember } from '../types'

const { Option } = Select
const { TextArea } = Input

interface ProjectFormData {
  name: string
  description?: string
}

interface MemberFormData {
  userId: string
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER'
}

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [membersModalVisible, setMembersModalVisible] = useState(false)
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [form] = Form.useForm()
  const [memberForm] = Form.useForm()
  const { currentProject, setCurrentProject, loadProjects } = useAppStore()

  useEffect(() => {
    loadProjectList()
    loadUsers()
  }, [])

  const loadProjectList = async () => {
    setLoading(true)
    try {
      const data = await api.get<Project[]>('/projects')
      setProjects(data)
    } catch (error) {
      message.error('加载项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await api.get<User[]>('/users')
      setUsers(data)
    } catch (error) {
      message.error('加载用户列表失败')
    }
  }

  const loadMembers = async (projectId: string) => {
    try {
      const data = await api.get<ProjectMember[]>(`/projects/${projectId}/members`)
      setMembers(data)
    } catch (error) {
      message.error('加载项目成员失败')
    }
  }

  const handleAdd = () => {
    setEditingProject(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    form.setFieldsValue({
      name: project.name,
      description: project.description,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/projects/${id}`)
      message.success('删除成功')
      loadProjectList()
      loadProjects() // 更新全局项目列表
      
      // 如果删除的是当前项目，清除当前项目
      if (currentProject?.id === id) {
        setCurrentProject(null)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async (values: ProjectFormData) => {
    try {
      if (editingProject) {
        await api.patch(`/projects/${editingProject.id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/projects', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadProjectList()
      loadProjects() // 更新全局项目列表
    } catch (error) {
      message.error(editingProject ? '更新失败' : '创建失败')
    }
  }

  const handleViewMembers = async (project: Project) => {
    setSelectedProject(project)
    await loadMembers(project.id)
    setMembersModalVisible(true)
  }

  const handleAddMember = () => {
    memberForm.resetFields()
    setAddMemberModalVisible(true)
  }

  const handleAddMemberSubmit = async (values: MemberFormData) => {
    if (!selectedProject) return
    
    try {
      await api.post(`/projects/${selectedProject.id}/members`, values)
      message.success('添加成员成功')
      setAddMemberModalVisible(false)
      loadMembers(selectedProject.id)
    } catch (error) {
      message.error('添加成员失败')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProject) return
    
    try {
      await api.delete(`/projects/${selectedProject.id}/members/${memberId}`)
      message.success('移除成员成功')
      loadMembers(selectedProject.id)
    } catch (error) {
      message.error('移除成员失败')
    }
  }

  const handleSwitchProject = (project: Project) => {
    setCurrentProject(project)
    message.success(`已切换到项目: ${project.name}`)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'purple'
      case 'ADMIN':
        return 'red'
      case 'MEMBER':
        return 'blue'
      case 'VIEWER':
        return 'green'
      default:
        return 'default'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'OWNER':
        return '所有者'
      case 'ADMIN':
        return '管理员'
      case 'MEMBER':
        return '成员'
      case 'VIEWER':
        return '查看者'
      default:
        return role
    }
  }

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {text}
            {currentProject?.id === record.id && (
              <Tag color="blue" style={{ marginLeft: 8 }}>当前</Tag>
            )}
          </div>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '成员数量',
      dataIndex: 'memberCount',
      key: 'memberCount',
      render: (count: number) => (
        <Space>
          <TeamOutlined />
          {count || 0}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '创建者',
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (user: User) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          {user?.username || '-'}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Project) => (
        <Space>
          {currentProject?.id !== record.id && (
            <Tooltip title="切换到此项目">
              <Button
                type="text"
                onClick={() => handleSwitchProject(record)}
              >
                切换
              </Button>
            </Tooltip>
          )}
          <Tooltip title="查看成员">
            <Button
              type="text"
              icon={<TeamOutlined />}
              onClick={() => handleViewMembers(record)}
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
            title="确定要删除这个项目吗？"
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>项目管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          创建项目
        </Button>
      </div>

      {currentProject && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={18}>
              <h3>当前项目: {currentProject.name}</h3>
              <p>{currentProject.description}</p>
            </Col>
            <Col span={6}>
              <Statistic
                title="项目成员"
                value={currentProject.memberCount || 0}
                prefix={<TeamOutlined />}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={Array.isArray(projects) ? projects : []}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 创建/编辑项目 Modal */}
      <Modal
        title={editingProject ? '编辑项目' : '创建项目'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>

          <Form.Item name="description" label="项目描述">
            <TextArea rows={3} placeholder="项目描述信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目成员 Modal */}
      <Modal
        title={`项目成员 - ${selectedProject?.name}`}
        open={membersModalVisible}
        onCancel={() => setMembersModalVisible(false)}
        footer={[
          <Button key="add" type="primary" onClick={handleAddMember}>
            添加成员
          </Button>,
          <Button key="close" onClick={() => setMembersModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        <List
          dataSource={Array.isArray(members) ? members : []}
          renderItem={(member) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="remove"
                  title="确定要移除这个成员吗？"
                  onConfirm={() => handleRemoveMember(member.id)}
                >
                  <Button type="text" danger size="small">
                    移除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <Space>
                    {member.user.username}
                    <Tag color={getRoleColor(member.role)}>
                      {getRoleText(member.role)}
                    </Tag>
                  </Space>
                }
                description={member.user.email}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* 添加成员 Modal */}
      <Modal
        title="添加项目成员"
        open={addMemberModalVisible}
        onCancel={() => setAddMemberModalVisible(false)}
        onOk={() => memberForm.submit()}
        width={400}
      >
        <Form
          form={memberForm}
          layout="vertical"
          onFinish={handleAddMemberSubmit}
        >
          <Form.Item
            name="userId"
            label="选择用户"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select
              placeholder="选择要添加的用户"
              showSearch
              filterOption={(input: string, option: any) => {
                const children = option?.children
                if (typeof children === 'string') {
                  return children.toLowerCase().includes(input.toLowerCase())
                }
                return false
              }}
            >
              {Array.isArray(users) ? users
                .filter(user => !members.some(member => member.user.id === user.id))
                .map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </Option>
                )) : []
              }
            </Select>
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
            initialValue="VIEWER"
          >
            <Select>
              <Option value="ADMIN">管理员</Option>
              <Option value="MEMBER">成员</Option>
              <Option value="VIEWER">查看者</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Projects