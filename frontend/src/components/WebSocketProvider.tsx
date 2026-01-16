import React, { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { message } from 'antd'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'

interface WebSocketProviderProps {
  children: React.ReactNode
}

const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuthStore()
  const { setWsConnected, currentProject } = useAppStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return
    }

    // 创建 WebSocket 连接 - 使用当前页面的 host
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : `http://${window.location.hostname}:3000`
    
    const socket = io(wsUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 3,
    })

    socketRef.current = socket

    // 连接事件
    socket.on('connect', () => {
      console.log('WebSocket connected')
      setWsConnected(true)
      
      // 加入当前项目房间
      if (currentProject) {
        socket.emit('join-project', { projectId: currentProject.id })
      }
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setWsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setWsConnected(false)
    })

    // 监听实时事件
    socket.on('task-updated', (data) => {
      console.log('Task updated:', data)
      // 这里可以更新任务状态
    })

    socket.on('alert-fired', (data) => {
      console.log('Alert fired:', data)
      message.warning(`告警: ${data.message}`)
    })

    socket.on('host-status-changed', (data) => {
      console.log('Host status changed:', data)
      // 这里可以更新主机状态
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, token, setWsConnected])

  // 当项目切换时，重新加入房间
  useEffect(() => {
    if (socketRef.current && currentProject) {
      socketRef.current.emit('join-project', { projectId: currentProject.id })
    }
  }, [currentProject])

  return <>{children}</>
}

export default WebSocketProvider