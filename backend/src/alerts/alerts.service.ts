import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DevOpsWebSocketGateway } from '../websocket/websocket.gateway';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricType, Operator } from '@prisma/client';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private webSocketGateway: DevOpsWebSocketGateway,
  ) {}

  async createRule(projectId: string, createAlertRuleDto: CreateAlertRuleDto) {
    return this.prisma.alertRule.create({
      data: {
        ...createAlertRuleDto,
        projectId,
      },
    });
  }

  async findAllRules(projectId: string, pagination: PaginationDto) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const [rules, total] = await Promise.all([
      this.prisma.alertRule.findMany({
        where: { projectId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alertRule.count({ where: { projectId } }),
    ]);

    return new PaginatedResponseDto(rules, total, page, pageSize);
  }

  async updateRule(id: string, updateAlertRuleDto: UpdateAlertRuleDto) {
    return this.prisma.alertRule.update({
      where: { id },
      data: updateAlertRuleDto,
    });
  }

  async removeRule(id: string) {
    await this.prisma.alertRule.delete({ where: { id } });
    return { message: '告警规则删除成功' };
  }

  async findAllAlerts(projectId: string, pagination: PaginationDto, filters?: any) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: any = { rule: { projectId } };

    if (filters?.status) {
      // 处理 'active' 状态 - 表示未解决的告警
      if (filters.status.toLowerCase() === 'active') {
        where.status = { in: ['FIRING', 'ACKNOWLEDGED'] };
      } else {
        where.status = filters.status.toUpperCase();
      }
    }

    if (filters?.level) {
      where.level = filters.level.toUpperCase();
    }

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          rule: { select: { name: true } },
          host: { select: { name: true, ip: true } },
        },
        orderBy: { firedAt: 'desc' },
      }),
      this.prisma.alert.count({ where }),
    ]);

    // 添加 name 字段用于前端显示
    const alertsWithName = alerts.map(alert => ({
      ...alert,
      name: alert.rule?.name || '未知告警',
      createdAt: alert.firedAt,
    }));

    return new PaginatedResponseDto(alertsWithName, total, page, pageSize);
  }

  async acknowledgeAlert(id: string, userId: string) {
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });
  }

  async resolveAlert(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAlerts() {
    this.logger.debug('开始检查告警规则');

    try {
      const rules = await this.prisma.alertRule.findMany({
        where: { enabled: true },
      });

      for (const rule of rules) {
        await this.checkRule(rule);
      }

      this.logger.debug(`完成 ${rules.length} 个告警规则检查`);
    } catch (error) {
      this.logger.error('告警检查失败:', error.message);
    }
  }

  private async checkRule(rule: any) {
    const hostIds = Array.isArray(rule.hostIds) ? rule.hostIds : [];
    
    if (hostIds.length === 0) return;

    // 获取最近的指标数据
    const recentMetrics = await this.prisma.hostMetric.findMany({
      where: {
        hostId: { in: hostIds },
        timestamp: { gte: new Date(Date.now() - rule.duration * 60 * 1000) },
      },
      include: { host: true },
      orderBy: { timestamp: 'desc' },
    });

    // 按主机分组
    const metricsByHost: Record<string, any[]> = {};
    recentMetrics.forEach(metric => {
      if (!metricsByHost[metric.hostId]) {
        metricsByHost[metric.hostId] = [];
      }
      metricsByHost[metric.hostId].push(metric);
    });

    // 检查每个主机
    for (const [hostId, metrics] of Object.entries(metricsByHost)) {
      const hostMetrics = metrics as any[];
      if (hostMetrics.length === 0) continue;

      const latestMetric = hostMetrics[0];
      const value = this.getMetricValue(latestMetric, rule.metric);

      if (this.checkThreshold(value, rule.operator, rule.threshold)) {
        // 检查是否已有未解决的告警
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            ruleId: rule.id,
            hostId,
            status: { in: ['FIRING', 'ACKNOWLEDGED'] },
          },
        });

        if (!existingAlert) {
          // 创建新告警
          const newAlert = await this.prisma.alert.create({
            data: {
              ruleId: rule.id,
              hostId,
              level: rule.level,
              message: this.generateAlertMessage(rule, latestMetric.host, value),
              value,
              status: 'FIRING',
            },
            include: {
              rule: { select: { name: true, projectId: true } },
              host: { select: { name: true, ip: true } },
            },
          });

          this.logger.warn(`触发告警: ${rule.name} - ${latestMetric.host.name}`);

          // 发送 WebSocket 实时通知
          this.webSocketGateway.sendAlertNotification(rule.projectId, {
            id: newAlert.id,
            type: 'FIRING',
            ruleName: rule.name,
            hostName: latestMetric.host.name,
            hostIp: latestMetric.host.ip,
            level: rule.level,
            message: newAlert.message,
            value,
            threshold: rule.threshold,
          });

          // 发送告警通知
          try {
            await this.notificationsService.sendAlertNotification({
              ruleName: rule.name,
              hostName: latestMetric.host.name,
              hostIp: latestMetric.host.ip,
              metric: this.getMetricName(rule.metric),
              value,
              threshold: rule.threshold,
              level: rule.level,
              status: 'FIRING',
            });
          } catch (error) {
            this.logger.error(`发送告警通知失败: ${error.message}`);
          }
        }
      } else {
        // 检查是否需要恢复告警
        const firingAlert = await this.prisma.alert.findFirst({
          where: {
            ruleId: rule.id,
            hostId,
            status: 'FIRING',
          },
        });

        if (firingAlert) {
          await this.prisma.alert.update({
            where: { id: firingAlert.id },
            data: {
              status: 'RESOLVED',
              resolvedAt: new Date(),
            },
          });

          this.logger.log(`告警恢复: ${rule.name} - ${latestMetric.host.name}`);

          // 发送 WebSocket 实时通知
          this.webSocketGateway.sendAlertNotification(rule.projectId, {
            id: firingAlert.id,
            type: 'RESOLVED',
            ruleName: rule.name,
            hostName: latestMetric.host.name,
            hostIp: latestMetric.host.ip,
            level: rule.level,
            message: `告警已恢复: ${this.generateAlertMessage(rule, latestMetric.host, value)}`,
            value,
            threshold: rule.threshold,
          });

          // 发送恢复通知
          try {
            await this.notificationsService.sendAlertNotification({
              ruleName: rule.name,
              hostName: latestMetric.host.name,
              hostIp: latestMetric.host.ip,
              metric: this.getMetricName(rule.metric),
              value,
              threshold: rule.threshold,
              level: rule.level,
              status: 'RESOLVED',
            });
          } catch (error) {
            this.logger.error(`发送恢复通知失败: ${error.message}`);
          }
        }
      }
    }
  }

  private getMetricValue(metric: any, metricType: MetricType): number {
    switch (metricType) {
      case 'CPU': return metric.cpuUsage;
      case 'MEMORY': return metric.memoryUsage;
      case 'DISK': return metric.diskUsage;
      case 'NETWORK_IN': return metric.networkIn;
      case 'NETWORK_OUT': return metric.networkOut;
      case 'LOAD': return metric.loadAvg;
      default: return 0;
    }
  }

  private checkThreshold(value: number, operator: Operator, threshold: number): boolean {
    switch (operator) {
      case 'GT': return value > threshold;
      case 'GTE': return value >= threshold;
      case 'LT': return value < threshold;
      case 'LTE': return value <= threshold;
      case 'EQ': return value === threshold;
      default: return false;
    }
  }

  private generateAlertMessage(rule: any, host: any, value: number): string {
    const metricName = this.getMetricName(rule.metric);
    return `主机 ${host.name} (${host.ip}) 的 ${metricName} 为 ${value.toFixed(2)}，${this.getOperatorText(rule.operator)} ${rule.threshold}`;
  }

  private getMetricName(metric: MetricType): string {
    const names = {
      CPU: 'CPU使用率',
      MEMORY: '内存使用率',
      DISK: '磁盘使用率',
      NETWORK_IN: '网络入流量',
      NETWORK_OUT: '网络出流量',
      LOAD: '系统负载',
    };
    return names[metric] || metric;
  }

  private getOperatorText(operator: Operator): string {
    const texts = {
      GT: '大于',
      GTE: '大于等于',
      LT: '小于',
      LTE: '小于等于',
      EQ: '等于',
    };
    return texts[operator] || operator;
  }
}