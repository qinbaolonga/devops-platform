// 用户相关类型
export interface User {
  id: string
  username: string
  email?: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'VIEWER'
  enabled: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

// 项目相关类型
export interface Project {
  id: string
  name: string
  description?: string
  memberCount?: number
  createdBy?: User
  createdAt: string
  updatedAt: string
  members?: ProjectMember[]
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: string
  user: User
}

// 主机相关类型
export interface Host {
  id: string
  name: string
  ip: string
  publicIp?: string
  privateIp?: string
  port: number
  username: string
  authType: 'PASSWORD' | 'SSH_KEY' | 'CREDENTIAL'
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN'
  osType?: string
  osVersion?: string
  cpuCores?: number
  memoryTotal?: bigint
  diskTotal?: bigint
  lastCheckTime?: string
  tags?: string[]
  groupId?: string
  projectId: string
  createdAt: string
  updatedAt: string
  lastMetric?: HostMetric
}

// 任务相关类型
export interface Task {
  id: string
  type: 'COMMAND' | 'PLAYBOOK' | 'SCRIPT'
  name?: string
  command?: string
  playbookId?: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  hostIds?: string[]
  result?: Record<string, any>
  output?: string
  progress?: number
  startTime?: string
  endTime?: string
  duration?: number
  createdBy?: string
  projectId: string
  scheduledTaskId?: string
  createdAt: string
  updatedAt?: string
  user?: {
    id: string
    username: string
  }
}

// Playbook 相关类型
export interface Playbook {
  id: string
  name: string
  description?: string
  content: string
  version: number
  variables?: Record<string, any>
  projectId: string
  createdBy?: User
  createdAt: string
  updatedAt: string
}

export interface PlaybookVersion {
  id: string
  playbookId: string
  version: number
  content: string
  changelog?: string
  createdBy?: User
  createdAt: string
}

// 监控相关类型
export interface HostMetric {
  id: string
  hostId: string
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkBytesIn?: number
  networkBytesOut?: number
  loadAvg?: number
  createdAt: string
}

// 告警相关类型
export interface AlertRule {
  id: string
  name: string
  metric: 'cpu' | 'memory' | 'disk' | 'network_in' | 'network_out' | 'load'
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
  threshold: number
  duration: number
  level: 'info' | 'warning' | 'error' | 'critical'
  enabled: boolean
  hostIds: string[]
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface Alert {
  id: string
  ruleId: string
  hostId: string
  level: 'info' | 'warning' | 'error' | 'critical'
  message: string
  value: number
  status: 'firing' | 'resolved' | 'acknowledged'
  firedAt: string
  resolvedAt?: string
  acknowledgedAt?: string
  acknowledgedBy?: string
}

// 通知相关类型
export interface NotificationChannel {
  id: string
  name: string
  type: 'email' | 'dingtalk' | 'wechat'
  config: Record<string, any>
  enabled: boolean
  projectId: string
  createdAt: string
  updatedAt: string
}

// 定时任务相关类型
export interface ScheduledTask {
  id: string
  name: string
  description?: string
  type: 'command' | 'playbook'
  cronExpression: string
  command?: string
  playbookId?: string
  hostIds: string[]
  variables?: Record<string, any>
  enabled: boolean
  lastExecutedAt?: string
  nextExecuteAt?: string
  projectId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 审计日志类型
export interface AuditLog {
  id: string
  userId?: string
  user?: User
  method: string
  path: string
  statusCode: number
  ip: string
  userAgent: string
  duration: number
  requestBody?: any
  responseBody?: any
  createdAt: string
}

// 系统配置相关类型
export interface SystemConfig {
  systemName: string
  systemDescription: string
  systemVersion: string
  sessionTimeout: number
  passwordMinLength: number
  passwordRequireSpecialChar: boolean
  maxLoginAttempts: number
  accountLockoutDuration: number
  maxConcurrentTasks: number
  taskTimeout: number
  taskRetryAttempts: number
  metricsRetentionDays: number
  monitoringInterval: number
  alertCheckInterval: number
  maxFileSize: number
  allowedFileTypes: string[]
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  smtpUser?: string
  smtpPassword?: string
  smtpFromEmail?: string
  smtpFromName?: string
  enableAuditLog: boolean
  enableMetricsCollection: boolean
  enableNotifications: boolean
  timezone: string
  language: string
}

// API 响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: string
}

// 分页相关类型
export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}