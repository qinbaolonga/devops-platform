import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { Client } from 'ssh2';

export interface TerminalSession {
  id: string;
  hostId: string;
  userId: string;
  projectId: string;
  sshClient: Client;
  stream: any;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  cols: number;
  rows: number;
}

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);
  private sessions = new Map<string, TerminalSession>();
  private sessionTimeout = 30 * 60 * 1000; // 30分钟超时

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {
    // 定期清理超时的会话
    setInterval(() => {
      this.cleanupTimeoutSessions();
    }, 60000); // 每分钟检查一次
  }

  async createSession(
    hostId: string,
    userId: string,
    projectId: string,
    cols: number = 80,
    rows: number = 24,
  ): Promise<string> {
    // 验证主机是否存在且用户有权限
    const host = await this.prisma.host.findFirst({
      where: {
        id: hostId,
        projectId,
      },
      include: {
        credential: true,
      },
    });

    if (!host) {
      throw new Error('主机不存在或无权限访问');
    }

    this.logger.log(`主机认证信息: authType=${host.authType}, hasPassword=${!!host.password}, hasCredential=${!!host.credential}, username=${host.username}`);

    // 验证用户项目权限
    const projectMember = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (!projectMember) {
      throw new Error('用户无项目访问权限');
    }

    const sessionId = this.generateSessionId();
    
    try {
      const sshClient = new Client();
      
      // 创建会话对象
      const session: TerminalSession = {
        id: sessionId,
        hostId,
        userId,
        projectId,
        sshClient,
        stream: null,
        isActive: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        cols,
        rows,
      };

      // 连接SSH
      await this.connectSSH(session, host);
      
      // 保存会话
      this.sessions.set(sessionId, session);
      
      this.logger.log(`终端会话已创建: ${sessionId} -> ${host.name} (${host.ip})`);
      
      return sessionId;
    } catch (error) {
      this.logger.error(`创建终端会话失败: ${error.message}`);
      throw new Error(`连接主机失败: ${error.message}`);
    }
  }

  private async connectSSH(session: TerminalSession, host: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const { sshClient } = session;
      
      const connectionConfig: any = {
        host: host.ip,
        port: host.port || 22,
        username: host.username || 'root',
        readyTimeout: 10000,
        keepaliveInterval: 30000,
      };

      // 根据认证类型配置连接
      if (host.authType === 'PASSWORD' && host.password) {
        connectionConfig.password = this.encryptionService.decrypt(host.password);
      } else if (host.authType === 'SSH_KEY' && host.credential?.privateKey) {
        connectionConfig.privateKey = this.encryptionService.decrypt(host.credential.privateKey);
        if (host.credential.passphrase) {
          connectionConfig.passphrase = this.encryptionService.decrypt(host.credential.passphrase);
        }
      } else if (host.authType === 'CREDENTIAL' && host.credential) {
        // 使用凭据表中的认证信息
        if (host.credential.privateKey) {
          connectionConfig.privateKey = this.encryptionService.decrypt(host.credential.privateKey);
          if (host.credential.passphrase) {
            connectionConfig.passphrase = this.encryptionService.decrypt(host.credential.passphrase);
          }
        } else if (host.credential.password) {
          connectionConfig.password = this.encryptionService.decrypt(host.credential.password);
        }
        // 如果凭据中有用户名，使用凭据的用户名
        if (host.credential.username) {
          connectionConfig.username = host.credential.username;
        }
      } else {
        this.logger.error(`主机认证信息不完整: authType=${host.authType}, hasPassword=${!!host.password}, hasCredential=${!!host.credential}`);
        reject(new Error('主机认证信息不完整'));
        return;
      }

      sshClient.on('ready', () => {
        sshClient.shell({
          cols: session.cols,
          rows: session.rows,
          term: 'xterm-256color',
        }, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          session.stream = stream;
          session.isActive = true;
          session.lastActivity = new Date();

          // 监听流事件
          stream.on('close', () => {
            this.logger.log(`终端会话流已关闭: ${session.id}`);
            session.isActive = false;
          });

          stream.on('data', (buffer: Buffer) => {
            session.lastActivity = new Date();
            // 数据将通过 WebSocket 发送给客户端
          });

          resolve();
        });
      });

      sshClient.on('error', (err) => {
        this.logger.error(`SSH连接错误: ${err.message}`);
        reject(err);
      });

      sshClient.on('close', () => {
        this.logger.log(`SSH连接已关闭: ${session.id}`);
        session.isActive = false;
      });

      sshClient.connect(connectionConfig);
    });
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  async writeToSession(sessionId: string, data: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive || !session.stream) {
      throw new Error('终端会话不存在或已断开');
    }

    session.lastActivity = new Date();
    session.stream.write(data);
  }

  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive || !session.stream) {
      throw new Error('终端会话不存在或已断开');
    }

    session.cols = cols;
    session.rows = rows;
    session.lastActivity = new Date();
    
    // 调整终端大小
    session.stream.setWindow(rows, cols);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return;
    }

    try {
      if (session.stream) {
        session.stream.end();
      }
      
      if (session.sshClient) {
        session.sshClient.end();
      }
      
      session.isActive = false;
      this.sessions.delete(sessionId);
      
      this.logger.log(`终端会话已关闭: ${sessionId}`);
    } catch (error) {
      this.logger.error(`关闭终端会话失败: ${error.message}`);
    }
  }

  getUserSessions(userId: string): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId && session.isActive
    );
  }

  getProjectSessions(projectId: string): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.projectId === projectId && session.isActive
    );
  }

  private cleanupTimeoutSessions(): void {
    const now = new Date();
    const timeoutSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.sessionTimeout) {
        timeoutSessions.push(sessionId);
      }
    }

    // 清理超时会话
    for (const sessionId of timeoutSessions) {
      this.logger.log(`清理超时终端会话: ${sessionId}`);
      this.closeSession(sessionId);
    }

    if (timeoutSessions.length > 0) {
      this.logger.log(`已清理 ${timeoutSessions.length} 个超时终端会话`);
    }
  }

  private generateSessionId(): string {
    return `terminal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // 获取会话统计信息
  getSessionStats() {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive);
    
    return {
      total: this.sessions.size,
      active: activeSessions.length,
      byProject: this.groupBy(activeSessions, 'projectId'),
      byUser: this.groupBy(activeSessions, 'userId'),
    };
  }

  private groupBy(array: any[], key: string) {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }
}