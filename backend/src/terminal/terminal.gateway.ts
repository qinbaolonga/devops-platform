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
import { TerminalService } from './terminal.service';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

@WebSocketGateway({
  namespace: '/terminal',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TerminalGateway.name);
  private socketSessions = new Map<string, string>(); // socketId -> sessionId

  constructor(
    private terminalService: TerminalService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // 从查询参数或头部获取 token
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        this.logger.warn(`终端连接被拒绝: 缺少认证token`);
        client.disconnect();
        return;
      }

      // 验证 JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.username = payload.username;

      this.logger.log(`终端客户端已连接: ${client.id} (用户: ${client.username})`);
      
      // 发送连接成功消息
      client.emit('connected', {
        message: '终端服务连接成功',
        userId: client.userId,
        username: client.username,
      });

    } catch (error) {
      this.logger.warn(`终端连接认证失败: ${error.message}`);
      client.emit('error', { message: '认证失败' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const sessionId = this.socketSessions.get(client.id);
    
    if (sessionId) {
      // 关闭对应的终端会话
      this.terminalService.closeSession(sessionId);
      this.socketSessions.delete(client.id);
      this.logger.log(`终端会话已关闭: ${sessionId}`);
    }

    this.logger.log(`终端客户端已断开: ${client.id}`);
  }

  @SubscribeMessage('create-session')
  async handleCreateSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      hostId: string;
      projectId: string;
      cols?: number;
      rows?: number;
    },
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: '用户未认证' });
        return;
      }

      const sessionId = await this.terminalService.createSession(
        data.hostId,
        client.userId,
        data.projectId,
        data.cols || 80,
        data.rows || 24,
      );

      // 关联 socket 和会话
      this.socketSessions.set(client.id, sessionId);

      // 获取会话对象以监听数据
      const session = this.terminalService.getSession(sessionId);
      if (session && session.stream) {
        // 监听终端输出
        session.stream.on('data', (data: Buffer) => {
          client.emit('data', data.toString());
        });

        session.stream.on('close', () => {
          client.emit('session-closed', { sessionId });
          this.socketSessions.delete(client.id);
        });
      }

      client.emit('session-created', {
        sessionId,
        hostId: data.hostId,
        projectId: data.projectId,
      });

      this.logger.log(`终端会话已创建: ${sessionId} (用户: ${client.username})`);

    } catch (error) {
      this.logger.error(`创建终端会话失败: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('input')
  async handleInput(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { input: string },
  ) {
    try {
      const sessionId = this.socketSessions.get(client.id);
      
      if (!sessionId) {
        client.emit('error', { message: '终端会话不存在' });
        return;
      }

      await this.terminalService.writeToSession(sessionId, data.input);

    } catch (error) {
      this.logger.error(`发送终端输入失败: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('resize')
  async handleResize(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { cols: number; rows: number },
  ) {
    try {
      const sessionId = this.socketSessions.get(client.id);
      
      if (!sessionId) {
        client.emit('error', { message: '终端会话不存在' });
        return;
      }

      await this.terminalService.resizeSession(sessionId, data.cols, data.rows);
      
      this.logger.debug(`终端会话已调整大小: ${sessionId} (${data.cols}x${data.rows})`);

    } catch (error) {
      this.logger.error(`调整终端大小失败: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('close-session')
  async handleCloseSession(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const sessionId = this.socketSessions.get(client.id);
      
      if (sessionId) {
        await this.terminalService.closeSession(sessionId);
        this.socketSessions.delete(client.id);
        
        client.emit('session-closed', { sessionId });
        this.logger.log(`终端会话已手动关闭: ${sessionId}`);
      }

    } catch (error) {
      this.logger.error(`关闭终端会话失败: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('get-sessions')
  async handleGetSessions(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.userId) {
        client.emit('error', { message: '用户未认证' });
        return;
      }

      const sessions = this.terminalService.getUserSessions(client.userId);
      
      client.emit('sessions-list', {
        sessions: sessions.map(session => ({
          id: session.id,
          hostId: session.hostId,
          projectId: session.projectId,
          isActive: session.isActive,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          cols: session.cols,
          rows: session.rows,
        })),
      });

    } catch (error) {
      this.logger.error(`获取终端会话列表失败: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // 管理员功能：获取所有会话统计
  @SubscribeMessage('get-stats')
  async handleGetStats(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      // 这里应该检查管理员权限
      const stats = this.terminalService.getSessionStats();
      client.emit('session-stats', stats);

    } catch (error) {
      this.logger.error(`获取终端统计失败: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }
}