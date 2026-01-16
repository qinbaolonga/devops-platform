import React, { useState, useEffect, useRef } from 'react'
import { Form, Input, Button, Typography, message, Spin, Row, Col } from 'antd'
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons/lib/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { LoginRequest } from '../types'

const { Title, Text } = Typography

// 生成验证码
const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 绘制验证码
const drawCaptcha = (canvas: HTMLCanvasElement, code: string) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const width = canvas.width
  const height = canvas.height
  
  // 背景
  ctx.fillStyle = 'rgba(0, 20, 40, 0.8)'
  ctx.fillRect(0, 0, width, height)
  
  // 干扰线
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(0, ${150 + Math.random() * 100}, ${200 + Math.random() * 55}, 0.5)`
    ctx.beginPath()
    ctx.moveTo(Math.random() * width, Math.random() * height)
    ctx.lineTo(Math.random() * width, Math.random() * height)
    ctx.stroke()
  }
  
  // 干扰点
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(0, ${150 + Math.random() * 100}, 255, 0.5)`
    ctx.beginPath()
    ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI)
    ctx.fill()
  }
  
  // 绘制文字
  ctx.font = 'bold 28px Arial'
  ctx.textBaseline = 'middle'
  
  for (let i = 0; i < code.length; i++) {
    const x = 15 + i * 28
    const y = height / 2 + (Math.random() - 0.5) * 10
    const rotate = (Math.random() - 0.5) * 0.4
    
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotate)
    
    // 渐变色文字
    const gradient = ctx.createLinearGradient(0, -15, 0, 15)
    gradient.addColorStop(0, '#00d4ff')
    gradient.addColorStop(1, '#00ff88')
    ctx.fillStyle = gradient
    
    ctx.fillText(code[i], 0, 0)
    ctx.restore()
  }
}

const Login: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [captchaCode, setCaptchaCode] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()

  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const refreshCaptcha = () => {
    const code = generateCaptcha()
    setCaptchaCode(code)
    if (canvasRef.current) {
      drawCaptcha(canvasRef.current, code)
    }
  }

  useEffect(() => {
    refreshCaptcha()
  }, [])

  const handleSubmit = async (values: LoginRequest & { captcha: string }) => {
    if (values.captcha.toLowerCase() !== captchaCode.toLowerCase()) {
      message.error('验证码错误')
      refreshCaptcha()
      return
    }
    
    setLoading(true)
    try {
      await login({ username: values.username, password: values.password })
      message.success('登录成功')
      navigate(from, { replace: true })
    } catch (error: any) {
      message.error(error.message || '登录失败')
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  // 输入框通用样式
  const inputStyle = {
    height: 48,
    backgroundColor: 'rgba(0, 20, 40, 0.6)',
    borderColor: 'rgba(0, 212, 255, 0.3)',
    color: '#fff',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0e17',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 科技感背景效果 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(ellipse at 20% 20%, rgba(0, 212, 255, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(0, 255, 136, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(114, 46, 209, 0.08) 0%, transparent 70%)
        `,
        pointerEvents: 'none',
      }} />
      
      {/* 网格背景 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
      }} />

      {/* 动态光效 */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%)',
        top: '10%',
        left: '10%',
        animation: 'pulse 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 255, 136, 0.15) 0%, transparent 70%)',
        bottom: '10%',
        right: '15%',
        animation: 'pulse 5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(17, 25, 40, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: 16,
          padding: '48px 40px',
          position: 'relative',
          boxShadow: '0 0 60px rgba(0, 212, 255, 0.1)',
        }}
      >
        {/* 顶部光效线条 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 2,
          background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
          borderRadius: 2,
        }} />

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* Logo */}
          <div style={{
            width: 72,
            height: 72,
            margin: '0 auto 20px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(0, 212, 255, 0.5)',
          }}>
            <span style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>D</span>
          </div>
          
          <Title level={2} style={{ 
            margin: 0,
            marginBottom: 8,
            background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: 28,
            fontWeight: 700,
          }}>
            DevOps 平台
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            企业级 IT 运维自动化管理平台
          </Text>
        </div>

        <Spin spinning={loading}>
          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'rgba(0, 212, 255, 0.6)' }} />}
                placeholder="用户名"
                autoComplete="username"
                style={inputStyle}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0, 212, 255, 0.6)' }} />}
                placeholder="密码"
                autoComplete="current-password"
                style={inputStyle}
              />
            </Form.Item>

            <Form.Item
              name="captcha"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <Row gutter={12}>
                <Col flex="1">
                  <Input
                    prefix={<SafetyCertificateOutlined style={{ color: 'rgba(0, 212, 255, 0.6)' }} />}
                    placeholder="验证码"
                    maxLength={4}
                    style={inputStyle}
                  />
                </Col>
                <Col>
                  <canvas
                    ref={canvasRef}
                    width={120}
                    height={48}
                    onClick={refreshCaptcha}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 8,
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                    }}
                    title="点击刷新验证码"
                  />
                </Col>
              </Row>
            </Form.Item>

            <Form.Item style={{ marginBottom: 16, marginTop: 32 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ 
                  width: '100%', 
                  height: 48,
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                  border: 'none',
                  boxShadow: '0 0 30px rgba(0, 212, 255, 0.4)',
                }}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>
        </Spin>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            © 2026 DevOps Platform
          </Text>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        
        /* 登录页输入框特殊样式 */
        .ant-input-affix-wrapper {
          background-color: rgba(0, 20, 40, 0.6) !important;
        }
        .ant-input-affix-wrapper .ant-input {
          background-color: transparent !important;
          color: #fff !important;
        }
        .ant-input-affix-wrapper .ant-input::placeholder {
          color: rgba(255, 255, 255, 0.4) !important;
        }
        .ant-input-affix-wrapper .ant-input-password-icon {
          color: rgba(0, 212, 255, 0.6) !important;
        }
      `}</style>
    </div>
  )
}

export default Login
