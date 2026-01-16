import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Badge,
  Row,
  Col,
  Statistic,
  Tabs,
  Empty,
  Breadcrumb,
  Checkbox,
  Upload,
  Progress,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  DesktopOutlined,
  FolderOutlined,
  FileOutlined,
  DownloadOutlined,
  HomeOutlined,
  FolderAddOutlined,
  UploadOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  FullscreenOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons/lib/icons'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { io, Socket } from 'socket.io-client'
import type { UploadFile, UploadProps } from 'antd'
import { api } from '../utils/request'
import { useAppStore } from '../stores/app'
import { Host } from '../types'
import * as XLSX from 'xlsx'
import 'xterm/css/xterm.css'

const { Option } = Select
const { TextArea } = Input
const { Dragger } = Upload

interface HostFormData {
  name: string
  hostname: string
  publicIp?: string
  privateIp?: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  privateKey?: string
  description?: string
  tags?: string[]
}

interface TerminalSession {
  id: string
  hostId: string
  hostName: string
  hostname: string
  createdAt: string
  isActive: boolean
}

interface TerminalTab {
  key: string
  title: string
  session: TerminalSession
  terminal: Terminal
  socket: Socket
  fitAddon: FitAddon
}

interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  permissions: string
  owner: string
  group: string
  modifiedAt: string
}

interface UploadTask {
  hostId: string
  hostName: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface ExecuteResponse {
  taskId: string
  message: string
}

const Hosts: React.FC = () => {
  const navigate = useNavigate()
  
  // 主机管理状态
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingHost, setEditingHost] = useState<Host | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [form] = Form.useForm()
  const { currentProject } = useAppStore()

  // 视图模式: 'list' 主机列表, 'detail' 主机详情(终端/文件)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const [selectedHost, setSelectedHost] = useState<Host | null>(null)
  const [detailTab, setDetailTab] = useState<'terminal' | 'files' | 'upload' | 'command'>('terminal')

  // 终端状态
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const terminalRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // 文件管理状态
  const [currentPath, setCurrentPath] = useState('/')
  const [files, setFiles] = useState<FileItem[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingFile, setEditingFile] = useState<FileItem | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // 批量上传状态
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([])
  const [uploadPath, setUploadPath] = useState('/tmp')

  // 批量设置密码状态
  const [batchPasswordModalVisible, setBatchPasswordModalVisible] = useState(false)
  const [batchPasswordForm] = Form.useForm()
  
  // 列表视图 Tab 状态
  const [listTab, setListTab] = useState<'hosts' | 'upload'>('hosts')
  
  // 搜索状态
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    if (currentProject) {
      loadHosts()
    }
    return () => {
      tabs.forEach(tab => {
        tab.socket.disconnect()
        tab.terminal.dispose()
      })
    }
  }, [currentProject])

  useEffect(() => {
    if (selectedHost && detailTab === 'files') {
      loadFiles(currentPath)
    }
  }, [selectedHost, detailTab])

  useEffect(() => {
    const handleResize = () => {
      tabs.forEach(tab => tab.fitAddon.fit())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [tabs])

  const loadHosts = async (search?: string) => {
    if (!currentProject) return
    setLoading(true)
    try {
      const searchParam = search !== undefined ? search : searchText
      const url = `/projects/${currentProject.id}/hosts?pageSize=1000${searchParam ? `&search=${encodeURIComponent(searchParam)}` : ''}`
      const response = await api.get<{items: Host[], total: number}>(url)
      setHosts(response.items || [])
    } catch (error) {
      message.error('加载主机列表失败')
    } finally {
      setLoading(false)
    }
  }

  // ==================== 主机管理功能 ====================
  const handleAdd = () => {
    setEditingHost(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (host: Host) => {
    setEditingHost(host)
    form.setFieldsValue({
      name: host.name,
      hostname: host.ip,
      publicIp: host.publicIp || '',
      privateIp: host.privateIp || '',
      port: host.port,
      username: host.username,
      authType: host.authType === 'PASSWORD' ? 'password' : 'key',
      password: '',
      tags: host.tags || [],
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!currentProject) return
    try {
      await api.delete(`/projects/${currentProject.id}/hosts/${id}`)
      message.success('删除成功')
      loadHosts()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async (values: HostFormData) => {
    if (!currentProject) return
    try {
      const submitData = { ...values }
      if (editingHost && (!values.password || values.password.trim() === '')) {
        delete submitData.password
      }
      if (editingHost) {
        await api.patch(`/projects/${currentProject.id}/hosts/${editingHost.id}`, submitData)
        message.success('更新成功')
      } else {
        await api.post(`/projects/${currentProject.id}/hosts`, submitData)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadHosts()
    } catch (error) {
      message.error(editingHost ? '更新失败' : '创建失败')
    }
  }

  const handleTestConnection = async (host: Host) => {
    if (!currentProject) return
    try {
      message.loading('正在测试连接...', 0)
      await api.post(`/projects/${currentProject.id}/hosts/${host.id}/test`)
      message.destroy()
      message.success('连接测试成功')
      loadHosts()
    } catch (error) {
      message.destroy()
      message.error('连接测试失败')
    }
  }

  const handleCollectInfo = async (host: Host) => {
    if (!currentProject) return
    try {
      message.loading('正在采集主机信息...', 0)
      await api.post(`/projects/${currentProject.id}/hosts/${host.id}/collect`)
      message.destroy()
      message.success('信息采集成功')
      loadHosts()
    } catch (error) {
      message.destroy()
      message.error('信息采集失败')
    }
  }

  const handleBatchTestConnection = async () => {
    if (!currentProject || selectedRowKeys.length === 0) return
    try {
      message.loading('正在批量测试连接...', 0)
      await Promise.all(selectedRowKeys.map(hostId => 
        api.post(`/projects/${currentProject.id}/hosts/${hostId}/test`)
      ))
      message.destroy()
      message.success(`成功测试 ${selectedRowKeys.length} 台主机连接`)
      loadHosts()
      setSelectedRowKeys([])
    } catch (error) {
      message.destroy()
      message.error('批量测试连接失败')
    }
  }

  const handleBatchCollectInfo = async () => {
    if (!currentProject || selectedRowKeys.length === 0) return
    try {
      message.loading('正在批量采集信息...', 0)
      await Promise.all(selectedRowKeys.map(hostId => 
        api.post(`/projects/${currentProject.id}/hosts/${hostId}/collect`)
      ))
      message.destroy()
      message.success(`成功采集 ${selectedRowKeys.length} 台主机信息`)
      loadHosts()
      setSelectedRowKeys([])
    } catch (error) {
      message.destroy()
      message.error('批量信息采集失败')
    }
  }

  const handleBatchDelete = async () => {
    if (!currentProject || selectedRowKeys.length === 0) return
    try {
      await Promise.all(selectedRowKeys.map(hostId => 
        api.delete(`/projects/${currentProject.id}/hosts/${hostId}`)
      ))
      message.success(`成功删除 ${selectedRowKeys.length} 台主机`)
      loadHosts()
      setSelectedRowKeys([])
    } catch (error) {
      message.error('批量删除失败')
    }
  }

  const handleBatchSetPassword = async (values: { password: string; username?: string }) => {
    if (!currentProject || selectedRowKeys.length === 0) return
    try {
      message.loading('正在批量设置密码...', 0)
      const updateData: any = { 
        password: values.password,
        authType: 'password'
      }
      if (values.username) {
        updateData.username = values.username
      }
      
      await Promise.all(selectedRowKeys.map(hostId => 
        api.patch(`/projects/${currentProject.id}/hosts/${hostId}`, updateData)
      ))
      message.destroy()
      message.success(`成功为 ${selectedRowKeys.length} 台主机设置密码`)
      setBatchPasswordModalVisible(false)
      batchPasswordForm.resetFields()
      loadHosts()
      setSelectedRowKeys([])
    } catch (error) {
      message.destroy()
      message.error('批量设置密码失败')
    }
  }

  const handleSearch = (value: string) => {
    setSearchText(value)
    loadHosts(value)
  }

  const handleSearchClear = () => {
    setSearchText('')
    loadHosts('')
  }

  const handleExport = () => {
    if (!hosts || hosts.length === 0) {
      // 如果没有主机数据，导出一个模板
      const templateData = [
        {
          主机名: '示例服务器1',
          IP地址: '192.168.1.100',
          公网IP: '1.2.3.4',
          内网IP: '192.168.1.100',
          端口: 22,
          用户名: 'root',
          密码: 'your_password_here',
          认证方式: '密码',
          标签: 'web,生产环境',
        },
        {
          主机名: '示例服务器2',
          IP地址: '192.168.1.101',
          公网IP: '',
          内网IP: '192.168.1.101',
          端口: 22,
          用户名: 'admin',
          密码: '',
          认证方式: '密钥',
          标签: 'database,测试环境',
        }
      ]
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(templateData)
      ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws, '主机导入模板')
      XLSX.writeFile(wb, `主机导入模板_${new Date().toISOString().split('T')[0]}.xlsx`)
      message.success('主机导入模板已下载，请参考模板格式准备数据')
      return
    }
    
    const exportData = hosts.map(host => ({
      主机名: host.name,
      IP地址: host.ip,
      公网IP: host.publicIp || '',
      内网IP: host.privateIp || '',
      端口: host.port,
      用户名: host.username,
      认证方式: host.authType === 'SSH_KEY' ? '密钥' : '密码',
      状态: getStatusText(host.status),
      操作系统: host.osType || '',
      系统版本: host.osVersion || '',
      CPU核心数: host.cpuCores || '',
      内存GB: host.memoryTotal ? (Number(host.memoryTotal.toString()) / (1024 * 1024 * 1024)).toFixed(1) : '',
      磁盘GB: host.diskTotal ? (Number(host.diskTotal.toString()) / (1024 * 1024 * 1024)).toFixed(1) : '',
      标签: host.tags?.join(',') || '',
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws, '主机列表')
    XLSX.writeFile(wb, `主机列表_${new Date().toISOString().split('T')[0]}.xlsx`)
    message.success('主机数据导出成功')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        let importData: any[] = []
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          importData = JSON.parse(text)
        } else {
          const buffer = await file.arrayBuffer()
          const wb = XLSX.read(buffer, { type: 'buffer' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(ws)
          
          console.log('Excel 原始数据:', jsonData)
          
          // 检查Excel文件的列名
          if (jsonData.length > 0) {
            const firstRow = jsonData[0] as Record<string, unknown>
            const availableColumns = Object.keys(firstRow)
            console.log('Excel文件可用列名:', availableColumns)
          }
          
          importData = jsonData.map((row: any, index: number) => {
            console.log(`处理第 ${index + 1} 行原始数据:`, row)
            
            // 分别提取不同类型的字段，避免混淆
            
            // 1. 主机名字段 - 只包含真正的主机名，不包含IP
            const nameFields = [
              // 标准列名
              row['主机名'], row['主机名称'], row['名称'], row['服务器名'], row['服务器名称'],
              row['hostname'], row['host'], row['name'], row['server'], row['机器名'],
              row['设备名'], row['节点名'], row['Host'], row['Name'], row['Hostname'],
              // 云服务商标准列名
              row['实例名称'], row['实例名'], row['Instance Name'], row['Instance ID'],
              row['云主机名'], row['ECS名称'], row['VM名称'], row['虚拟机名称']
            ].filter(v => v && String(v).trim() !== '' && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(String(v).trim()))
            
            // 2. 连接IP字段 - 用于SSH连接的主要IP地址
            const connectionIpFields = [
              // 优先使用明确标注为连接地址的字段
              row['连接地址'], row['SSH地址'], row['登录地址'],
              // 然后是通用IP字段
              row['IP地址'], row['IP'], row['ip'], row['地址'], row['主机地址'], row['服务器地址'],
              // 英文通用字段
              row['address'], row['server_ip'], row['Address'], row['Server_IP']
            ].filter(v => v && String(v).trim() !== '')
            
            // 3. 公网IP字段
            const publicIpFields = [
              row['公网IP'], row['外网IP'], row['公有IP'], row['公网IPv4地址'], 
              row['Public IP'], row['External IP'], row['EIP'], row['弹性IP'],
              row.publicIp, row.public_ip, row['Public_IP'], row['公网地址']
            ].filter(v => v && String(v).trim() !== '')
            
            // 4. 内网IP字段
            const privateIpFields = [
              row['内网IP'], row['私网IP'], row['局域网IP'], row['私网IPv4地址'],
              row['Private IP'], row['Internal IP'], row['VPC IP'], row['私有IP'],
              row.privateIp, row.private_ip, row['Private_IP'], row['内网地址']
            ].filter(v => v && String(v).trim() !== '')
            
            console.log(`第 ${index + 1} 行字段提取结果:`, {
              nameFields,
              connectionIpFields,
              publicIpFields,
              privateIpFields
            })
            
            // 如果没有找到连接IP，尝试从内网IP或公网IP中选择一个作为连接地址
            let finalConnectionIp = connectionIpFields[0]
            if (!finalConnectionIp) {
              // 优先使用内网IP作为连接地址（通常内网更稳定）
              finalConnectionIp = privateIpFields[0] || publicIpFields[0]
            }
            
            // 如果主机名字段中有IP格式的值，也可以作为连接IP的备选
            if (!finalConnectionIp) {
              nameFields.forEach(name => {
                const nameStr = String(name).trim()
                if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(nameStr)) {
                  finalConnectionIp = nameStr
                }
              })
            }
            
            const mappedData = {
              name: nameFields[0] || finalConnectionIp || `主机${index + 1}`,
              ip: finalConnectionIp,
              ...(publicIpFields[0] && publicIpFields[0].trim() !== '' && { publicIp: publicIpFields[0].trim() }),
              ...(privateIpFields[0] && privateIpFields[0].trim() !== '' && { privateIp: privateIpFields[0].trim() }),
              port: parseInt(row['端口'] || row['SSH端口'] || row.port || row.ssh_port || row['Port']) || 22,
              username: row['用户名'] || row['登录用户'] || row['用户'] || row.username || row.user || row['User'] || 'root',
              ...(row['密码'] || row['登录密码'] || row.password || row.pwd || row['Password']) && { password: row['密码'] || row['登录密码'] || row.password || row.pwd || row['Password'] },
              authType: (() => {
                const authValue = String(row['认证方式'] || row.authType || row.auth_type || row['Auth_Type'] || 'password').toLowerCase()
                return (authValue.includes('密钥') || authValue.includes('key') || authValue === 'ssh_key') ? 'key' : 'password'
              })(),
              tags: (() => {
                const tagValue = row['标签'] || row.tags || row['Tags'] || ''
                if (!tagValue) return []
                return String(tagValue).split(/[,，;；]/).map(t => t.trim()).filter(Boolean)
              })(),
            }
            
            console.log(`第 ${index + 1} 行最终映射数据:`, mappedData)
            
            // 验证必要字段
            if (!mappedData.name || String(mappedData.name).trim() === '') {
              const availableFields = Object.keys(row).filter(key => row[key] && String(row[key]).trim() !== '')
              throw new Error(`第 ${index + 1} 行：主机名不能为空。\n\n可用字段: ${availableFields.join(', ')}\n\n建议Excel列名: 主机名、名称、实例名称、hostname、name等`)
            }
            
            if (!mappedData.ip || String(mappedData.ip).trim() === '') {
              const availableFields = Object.keys(row).filter(key => row[key] && String(row[key]).trim() !== '')
              throw new Error(`第 ${index + 1} 行：连接地址不能为空。\n\n可用字段: ${availableFields.join(', ')}\n\n建议Excel列名: 连接地址、IP地址、IP、内网IP、私网IPv4地址等`)
            }
            
            // 验证publicIp和privateIp字段是否正确设置
            console.log(`第 ${index + 1} 行 IP 字段检查:`, {
              publicIp: mappedData.publicIp,
              privateIp: mappedData.privateIp,
              hasPublicIp: !!mappedData.publicIp,
              hasPrivateIp: !!mappedData.privateIp
            })
            
            return mappedData
          })
        }
        
        console.log('最终导入数据:', importData)
        
        if (Array.isArray(importData) && importData.length > 0) {
          let successCount = 0, failCount = 0
          const errors: string[] = []
          
          for (let i = 0; i < importData.length; i++) {
            const hostData = importData[i]
            try {
              console.log(`正在导入第 ${i + 1} 条数据:`, hostData)
              
              // 验证API请求数据
              console.log(`第 ${i + 1} 条数据 API 请求检查:`, {
                name: hostData.name,
                ip: hostData.ip,
                publicIp: hostData.publicIp,
                privateIp: hostData.privateIp,
                hasPublicIp: !!hostData.publicIp,
                hasPrivateIp: !!hostData.privateIp
              })
              
              // 如果没有密码且使用密码认证，提醒用户
              if (hostData.authType === 'password' && !hostData.password) {
                console.warn(`第 ${i + 1} 行：使用密码认证但未提供密码，主机 ${hostData.name} 可能无法连接`)
              }
              
              const response = await api.post(`/projects/${currentProject!.id}/hosts`, hostData)
              console.log(`第 ${i + 1} 条数据 API 响应:`, response)
              successCount++
            } catch (error: any) {
              failCount++
              const errorMsg = error.response?.data?.message || error.message || '未知错误'
              errors.push(`第 ${i + 1} 行: ${errorMsg}`)
              console.error(`导入第 ${i + 1} 条数据失败:`, error)
            }
          }
          
          if (successCount > 0) {
            message.success(`成功导入 ${successCount} 台主机${failCount > 0 ? `，失败 ${failCount} 台` : ''}`)
            if (errors.length > 0) {
              console.error('导入错误详情:', errors)
              Modal.error({
                title: '部分导入失败',
                content: (
                  <div>
                    <p>成功导入 {successCount} 台主机，失败 {failCount} 台</p>
                    <div style={{ maxHeight: 200, overflow: 'auto' }}>
                      {errors.map((error, index) => (
                        <div key={index} style={{ fontSize: '12px', color: '#ff4d4f' }}>{error}</div>
                      ))}
                    </div>
                  </div>
                ),
              })
            }
            loadHosts()
          } else {
            message.error('导入失败，请检查数据格式')
            if (errors.length > 0) {
              Modal.error({
                title: '导入失败详情',
                content: (
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    {errors.map((error, index) => (
                      <div key={index} style={{ fontSize: '12px', color: '#ff4d4f' }}>{error}</div>
                    ))}
                  </div>
                ),
              })
            }
          }
        } else {
          message.error('导入文件格式不正确或数据为空')
        }
      } catch (error: any) {
        console.error('导入文件解析失败:', error)
        message.error(`导入文件解析失败: ${error.message}`)
      }
    }
    input.click()
  }

  // ==================== 终端功能 ====================
  const handleOpenDetail = (host: Host) => {
    setSelectedHost(host)
    setViewMode('detail')
    setCurrentPath('/')
    if (host.status?.toLowerCase() === 'online') {
      createTerminalSession(host)
    }
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedHost(null)
  }

  const createTerminalSession = async (host: Host) => {
    if (!currentProject) return
    setDetailTab('terminal')
    const existingTab = tabs.find(t => t.session.hostId === host.id)
    if (existingTab) {
      setActiveTab(existingTab.key)
      setTimeout(() => existingTab.fitAddon.fit(), 100)
      return
    }
    try {
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        theme: { background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#d4d4d4', selectionBackground: '#264f78' },
      })
      const fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(webLinksAddon)

      const token = localStorage.getItem('token')
      const wsUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/terminal' 
        : `http://${window.location.hostname}:3000/terminal`
      const socket = io(wsUrl, {
        auth: { token },
        query: { projectId: currentProject.id, hostId: host.id },
        transports: ['websocket', 'polling'],
      })

      const sessionId = `${host.id}-${Date.now()}`
      const tab: TerminalTab = {
        key: sessionId,
        title: host.name,
        session: { id: sessionId, hostId: host.id, hostName: host.name, hostname: host.ip, createdAt: new Date().toISOString(), isActive: true },
        terminal, socket, fitAddon,
      }

      terminal.onData((data) => socket.emit('input', { input: data }))
      socket.on('data', (data: string) => terminal.write(data))
      socket.on('connect', () => {
        terminal.writeln(`\r\n连接到 ${host.name} (${host.ip})...\r\n`)
        socket.emit('create-session', { hostId: host.id, projectId: currentProject.id, cols: terminal.cols, rows: terminal.rows })
      })
      socket.on('session-created', () => terminal.writeln(`\r\n会话已创建，正在连接...\r\n`))
      socket.on('session-closed', () => terminal.writeln('\r\n\r\n会话已关闭'))
      socket.on('disconnect', () => terminal.writeln('\r\n\r\n连接已断开'))
      socket.on('error', (error: any) => terminal.writeln(`\r\n错误: ${error.message}`))

      setTabs(prev => [...prev, tab])
      setActiveTab(sessionId)
      setTimeout(() => {
        const element = terminalRefs.current[sessionId]
        if (element) { terminal.open(element); fitAddon.fit() }
      }, 100)
    } catch (error) {
      message.error('创建终端会话失败')
    }
  }

  const closeTab = (targetKey: string) => {
    const tab = tabs.find(t => t.key === targetKey)
    if (tab) { tab.socket.disconnect(); tab.terminal.dispose() }
    const newTabs = tabs.filter(t => t.key !== targetKey)
    setTabs(newTabs)
    if (activeTab === targetKey) setActiveTab(newTabs.length > 0 ? newTabs[0].key : '')
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    setTimeout(() => { tabs.find(t => t.key === key)?.fitAddon.fit() }, 100)
  }

  const handleFullscreen = () => {
    const element = terminalRefs.current[activeTab]
    if (element) {
      if (document.fullscreenElement) document.exitFullscreen()
      else element.requestFullscreen()
    }
  }

  // ==================== 文件管理功能 ====================
  const loadFiles = async (path: string) => {
    if (!currentProject || !selectedHost) return
    setFilesLoading(true)
    try {
      const data = await api.get<FileItem[]>(
        `/projects/${currentProject.id}/hosts/${selectedHost.id}/files/browse?path=${encodeURIComponent(path)}`
      )
      setFiles(Array.isArray(data) ? data : [])
      setCurrentPath(path)
    } catch (error) {
      message.error('加载文件列表失败')
    } finally {
      setFilesLoading(false)
    }
  }

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'directory') loadFiles(file.path)
  }

  const handleGoUp = () => {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    loadFiles('/' + parts.join('/') || '/')
  }

  const handleDownload = async (file: FileItem) => {
    if (!currentProject || !selectedHost) return
    setDownloadingFile(file.path)
    const hideLoading = message.loading(`正在下载 ${file.name}...`, 0)
    try {
      const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : `http://${window.location.hostname}:3000`
      const response = await fetch(
        `${backendUrl}/projects/${currentProject.id}/hosts/${selectedHost.id}/files/download?remotePath=${encodeURIComponent(file.path)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      if (!response.ok) throw new Error('下载失败')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = file.name
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); document.body.removeChild(a)
      hideLoading(); message.success(`${file.name} 下载成功`)
    } catch (error) {
      hideLoading(); message.error('下载失败')
    } finally {
      setDownloadingFile(null)
    }
  }

  const handleDeleteFile = async (file: FileItem) => {
    if (!currentProject || !selectedHost) return
    try {
      await api.delete(`/projects/${currentProject.id}/hosts/${selectedHost.id}/files`, { path: file.path, isDirectory: file.type === 'directory' })
      message.success('删除成功')
      loadFiles(currentPath)
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleEditFile = async (file: FileItem) => {
    if (!currentProject || !selectedHost) return
    const textExtensions = ['.txt', '.log', '.conf', '.cfg', '.ini', '.json', '.xml', '.yaml', '.yml', '.sh', '.bash', '.py', '.js', '.ts', '.html', '.css', '.md', '.env', '.properties', '.sql']
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!textExtensions.includes(ext) && file.name.indexOf('.') !== -1) {
      message.warning('只能编辑文本文件'); return
    }
    if (file.size > 1024 * 1024) {
      message.warning('文件过大，无法编辑（最大 1MB）'); return
    }
    const hideLoading = message.loading(`正在读取 ${file.name}...`, 0)
    try {
      const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : `http://${window.location.hostname}:3000`
      const response = await fetch(
        `${backendUrl}/projects/${currentProject.id}/hosts/${selectedHost.id}/files/content?remotePath=${encodeURIComponent(file.path)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      if (!response.ok) throw new Error('读取文件失败')
      const result = await response.json()
      setEditingFile(file)
      setFileContent(result.data?.content || result.content || '')
      setEditModalVisible(true)
      hideLoading()
    } catch (error: any) {
      hideLoading(); message.error(error.message || '读取文件失败')
    }
  }

  const handleSaveFile = async () => {
    if (!currentProject || !selectedHost || !editingFile) return
    const hideLoading = message.loading('正在保存...', 0)
    try {
      const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : `http://${window.location.hostname}:3000`
      const response = await fetch(
        `${backendUrl}/projects/${currentProject.id}/hosts/${selectedHost.id}/files/content`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ path: editingFile.path, content: fileContent }),
        }
      )
      if (!response.ok) throw new Error('保存失败')
      hideLoading(); message.success('保存成功')
      setEditModalVisible(false); setEditingFile(null); setFileContent('')
    } catch (error: any) {
      hideLoading(); message.error(error.message || '保存失败')
    }
  }

  const handleCreateFolder = async () => {
    if (!currentProject || !selectedHost || !newFolderName) return
    try {
      const newPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`
      await api.post(`/projects/${currentProject.id}/hosts/${selectedHost.id}/files/mkdir`, { path: newPath })
      message.success('创建成功')
      setNewFolderModalVisible(false); setNewFolderName('')
      loadFiles(currentPath)
    } catch (error) {
      message.error('创建失败')
    }
  }

  const handleSingleUpload = async (file: File) => {
    if (!currentProject || !selectedHost) return false
    const hideLoading = message.loading(`正在上传 ${file.name}...`, 0)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('remotePath', `${currentPath}/${file.name}`)
      const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : `http://${window.location.hostname}:3000`
      const response = await fetch(
        `${backendUrl}/projects/${currentProject.id}/hosts/${selectedHost.id}/files/upload`,
        { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: formData }
      )
      if (!response.ok) throw new Error('上传失败')
      hideLoading(); message.success(`${file.name} 上传成功`)
      loadFiles(currentPath)
    } catch (error) {
      hideLoading(); message.error('上传失败')
    }
    return false
  }

  // ==================== 批量上传功能 ====================
  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    beforeUpload: (file) => { setFileList(prev => [...prev, file as any]); return false },
    onRemove: (file) => { setFileList(prev => prev.filter(f => f.uid !== file.uid)) },
  }

  const handleSelectAllHosts = (checked: boolean) => {
    const onlineHosts = hosts.filter(h => h.status?.toLowerCase() === 'online')
    setSelectedHostIds(checked ? onlineHosts.map(h => h.id) : [])
  }

  const handleBatchUpload = async () => {
    if (fileList.length === 0) { message.warning('请先选择要上传的文件'); return }
    if (selectedHostIds.length === 0) { message.warning('请选择目标主机'); return }
    if (!uploadPath) { message.warning('请输入上传目录'); return }

    setUploading(true)
    const tasks: UploadTask[] = selectedHostIds.map(hostId => ({
      hostId, hostName: hosts.find(h => h.id === hostId)?.name || hostId, status: 'pending', progress: 0,
    }))
    setUploadTasks(tasks)

    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : `http://${window.location.hostname}:3000`
    for (const hostId of selectedHostIds) {
      setUploadTasks(prev => prev.map(t => t.hostId === hostId ? { ...t, status: 'uploading' } : t))
      try {
        for (let j = 0; j < fileList.length; j++) {
          const file = fileList[j]
          const formData = new FormData()
          formData.append('file', file as any)
          formData.append('remotePath', `${uploadPath}/${file.name}`)
          const response = await fetch(
            `${backendUrl}/projects/${currentProject!.id}/hosts/${hostId}/files/upload`,
            { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: formData }
          )
          if (!response.ok) throw new Error('上传失败')
          setUploadTasks(prev => prev.map(t => t.hostId === hostId ? { ...t, progress: Math.round(((j + 1) / fileList.length) * 100) } : t))
        }
        setUploadTasks(prev => prev.map(t => t.hostId === hostId ? { ...t, status: 'success', progress: 100 } : t))
      } catch (error: any) {
        setUploadTasks(prev => prev.map(t => t.hostId === hostId ? { ...t, status: 'error', error: error.message } : t))
      }
    }
    setUploading(false)
    message.success('批量上传完成')
  }

  // ==================== 辅助函数 ====================
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online': return 'success'
      case 'offline': return 'error'
      case 'unknown': return 'default'
      default: return 'processing'
    }
  }

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online': return '在线'
      case 'offline': return '离线'
      case 'unknown': return '未知'
      default: return '检测中'
    }
  }

  const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
  }

  const onlineHosts = hosts.filter(h => h.status?.toLowerCase() === 'online')
  const stats = {
    total: hosts.length,
    online: hosts.filter(h => h.status?.toLowerCase() === 'online').length,
    offline: hosts.filter(h => h.status?.toLowerCase() === 'offline').length,
    unknown: hosts.filter(h => h.status?.toLowerCase() === 'unknown').length,
  }

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 获取当前页的数据
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return hosts.slice(startIndex, endIndex)
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
    selections: [
      {
        key: 'all',
        text: '全选所有',
        onSelect: () => {
          setSelectedRowKeys(hosts.map(h => h.id))
        },
      },
      {
        key: 'currentPage',
        text: '选择当前页',
        onSelect: () => {
          const currentPageIds = getCurrentPageData().map(h => h.id)
          setSelectedRowKeys(currentPageIds)
        },
      },
      {
        key: 'invert',
        text: '反选',
        onSelect: () => {
          const newSelectedKeys = hosts
            .filter(h => !selectedRowKeys.includes(h.id))
            .map(h => h.id)
          setSelectedRowKeys(newSelectedKeys)
        },
      },
      {
        key: 'none',
        text: '取消全选',
        onSelect: () => {
          setSelectedRowKeys([])
        },
      },
    ],
  }

  // ==================== 表格列定义 ====================
  const columns = [
    {
      title: '主机名',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      ellipsis: true,
      render: (name: string) => (
        <span style={{ fontWeight: 500, fontSize: '13px' }}>{name}</span>
      ),
    },
    {
      title: '连接地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (ip: string) => (
        <span style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: '13px' }}>{ip}</span>
      ),
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port',
      width: 60,
      align: 'center' as const,
      render: (port: number) => (
        <span style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: '13px' }}>{port}</span>
      ),
    },
    {
      title: '公网IP',
      dataIndex: 'publicIp',
      key: 'publicIp',
      width: 130,
      render: (publicIp: string) => (
        publicIp ? (
          <span style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: '13px' }}>{publicIp}</span>
        ) : (
          <span style={{ color: '#bfbfbf', fontSize: '12px' }}>-</span>
        )
      ),
    },
    {
      title: '内网IP',
      dataIndex: 'privateIp',
      key: 'privateIp',
      width: 130,
      render: (privateIp: string) => (
        privateIp ? (
          <span style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: '13px' }}>{privateIp}</span>
        ) : (
          <span style={{ color: '#bfbfbf', fontSize: '12px' }}>-</span>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center' as const,
      render: (status: string) => <Badge status={getStatusColor(status)} text={<span style={{ fontSize: '13px' }}>{getStatusText(status)}</span>} />,
    },
    {
      title: '系统',
      key: 'systemInfo',
      width: 100,
      ellipsis: true,
      render: (record: Host) => (
        record.osType ? (
          <Tooltip title={`${record.osType} ${record.osVersion || ''}`}>
            <Tag color="blue" style={{ fontSize: '12px', margin: 0 }}>{record.osType}</Tag>
          </Tooltip>
        ) : (
          <span style={{ color: '#bfbfbf', fontSize: '12px' }}>-</span>
        )
      ),
    },
    {
      title: '配置',
      key: 'hardware',
      width: 90,
      render: (record: Host) => {
        const parts = []
        if (record.cpuCores) parts.push(`${record.cpuCores}C`)
        if (record.memoryTotal && Number(record.memoryTotal) > 0) parts.push(`${(Number(record.memoryTotal) / (1024 * 1024 * 1024)).toFixed(0)}G`)
        if (record.diskTotal && Number(record.diskTotal) > 0) parts.push(`${(Number(record.diskTotal) / (1024 * 1024 * 1024)).toFixed(0)}G`)
        return parts.length > 0 ? (
          <span style={{ fontSize: '12px', color: '#666' }}>{parts.join('/')}</span>
        ) : (
          <span style={{ color: '#bfbfbf', fontSize: '12px' }}>-</span>
        )
      },
    },
    {
      title: '认证',
      dataIndex: 'authType',
      key: 'authType',
      width: 60,
      align: 'center' as const,
      render: (authType: string) => (
        <Tag color={authType === 'SSH_KEY' ? 'green' : 'blue'} style={{ fontSize: '12px', margin: 0 }}>
          {authType === 'SSH_KEY' ? '密钥' : '密码'}
        </Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 100,
      ellipsis: true,
      render: (tags: string[]) => (
        tags && tags.length > 0 ? (
          <Tooltip title={tags.join(', ')}>
            <span>
              {tags.slice(0, 1).map(tag => <Tag key={tag} style={{ fontSize: '11px', margin: 0 }}>{tag}</Tag>)}
              {tags.length > 1 && <span style={{ fontSize: '11px', color: '#999', marginLeft: 4 }}>+{tags.length - 1}</span>}
            </span>
          </Tooltip>
        ) : (
          <span style={{ color: '#bfbfbf', fontSize: '12px' }}>-</span>
        )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (record: Host) => (
        <Space size={4}>
          <Tooltip title="终端/文件">
            <Button type="primary" size="small" icon={<DesktopOutlined />} onClick={() => handleOpenDetail(record)} />
          </Tooltip>
          <Tooltip title="测试连接">
            <Button type="text" size="small" icon={<PlayCircleOutlined />} onClick={() => handleTestConnection(record)} />
          </Tooltip>
          <Tooltip title="采集信息">
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => handleCollectInfo(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm title="确定要删除这个主机吗？" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const fileColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: FileItem) => (
        <Space style={{ cursor: record.type === 'directory' ? 'pointer' : 'default' }} onClick={() => handleFileClick(record)}>
          {record.type === 'directory' ? <FolderOutlined style={{ color: '#faad14' }} /> : <FileOutlined style={{ color: '#1890ff' }} />}
          <span>{name}</span>
        </Space>
      ),
    },
    { title: '大小', dataIndex: 'size', key: 'size', width: 100, render: (size: number, record: FileItem) => record.type === 'directory' ? '-' : formatSize(size) },
    { title: '权限', dataIndex: 'permissions', key: 'permissions', width: 100 },
    { title: '修改时间', dataIndex: 'modifiedAt', key: 'modifiedAt', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: FileItem) => (
        <Space size="small">
          {record.type === 'file' && (
            <>
              <Tooltip title="编辑"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditFile(record)} /></Tooltip>
              <Tooltip title={downloadingFile === record.path ? '下载中...' : '下载'}>
                <Button type="text" size="small" icon={<DownloadOutlined />} loading={downloadingFile === record.path} onClick={() => handleDownload(record)} />
              </Tooltip>
            </>
          )}
          <Popconfirm title={`确定要删除 ${record.name} 吗？`} onConfirm={() => handleDeleteFile(record)}>
            <Tooltip title="删除"><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const uploadTaskColumns = [
    { title: '主机', dataIndex: 'hostName', key: 'hostName' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        switch (status) {
          case 'pending': return <Tag>等待中</Tag>
          case 'uploading': return <Tag color="processing" icon={<LoadingOutlined />}>上传中</Tag>
          case 'success': return <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag>
          case 'error': return <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>
          default: return <Tag>{status}</Tag>
        }
      },
    },
    { title: '进度', dataIndex: 'progress', key: 'progress', render: (progress: number, record: UploadTask) => <Progress percent={progress} size="small" status={record.status === 'error' ? 'exception' : undefined} /> },
  ]

  const pathParts = currentPath.split('/').filter(Boolean)
  const breadcrumbItems = [
    { title: <HomeOutlined />, onClick: () => loadFiles('/'), className: 'clickable' },
    ...pathParts.map((part, index) => ({ title: part, onClick: () => loadFiles('/' + pathParts.slice(0, index + 1).join('/')), className: 'clickable' })),
  ]

  if (!currentProject) {
    return <div><h1>主机管理</h1><Card><p>请先选择一个项目</p></Card></div>
  }

  // ==================== 详情视图（终端/文件管理 - 单台主机） ====================
  if (viewMode === 'detail' && selectedHost) {
    return (
      <div style={{ height: 'calc(100vh - 140px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBackToList}>返回列表</Button>
            <h2 style={{ margin: 0 }}>{selectedHost.name}</h2>
            <Badge status={getStatusColor(selectedHost.status)} text={getStatusText(selectedHost.status)} />
            <span style={{ color: '#666' }}>{selectedHost.ip}:{selectedHost.port}</span>
          </Space>
          <Space>
            {detailTab === 'terminal' && <Tooltip title="全屏"><Button icon={<FullscreenOutlined />} onClick={handleFullscreen} disabled={!activeTab} /></Tooltip>}
          </Space>
        </div>

        <Card style={{ height: 'calc(100% - 50px)' }} styles={{ body: { padding: 0, height: '100%' } }}>
          <Tabs
            activeKey={detailTab}
            onChange={(key) => setDetailTab(key as any)}
            tabBarStyle={{ margin: 0, paddingLeft: 16 }}
            tabBarExtraContent={
              detailTab === 'terminal' && selectedHost.status?.toLowerCase() === 'online' && (
                <Button type="primary" size="small" style={{ marginRight: 16 }} onClick={() => createTerminalSession(selectedHost)}>连接终端</Button>
              )
            }
            items={[
              {
                key: 'terminal',
                label: <span><DesktopOutlined /> 终端</span>,
                children: tabs.length > 0 ? (
                  <Tabs
                    type="editable-card"
                    activeKey={activeTab}
                    onChange={handleTabChange}
                    hideAdd
                    onEdit={(targetKey, action) => { if (action === 'remove') closeTab(targetKey as string) }}
                    style={{ height: '100%' }}
                    tabBarStyle={{ margin: 0, paddingLeft: 16 }}
                    items={tabs.map(tab => ({
                      key: tab.key,
                      label: tab.title,
                      closable: true,
                      children: <div ref={(el) => (terminalRefs.current[tab.key] = el)} style={{ height: 'calc(100vh - 310px)', width: '100%', backgroundColor: '#1e1e1e' }} />,
                    }))}
                  />
                ) : (
                  <div style={{ height: 'calc(100vh - 280px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description={selectedHost.status?.toLowerCase() === 'online' ? "点击上方「连接终端」按钮开始" : "主机离线，无法连接"} />
                  </div>
                ),
              },
              {
                key: 'files',
                label: <span><FolderOutlined /> 文件管理</span>,
                children: (
                  <div style={{ padding: 16 }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Breadcrumb items={breadcrumbItems} />
                      <Space>
                        <Upload beforeUpload={handleSingleUpload} showUploadList={false}><Button icon={<UploadOutlined />} size="small">上传文件</Button></Upload>
                        <Button icon={<FolderAddOutlined />} onClick={() => setNewFolderModalVisible(true)} size="small">新建文件夹</Button>
                        <Button icon={<ReloadOutlined />} onClick={() => loadFiles(currentPath)} size="small">刷新</Button>
                      </Space>
                    </div>
                    {currentPath !== '/' && (
                      <div style={{ padding: '8px 0', cursor: 'pointer', color: '#1890ff', borderBottom: '1px solid #f0f0f0', marginBottom: 8 }} onClick={handleGoUp}>
                        <FolderOutlined style={{ marginRight: 8 }} />..
                      </div>
                    )}
                    <Table columns={fileColumns} dataSource={files} loading={filesLoading} rowKey="path" size="small" pagination={false} scroll={{ y: 'calc(100vh - 400px)' }} locale={{ emptyText: <Empty description="暂无文件" /> }} />
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* 编辑文件弹窗 */}
        <Modal title={`编辑文件: ${editingFile?.name}`} open={editModalVisible} onCancel={() => { setEditModalVisible(false); setEditingFile(null); setFileContent('') }} onOk={handleSaveFile} width={800} okText="保存" cancelText="取消">
          <Input.TextArea value={fileContent} onChange={(e) => setFileContent(e.target.value)} rows={20} style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: 13 }} />
        </Modal>

        {/* 新建文件夹弹窗 */}
        <Modal title="新建文件夹" open={newFolderModalVisible} onCancel={() => { setNewFolderModalVisible(false); setNewFolderName('') }} onOk={handleCreateFolder} okText="创建" cancelText="取消">
          <Input placeholder="请输入文件夹名称" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
        </Modal>
      </div>
    )
  }

  // ==================== 列表视图（主机列表/批量上传/命令执行） ====================
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>主机管理</h1>
        <Space>
          {listTab === 'hosts' && selectedRowKeys.length > 0 && (
            <>
              <Button icon={<PlayCircleOutlined />} onClick={handleBatchTestConnection}>批量测试连接 ({selectedRowKeys.length})</Button>
              <Button icon={<ReloadOutlined />} onClick={handleBatchCollectInfo}>批量采集信息 ({selectedRowKeys.length})</Button>
              <Button icon={<EditOutlined />} onClick={() => setBatchPasswordModalVisible(true)}>批量设置密码 ({selectedRowKeys.length})</Button>
              <Popconfirm title={`确定要删除选中的 ${selectedRowKeys.length} 台主机吗？`} onConfirm={handleBatchDelete}>
                <Button danger icon={<DeleteOutlined />}>批量删除 ({selectedRowKeys.length})</Button>
              </Popconfirm>
            </>
          )}
          {listTab === 'hosts' && (
            <>
              <Button icon={<ImportOutlined />} onClick={handleImport}>批量导入</Button>
              <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加主机</Button>
            </>
          )}
        </Space>
      </div>

      <Tabs activeKey={listTab} onChange={(key) => setListTab(key as any)} items={[
        {
          key: 'hosts',
          label: <span><DesktopOutlined /> 主机列表</span>,
          children: (
            <>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card styles={{ body: { padding: '12px 16px' } }}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>总数</span>}
                      value={stats.total} 
                      valueStyle={{ color: '#00d4ff', fontSize: 28 }}
                      prefix={<DesktopOutlined style={{ color: '#00d4ff' }} />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card styles={{ body: { padding: '12px 16px' } }}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>在线</span>}
                      value={stats.online} 
                      valueStyle={{ color: '#00ff88', fontSize: 28 }}
                      prefix={<CheckCircleOutlined style={{ color: '#00ff88' }} />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card styles={{ body: { padding: '12px 16px' } }}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>离线</span>}
                      value={stats.offline} 
                      valueStyle={{ color: '#ff4757', fontSize: 28 }}
                      prefix={<CloseCircleOutlined style={{ color: '#ff4757' }} />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card styles={{ body: { padding: '12px 16px' } }}>
                    <Statistic 
                      title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>未知</span>}
                      value={stats.unknown} 
                      valueStyle={{ color: '#ffaa00', fontSize: 28 }}
                      prefix={<LoadingOutlined style={{ color: '#ffaa00' }} />}
                    />
                  </Card>
                </Col>
              </Row>
              
              {/* 搜索栏 */}
              <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 24px' } }}>
                <Row gutter={16} align="middle">
                  <Col span={8}>
                    <Input.Search
                      placeholder="搜索主机名、IP地址、用户名、系统信息..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onSearch={handleSearch}
                      onClear={handleSearchClear}
                      allowClear
                      enterButton="搜索"
                      size="middle"
                    />
                  </Col>
                  <Col span={16}>
                    <div style={{ textAlign: 'right', color: '#666', fontSize: '13px' }}>
                      {searchText ? (
                        <span>
                          搜索 "<strong>{searchText}</strong>" 的结果：<strong style={{ color: '#1890ff' }}>{hosts.length}</strong> 台主机
                        </span>
                      ) : (
                        <span>共 <strong style={{ color: '#1890ff' }}>{hosts.length}</strong> 台主机</span>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card>
              
              <Card>
                <Table 
                  columns={columns} 
                  dataSource={hosts} 
                  rowKey="id" 
                  loading={loading} 
                  rowSelection={rowSelection} 
                  size="small"
                  scroll={{ x: 1200, y: 'calc(100vh - 420px)' }}
                  pagination={{ 
                    showSizeChanger: true, 
                    showQuickJumper: true, 
                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`, 
                    current: currentPage,
                    pageSize: pageSize, 
                    pageSizeOptions: ['10', '20', '50', '100'],
                    position: ['bottomCenter'],
                    onChange: (page, size) => {
                      setCurrentPage(page)
                      setPageSize(size)
                    },
                  }}
                />
              </Card>
            </>
          ),
        },
        {
          key: 'upload',
          label: <span><InboxOutlined /> 批量上传</span>,
          children: (
            <Card>
              <Row gutter={24}>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8, fontWeight: 'bold' }}>上传目录:</div>
                    <Input placeholder="请输入远程目录，例如：/tmp" value={uploadPath} onChange={(e) => setUploadPath(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: 16, overflow: 'hidden', borderRadius: 8 }}>
                    <Dragger {...uploadProps} style={{ border: 'none' }}>
                      <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#00d4ff', fontSize: 48 }} /></p>
                      <p className="ant-upload-text">点击或拖拽文件到此区域</p>
                      <p className="ant-upload-hint">支持单个或批量上传</p>
                    </Dragger>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8, fontWeight: 'bold' }}>选择目标主机:</div>
                    <div style={{ marginBottom: 8 }}>
                      <Checkbox
                        checked={selectedHostIds.length === onlineHosts.length && onlineHosts.length > 0}
                        indeterminate={selectedHostIds.length > 0 && selectedHostIds.length < onlineHosts.length}
                        onChange={(e) => handleSelectAllHosts(e.target.checked)}
                      >全选在线主机 ({onlineHosts.length})</Checkbox>
                    </div>
                    <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: 6, padding: 12, background: 'rgba(0,0,0,0.2)' }}>
                      <Checkbox.Group value={selectedHostIds} onChange={(values) => setSelectedHostIds(values as string[])}>
                        <Space direction="vertical">
                          {onlineHosts.map(host => <Checkbox key={host.id} value={host.id}>{host.name} ({host.ip})</Checkbox>)}
                        </Space>
                      </Checkbox.Group>
                      {onlineHosts.length === 0 && <Empty description="暂无在线主机" />}
                    </div>
                  </div>
                  <Button type="primary" icon={<UploadOutlined />} onClick={handleBatchUpload} loading={uploading} disabled={fileList.length === 0 || selectedHostIds.length === 0 || !uploadPath}>
                    开始批量上传
                  </Button>
                </Col>
              </Row>
              {uploadTasks.length > 0 && <Table columns={uploadTaskColumns} dataSource={uploadTasks} rowKey="hostId" size="small" pagination={false} style={{ marginTop: 16 }} />}
            </Card>
          ),
        },
      ]} />

      {/* 添加/编辑主机弹窗 */}
      <Modal title={editingHost ? '编辑主机' : '添加主机'} open={modalVisible} onCancel={() => setModalVisible(false)} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ port: 22, authType: 'password' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="主机名" rules={[{ required: true, message: '请输入主机名' }]}>
                <Input placeholder="请输入主机名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hostname" label="连接地址" rules={[{ required: true, message: '请输入连接地址' }]} extra="SSH连接使用的IP或域名">
                <Input placeholder="IP地址或域名" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="publicIp" label="公网IP">
                <Input placeholder="可选，用于显示" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="privateIp" label="内网IP">
                <Input placeholder="可选，用于显示" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="port" label="端口" rules={[{ required: true, message: '请输入端口' }]}>
                <Input type="number" placeholder="22" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder="root" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="authType" label="认证方式" rules={[{ required: true, message: '请选择认证方式' }]}>
            <Select>
              <Option value="password">密码认证</Option>
              <Option value="key">密钥认证</Option>
            </Select>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.authType !== curr.authType}>
            {({ getFieldValue }) => {
              const authType = getFieldValue('authType')
              if (authType === 'password') {
                return (
                  <Form.Item name="password" label="密码" rules={[{ required: !editingHost, message: '请输入密码' }]} extra={editingHost ? '留空则保持原密码不变' : undefined}>
                    <Input.Password placeholder={editingHost ? '留空保持原密码不变' : '请输入密码'} />
                  </Form.Item>
                )
              }
              return (
                <Form.Item name="privateKey" label="私钥" rules={[{ required: true, message: '请输入私钥' }]}>
                  <TextArea rows={4} placeholder="请粘贴SSH私钥内容" />
                </Form.Item>
              )
            }}
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="主机描述信息" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="添加标签" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量设置密码弹窗 */}
      <Modal 
        title={`批量设置密码 (${selectedRowKeys.length}台主机)`} 
        open={batchPasswordModalVisible} 
        onCancel={() => {
          setBatchPasswordModalVisible(false)
          batchPasswordForm.resetFields()
        }} 
        onOk={() => batchPasswordForm.submit()} 
        width={500}
      >
        <Form form={batchPasswordForm} layout="vertical" onFinish={handleBatchSetPassword}>
          <Form.Item 
            name="username" 
            label="用户名" 
            extra="可选，如果填写将同时更新用户名"
          >
            <Input placeholder="留空则保持原用户名不变" />
          </Form.Item>
          <Form.Item 
            name="password" 
            label="密码" 
            rules={[{ required: true, message: '请输入密码' }]}
            extra="将为所有选中的主机设置相同的密码"
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Hosts
