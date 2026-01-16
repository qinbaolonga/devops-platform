import React from 'react'
import { Result, Button } from 'antd'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面出现错误"
          subTitle="抱歉，页面加载时出现了错误。请刷新页面重试。"
          extra={[
            <Button type="primary" key="refresh" onClick={() => window.location.reload()}>
              刷新页面
            </Button>,
            <Button key="home" onClick={() => window.location.href = '/'}>
              返回首页
            </Button>,
          ]}
        >
          <div style={{ marginTop: 16 }}>
            <details style={{ whiteSpace: 'pre-wrap' }}>
              <summary>错误详情</summary>
              {this.state.error?.stack}
            </details>
          </div>
        </Result>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary