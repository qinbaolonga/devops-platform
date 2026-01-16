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
  Avatar,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  LockOutlined,
  ReloadOutlined,
} from '@ant-design/icons/lib/icons'
import { api } from '../utils/request'
import { User } from '../types'

const { Option } = Select

interface UserFormData {
  username: string
  email?: string
  password?: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'VIEWER'
  enabled: boolean
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await api.get<User[]>('/users')
      setUsers(data)
    } catch (error) {
      message.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({
      enabled: true,
      role: 'VIEWER',
    })
    setModalVisible(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`)
      message.success('删除成功')
      loadUsers()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async (values: UserFormData) => {
    try {
      if (editingUser) {
        // 编辑时不包含密码字段
        const { password, ...updateData } = values
        await api.patch(`/users/${editingUser.id}`, updateData)
        message.success('更新成功')
      } else {
        await api.post('/users', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadUsers()
    } catch (error) {
      message.error(editingUser ? '更新失败' : '创建失败')
    }
  }

  const handleToggleEnabled = async (user: User, enabled: boolean) => {
    try {
      await api.patch(`/users/${user.id}`, { enabled })
      message.success(enabled ? '已启用' : '已禁用')
      loadUsers()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user)
    passwordForm.resetFields()
    setPasswordModalVisible(true)
  }

  const handlePasswordSubmit = async (values: { password: string; confirmPassword: string }) => {
    if (!resetPasswordUser) return
    
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    try {
      await api.patch(`/users/${resetPasswordUser.id}`, { password: values.password })
      message.success('密码重置成功')
      setPasswordModalVisible(false)
    } catch (error) {
      message.error('密码重置失败')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'red'
      case 'ADMIN':
        return 'orange'
      case 'OPERATOR':
        return 'blue'
      case 'VIEWER':
        return 'green'
      default:
        return 'default'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '超级管理员'
      case 'ADMIN':
        return '管理员'
      case 'OPERATOR':
        return '操作员'
      case 'VIEWER':
        return '查看者'
      default:
        return role
    }
  }

  const columns = [
    {
      title: '用户信息',
      key: 'userInfo',
      render: (record: User) => (
        <div>
          <Space>
            <Avatar icon={<UserOutlined />} />
            <div>
              <div style={{ fontWeight: 'bold' }}>{record.username}</div>
              {record.email && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {record.email}
                </div>
              )}
            </div>
          </Space>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {getRoleText(role)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: User) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : '从未登录',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: User) => (
        <Space>
          <Tooltip title="重置密码">
            <Button
              type="text"
              icon={<LockOutlined />}
              onClick={() => handleResetPassword(record)}
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
            title="确定要删除这个用户吗？"
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

  const stats = {
    total: Array.isArray(users) ? users.length : 0,
    enabled: Array.isArray(users) ? users.filter(u => u.enabled).length : 0,
    disabled: Array.isArray(users) ? users.filter(u => !u.enabled).length : 0,
    admins: Array.isArray(users) ? users.filter(u => ['SUPER_ADMIN', 'ADMIN'].includes(u.role)).length : 0,
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>用户管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadUsers}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加用户
          </Button>
        </Space>
      </div>

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总用户数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用用户"
              value={stats.enabled}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="禁用用户"
              value={stats.disabled}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="管理员"
              value={stats.admins}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={Array.isArray(users) ? users : []}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 创建/编辑用户 Modal */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
            ]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱地址" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Option value="SUPER_ADMIN">超级管理员</Option>
              <Option value="ADMIN">管理员</Option>
              <Option value="OPERATOR">操作员</Option>
              <Option value="VIEWER">查看者</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码 Modal */}
      <Modal
        title={`重置密码 - ${resetPasswordUser?.username}`}
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onOk={() => passwordForm.submit()}
        width={400}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordSubmit}
        >
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Users