import React, { useEffect, useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  Space,
  Button,
  Badge,
  Tag,
  Empty,
  Spin,
} from 'antd'
import {
  ReloadOutlined,
  DesktopOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  HddOutlined,
  AreaChartOutlined,
} from '@ant-design/icons/lib/icons'
import ReactECharts from 'echarts-for-react'
import { api } from '../utils/request'
import { useAppStore } from '../stores/app'
import { Host, HostMetric } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

interface MonitoringOverview {
  hosts: {
    total: number
    online: number
    offline: number
  }
  averageMetrics: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    loadAvg: number
  }
  recentMetrics: any[]
}

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null)
  const [hosts, setHosts] = useState<Host[]>([])
  const [metrics, setMetrics] = useState<HostMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [selectedHost, setSelectedHost] = useState<string>('')
  const [timeRange, setTimeRange] = useState<number>(1)
  const { currentProject } = useAppStore()

  useEffect(() => {
    if (currentProject) {
      loadOverview()
      loadHosts()
    }
  }, [currentProject])

  useEffect(() => {
    if (currentProject && selectedHost) {
      loadMetrics()
    }
  }, [currentProject, selectedHost, timeRange])

  const loadOverview = async () => {
    if (!currentProject) return
    setOverviewLoading(true)
    try {
      const data = await api.get<MonitoringOverview>(`/projects/${currentProject.id}/metrics/overview`)
      setOverview(data)
    } catch (error) {
      console.error('Failed to load monitoring overview:', error)
    } finally {
      setOverviewLoading(false)
    }
  }

  const loadHosts = async () => {
    if (!currentProject) return
    try {
      const response = await api.get<{items: Host[], total: number}>(`/projects/${currentProject.id}/hosts?pageSize=1000`)
      const hostList = response.items || []
      setHosts(hostList)
      if (hostList.length > 0 && !selectedHost) {
        setSelectedHost(hostList[0].id)
      }
    } catch (error) {
      console.error('Failed to load hosts:', error)
    }
  }

  const loadMetrics = async () => {
    if (!currentProject || !selectedHost) return
    setLoading(true)
    try {
      const data = await api.get<HostMetric[]>(
        `/projects/${currentProject.id}/metrics/hosts/${selectedHost}?hours=${timeRange}`
      )
      setMetrics(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load metrics:', error)
      setMetrics([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadOverview()
    loadHosts()
    if (selectedHost) {
      loadMetrics()
    }
  }

  // 科技感图表基础配置
  const baseChartOption = {
    grid: { left: 45, right: 15, top: 35, bottom: 25 },
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
      axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.1)' } },
    },
  }

  // CPU 趋势图
  const cpuChartOption = useMemo(() => ({
    ...baseChartOption,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 25, 40, 0.95)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `${params[0].axisValue}<br/>CPU: ${params[0].value?.toFixed(1) || 0}%`
    },
    xAxis: { ...baseChartOption.xAxis, data: metrics.map(m => dayjs(m.timestamp).format('HH:mm')) },
    yAxis: { ...baseChartOption.yAxis, min: 0, max: 100, axisLabel: { ...baseChartOption.yAxis.axisLabel, formatter: '{value}%' } },
    series: [{
      data: metrics.map(m => m.cpuUsage || 0),
      type: 'line',
      smooth: true,
      symbol: 'none',
      areaStyle: { 
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0, 212, 255, 0.4)' },
            { offset: 1, color: 'rgba(0, 212, 255, 0.05)' }
          ]
        }
      },
      lineStyle: { color: '#00d4ff', width: 2, shadowColor: 'rgba(0, 212, 255, 0.5)', shadowBlur: 10 },
    }]
  }), [metrics])

  // 内存趋势图
  const memoryChartOption = useMemo(() => ({
    ...baseChartOption,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 25, 40, 0.95)',
      borderColor: 'rgba(0, 255, 136, 0.3)',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `${params[0].axisValue}<br/>内存: ${params[0].value?.toFixed(1) || 0}%`
    },
    xAxis: { ...baseChartOption.xAxis, data: metrics.map(m => dayjs(m.timestamp).format('HH:mm')) },
    yAxis: { ...baseChartOption.yAxis, min: 0, max: 100, axisLabel: { ...baseChartOption.yAxis.axisLabel, formatter: '{value}%' } },
    series: [{
      data: metrics.map(m => m.memoryUsage || 0),
      type: 'line',
      smooth: true,
      symbol: 'none',
      areaStyle: { 
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0, 255, 136, 0.4)' },
            { offset: 1, color: 'rgba(0, 255, 136, 0.05)' }
          ]
        }
      },
      lineStyle: { color: '#00ff88', width: 2, shadowColor: 'rgba(0, 255, 136, 0.5)', shadowBlur: 10 },
    }]
  }), [metrics])

  // 磁盘趋势图
  const diskChartOption = useMemo(() => ({
    ...baseChartOption,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 25, 40, 0.95)',
      borderColor: 'rgba(255, 170, 0, 0.3)',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `${params[0].axisValue}<br/>磁盘: ${params[0].value?.toFixed(1) || 0}%`
    },
    xAxis: { ...baseChartOption.xAxis, data: metrics.map(m => dayjs(m.timestamp).format('HH:mm')) },
    yAxis: { ...baseChartOption.yAxis, min: 0, max: 100, axisLabel: { ...baseChartOption.yAxis.axisLabel, formatter: '{value}%' } },
    series: [{
      data: metrics.map(m => m.diskUsage || 0),
      type: 'line',
      smooth: true,
      symbol: 'none',
      areaStyle: { 
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 170, 0, 0.4)' },
            { offset: 1, color: 'rgba(255, 170, 0, 0.05)' }
          ]
        }
      },
      lineStyle: { color: '#ffaa00', width: 2, shadowColor: 'rgba(255, 170, 0, 0.5)', shadowBlur: 10 },
    }]
  }), [metrics])

  // 负载趋势图
  const loadChartOption = useMemo(() => ({
    ...baseChartOption,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 25, 40, 0.95)',
      borderColor: 'rgba(114, 46, 209, 0.3)',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `${params[0].axisValue}<br/>负载: ${params[0].value?.toFixed(2) || 0}`
    },
    xAxis: { ...baseChartOption.xAxis, data: metrics.map(m => dayjs(m.timestamp).format('HH:mm')) },
    yAxis: { ...baseChartOption.yAxis, min: 0 },
    series: [{
      data: metrics.map(m => m.loadAvg || 0),
      type: 'line',
      smooth: true,
      symbol: 'none',
      areaStyle: { 
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(114, 46, 209, 0.4)' },
            { offset: 1, color: 'rgba(114, 46, 209, 0.05)' }
          ]
        }
      },
      lineStyle: { color: '#722ed1', width: 2, shadowColor: 'rgba(114, 46, 209, 0.5)', shadowBlur: 10 },
    }]
  }), [metrics])

  const latestStats = metrics.length > 0 ? metrics[metrics.length - 1] : null

  // 主机列表列定义
  const hostColumns = [
    {
      title: '主机',
      key: 'host',
      render: (record: Host) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{record.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{record.ip}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Badge
          status={status?.toLowerCase() === 'online' ? 'success' : 'error'}
          text={<span style={{ fontSize: 12 }}>{status?.toLowerCase() === 'online' ? '在线' : '离线'}</span>}
        />
      ),
    },
    {
      title: '系统',
      key: 'os',
      width: 90,
      render: (record: Host) => (
        record.osType ? <Tag style={{ fontSize: 11 }}>{record.osType}</Tag> : '-'
      ),
    },
  ]

  // 科技感统计卡片组件
  const StatCard = ({ title, value, suffix, icon, color, glow }: any) => (
    <div style={{
      background: 'rgba(17, 25, 40, 0.6)',
      border: `1px solid ${glow}33`,
      borderRadius: 12,
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        background: `radial-gradient(circle, ${glow}20 0%, transparent 70%)`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
          border: `1px solid ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: color,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: color }}>
            {value}<span style={{ fontSize: 14, marginLeft: 2 }}>{suffix}</span>
          </div>
        </div>
      </div>
    </div>
  )

  // 实时指标卡片
  const MetricCard = ({ label, value, unit, color }: any) => (
    <div style={{
      textAlign: 'center',
      padding: '16px 12px',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 8,
      border: `1px solid ${color}30`,
    }}>
      <div style={{ 
        fontSize: 32, 
        fontWeight: 700, 
        color: color,
        textShadow: `0 0 20px ${color}60`,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {value}<span style={{ fontSize: 14 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{label}</div>
    </div>
  )

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: 24, 
            fontWeight: 600,
            background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            监控中心
          </h1>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
            实时监控主机资源使用情况 · {dayjs().format('YYYY-MM-DD HH:mm:ss')}
          </div>
        </div>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
          style={{ borderRadius: 8 }}
        >
          刷新数据
        </Button>
      </div>

      {/* 概览统计卡片 */}
      <Spin spinning={overviewLoading}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="主机总数"
              value={overview?.hosts?.total || hosts.length || 0}
              suffix=""
              icon={<CloudServerOutlined />}
              color="#00d4ff"
              glow="rgba(0, 212, 255, 0.5)"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="在线主机"
              value={overview?.hosts?.online || hosts.filter(h => h.status?.toLowerCase() === 'online').length || 0}
              suffix={`/ ${overview?.hosts?.total || hosts.length}`}
              icon={<CheckCircleOutlined />}
              color="#00ff88"
              glow="rgba(0, 255, 136, 0.5)"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="平均CPU"
              value={(overview?.averageMetrics?.cpuUsage || 0).toFixed(1)}
              suffix="%"
              icon={<DesktopOutlined />}
              color="#ffaa00"
              glow="rgba(255, 170, 0, 0.5)"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="平均内存"
              value={(overview?.averageMetrics?.memoryUsage || 0).toFixed(1)}
              suffix="%"
              icon={<DatabaseOutlined />}
              color="#722ed1"
              glow="rgba(114, 46, 209, 0.5)"
            />
          </Col>
        </Row>
      </Spin>

      <Row gutter={16}>
        {/* 左侧：主机列表 */}
        <Col xs={24} lg={6}>
          <Card 
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CloudServerOutlined style={{ color: '#00d4ff' }} />
                主机列表
              </span>
            }
            style={{ marginBottom: 16 }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={hostColumns}
              dataSource={hosts}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10, size: 'small', showTotal: (t) => `共 ${t} 台` }}
              rowClassName={(record) => record.id === selectedHost ? 'ant-table-row-selected' : ''}
              onRow={(record) => ({
                onClick: () => setSelectedHost(record.id),
                style: { cursor: 'pointer' }
              })}
            />
          </Card>
        </Col>

        {/* 右侧：趋势图 */}
        <Col xs={24} lg={18}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AreaChartOutlined style={{ color: '#00d4ff' }} />
                {selectedHost ? `${hosts.find(h => h.id === selectedHost)?.name || '主机'} - 资源趋势` : '资源趋势'}
              </span>
            }
            extra={
              <Space>
                <Select value={selectedHost} onChange={setSelectedHost} style={{ width: 140 }} placeholder="选择主机" size="small">
                  {hosts.map(host => (
                    <Option key={host.id} value={host.id}>{host.name}</Option>
                  ))}
                </Select>
                <Select value={timeRange} onChange={setTimeRange} style={{ width: 100 }} size="small">
                  <Option value={1}>最近1小时</Option>
                  <Option value={6}>最近6小时</Option>
                  <Option value={24}>最近24小时</Option>
                  <Option value={72}>最近3天</Option>
                </Select>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            {selectedHost ? (
              <Spin spinning={loading}>
                {metrics.length > 0 ? (
                  <div>
                    {/* 当前值统计 */}
                    {latestStats && (
                      <Row gutter={16} style={{ marginBottom: 20 }}>
                        <Col span={6}>
                          <MetricCard label="当前 CPU" value={latestStats.cpuUsage?.toFixed(1) || '0'} unit="%" color="#00d4ff" />
                        </Col>
                        <Col span={6}>
                          <MetricCard label="当前内存" value={latestStats.memoryUsage?.toFixed(1) || '0'} unit="%" color="#00ff88" />
                        </Col>
                        <Col span={6}>
                          <MetricCard label="当前磁盘" value={latestStats.diskUsage?.toFixed(1) || '0'} unit="%" color="#ffaa00" />
                        </Col>
                        <Col span={6}>
                          <MetricCard label="当前负载" value={latestStats.loadAvg?.toFixed(2) || '0'} unit="" color="#722ed1" />
                        </Col>
                      </Row>
                    )}

                    {/* 趋势图 */}
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ 
                          background: 'rgba(0, 0, 0, 0.2)', 
                          borderRadius: 8, 
                          padding: '12px 8px',
                          border: '1px solid rgba(0, 212, 255, 0.1)',
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, paddingLeft: 8, color: '#00d4ff' }}>
                            <DesktopOutlined style={{ marginRight: 6 }} />CPU 使用率
                          </div>
                          <ReactECharts option={cpuChartOption} style={{ height: 180 }} />
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ 
                          background: 'rgba(0, 0, 0, 0.2)', 
                          borderRadius: 8, 
                          padding: '12px 8px',
                          border: '1px solid rgba(0, 255, 136, 0.1)',
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, paddingLeft: 8, color: '#00ff88' }}>
                            <DatabaseOutlined style={{ marginRight: 6 }} />内存使用率
                          </div>
                          <ReactECharts option={memoryChartOption} style={{ height: 180 }} />
                        </div>
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={12}>
                        <div style={{ 
                          background: 'rgba(0, 0, 0, 0.2)', 
                          borderRadius: 8, 
                          padding: '12px 8px',
                          border: '1px solid rgba(255, 170, 0, 0.1)',
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, paddingLeft: 8, color: '#ffaa00' }}>
                            <HddOutlined style={{ marginRight: 6 }} />磁盘使用率
                          </div>
                          <ReactECharts option={diskChartOption} style={{ height: 180 }} />
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ 
                          background: 'rgba(0, 0, 0, 0.2)', 
                          borderRadius: 8, 
                          padding: '12px 8px',
                          border: '1px solid rgba(114, 46, 209, 0.1)',
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, paddingLeft: 8, color: '#722ed1' }}>
                            <ThunderboltOutlined style={{ marginRight: 6 }} />系统负载
                          </div>
                          <ReactECharts option={loadChartOption} style={{ height: 180 }} />
                        </div>
                      </Col>
                    </Row>
                  </div>
                ) : (
                  <Empty 
                    description={
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                        暂无监控数据<br/>
                        <span style={{ fontSize: 12 }}>请确保主机在线并等待数据采集</span>
                      </span>
                    }
                    style={{ padding: '80px 0' }}
                  />
                )}
              </Spin>
            ) : (
              <Empty 
                description={<span style={{ color: 'rgba(255,255,255,0.5)' }}>请选择要查看的主机</span>} 
                style={{ padding: '80px 0' }} 
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
