import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, body, params } = request;
    const userAgent = request.get('user-agent') || '';

    // 获取真实客户端IP
    const ip = this.getClientIp(request);

    // 只记录需要认证的请求
    if (!user) {
      return next.handle();
    }

    // 确定操作类型
    const action = this.getAction(method, url);
    const resource = this.getResource(url);
    const resourceId = params.id || params.projectId || params.hostId;

    return next.handle().pipe(
      tap({
        next: () => {
          // 异步记录日志，不阻塞响应
          this.auditService
            .createLog({
              userId: user.id,
              action,
              resource,
              resourceId,
              details: { method, url, body: this.sanitizeBody(body) },
              ip,
              userAgent,
            })
            .catch((error) => {
              console.error('Failed to create audit log:', error);
            });
        },
      }),
    );
  }

  /**
   * 获取真实客户端IP地址
   * 支持代理服务器转发的情况
   */
  private getClientIp(request: any): string {
    // 优先从 X-Forwarded-For 头获取（代理服务器场景）
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      // X-Forwarded-For 可能包含多个IP，取第一个（真实客户端IP）
      const ips = xForwardedFor.split(',').map((ip: string) => ip.trim());
      if (ips[0] && ips[0] !== '127.0.0.1' && ips[0] !== '::1') {
        return ips[0];
      }
    }

    // 尝试从 X-Real-IP 头获取（Nginx 常用）
    const xRealIp = request.headers['x-real-ip'];
    if (xRealIp && xRealIp !== '127.0.0.1' && xRealIp !== '::1') {
      return xRealIp;
    }

    // 尝试从 X-Client-IP 头获取
    const xClientIp = request.headers['x-client-ip'];
    if (xClientIp && xClientIp !== '127.0.0.1' && xClientIp !== '::1') {
      return xClientIp;
    }

    // 从 socket 获取远程地址
    let ip = request.ip || request.connection?.remoteAddress || request.socket?.remoteAddress;
    
    // 处理 IPv6 格式的 localhost
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }
    
    // 移除 IPv6 前缀
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    return ip || 'unknown';
  }

  private getAction(method: string, url: string): string {
    const methodMap: Record<string, string> = {
      GET: '查询',
      POST: '创建',
      PUT: '更新',
      PATCH: '更新',
      DELETE: '删除',
    };

    if (url.includes('/login')) return '登录';
    if (url.includes('/logout')) return '登出';
    if (url.includes('/password')) return '修改密码';
    if (url.includes('/execute')) return '执行';
    if (url.includes('/upload')) return '上传';
    if (url.includes('/download')) return '下载';

    return methodMap[method] || method;
  }

  private getResource(url: string): string {
    if (url.includes('/auth')) return '认证';
    if (url.includes('/users')) return '用户';
    if (url.includes('/projects')) return '项目';
    if (url.includes('/hosts')) return '主机';
    if (url.includes('/commands')) return '命令';
    if (url.includes('/playbooks')) return 'Playbook';
    if (url.includes('/tasks')) return '任务';
    if (url.includes('/files')) return '文件';
    if (url.includes('/alerts')) return '告警';
    if (url.includes('/metrics')) return '监控';

    return 'API';
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};

    const sanitized = { ...body };

    // 移除敏感字段
    const sensitiveFields = ['password', 'token', 'secret', 'privateKey'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  }
}
