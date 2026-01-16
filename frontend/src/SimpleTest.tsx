import React from 'react'

const SimpleTest: React.FC = () => {
  console.log('🔥 SimpleTest组件渲染中...')
  
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: 'red' }}>🔥 简单测试页面</h1>
      <p>如果你能看到这个页面，说明React基础渲染正常</p>
      <div style={{ background: 'white', padding: '10px', margin: '10px 0' }}>
        <h2>测试信息</h2>
        <ul>
          <li>React版本: {React.version}</li>
          <li>当前时间: {new Date().toLocaleString()}</li>
          <li>页面URL: {window.location.href}</li>
        </ul>
      </div>
    </div>
  )
}

export default SimpleTest