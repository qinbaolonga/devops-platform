import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws',
})
export class DevOpsWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DevOpsWebSocketGateway.name);
  private connectedClients = new Map<string, { socket: Socket; userId: string; projectId?: string }>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // 从查询参数或头部获取 token
      const token = client.handshake.auth.token || client.handshake.query.token;
      
      if (!token) {
        this.logger.warn(`WebSocket 连接被拒绝: 缺少认证 token`);
        client.disconnect();
        return;
      }

      // 验证 JWT token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // 存储连接信息
      this.connectedClients.set(client.id, {
        socket: client,
        userId,
      });

      this.logger.log(`用户 ${userId} 已连接 WebSocket (${client.id})`);
      
      // 加入用户专属房间
      client.join(`user:${userId}`);
      
      // 发送连接成功消息
      client.emit('connected', { message: '连接成功', userId });

    } catch (error) {
      this.logger.warn(`WebSocket 认证失败: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      this.logger.log(`用户 ${clientInfo.userId} 已断开 WebSocket 连接 (${client.id})`);
      this.connectedClients.delete(client.id);
    }
  }

  @SubscribeMessage('join-project')
  handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) {
      return;
    }

    // 离开之前的项目房间
    if (clientInfo.projectId) {
      client.leave(`project:${clientInfo.projectId}`);
    }

    // 加入新的项目房间
    client.join(`project:${data.projectId}`);
    clientInfo.projectId = data.projectId;

    this.logger.log(`用户 ${clientInfo.userId} 加入项目 ${data.projectId} 房间`);
    client.emit('project-joined', { projectId: data.projectId });
  }

  @SubscribeMessage('leave-project')
  handleLeaveProject(@ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo || !clientInfo.projectId) {
      return;
    }

    client.leave(`project:${clientInfo.projectId}`);
    this.logger.log(`用户 ${clientInfo.userId} 离开项目 ${clientInfo.projectId} 房间`);
    
    clientInfo.projectId = undefined;
    client.emit('project-left');
  }

  // 发送任务状态更新
  sendTaskUpdate(taskId: string, projectId: string, data: any) {
    this.server.to(`project:${projectId}`).emit('task-update', {
      taskId,
      ...data,
    });
  }

  // 发送任务输出
  sendTaskOutput(taskId: string, projectId: string, output: string) {
    this.server.to(`project:${projectId}`).emit('task-output', {
      taskId,
      output,
      timestamp: new Date().toISOString(),
    });
  }

  // 发送监控数据更新
  sendMetricsUpdate(projectId: string, hostId: string, metrics: any) {
    this.server.to(`project:${projectId}`).emit('metrics-update', {
      hostId,
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  // 发送告警通知
  sendAlertNotification(projectId: string, alert: any) {
    this.server.to(`project:${projectId}`).emit('alert-notification', {
      ...alert,
      timestamp: new Date().toISOString(),
    });
  }

  // 发送系统通知
  sendSystemNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('system-notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  // 广播系统消息
  broadcastSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    this.server.emit('system-message', {
      message,
      level,
      timestamp: new Date().toISOString(),
    });
  }

  // 获取在线用户数量
  getOnlineUsersCount(): number {
    return this.connectedClients.size;
  }

  // 获取项目在线用户数量
  getProjectOnlineUsersCount(projectId: string): number {
    const room = this.server.sockets.adapter.rooms.get(`project:${projectId}`);
    return room ? room.size : 0;
  }

  // 检查用户是否在线
  isUserOnline(userId: string): boolean {
    for (const clientInfo of this.connectedClients.values()) {
      if (clientInfo.userId === userId) {
        return true;
      }
    }
    return false;
  }
}