import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification-channel.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { NotificationChannel, ChannelType } from '@prisma/client';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private emailTransporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    // 从环境变量或系统配置中获取邮件配置
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async createChannel(projectId: string, createDto: CreateNotificationChannelDto) {
    return this.prisma.notificationChannel.create({
      data: {
        ...createDto,
        projectId,
      },
    });
  }

  async findAllChannels(projectId: string, pagination: PaginationDto) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const [channels, total] = await Promise.all([
      this.prisma.notificationChannel.findMany({
        where: { projectId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationChannel.count({ where: { projectId } }),
    ]);

    return new PaginatedResponseDto(channels, total, page, pageSize);
  }

  async findOneChannel(id: string) {
    return this.prisma.notificationChannel.findUnique({
      where: { id },
    });
  }

  async updateChannel(id: string, updateDto: UpdateNotificationChannelDto) {
    return this.prisma.notificationChannel.update({
      where: { id },
      data: updateDto,
    });
  }

  async removeChannel(id: string) {
    await this.prisma.notificationChannel.delete({ where: { id } });
    return { message: '通知渠道删除成功' };
  }

  async testChannel(id: string) {
    const channel = await this.findOneChannel(id);
    if (!channel) {
      throw new Error('通知渠道不存在');
    }

    const testMessage = {
      title: '测试通知',
      content: '这是一条测试通知消息，用于验证通知渠道配置是否正确。',
      level: 'INFO' as const,
      timestamp: new Date(),
    };

    try {
      await this.sendNotification(channel, testMessage);
      return { success: true, message: '测试通知发送成功' };
    } catch (error) {
      this.logger.error(`测试通知发送失败: ${error.message}`);
      return { success: false, message: `测试通知发送失败: ${error.message}` };
    }
  }

  async sendNotification(
    channel: NotificationChannel,
    message: {
      title: string;
      content: string;
      level: 'INFO' | 'WARNING' | 'CRITICAL';
      timestamp: Date;
    },
  ) {
    if (!channel.enabled) {
      return;
    }

    try {
      switch (channel.type) {
        case 'DINGTALK':
          await this.sendDingTalkNotification(channel, message);
          break;
        case 'EMAIL':
          await this.sendEmailNotification(channel, message);
          break;
        case 'WECHAT':
          await this.sendWeChatNotification(channel, message);
          break;
        default:
          this.logger.warn(`不支持的通知类型: ${channel.type}`);
      }
    } catch (error) {
      this.logger.error(`发送通知失败 [${channel.name}]: ${error.message}`);
      throw error;
    }
  }

  private async sendDingTalkNotification(
    channel: NotificationChannel,
    message: {
      title: string;
      content: string;
      level: 'INFO' | 'WARNING' | 'CRITICAL';
      timestamp: Date;
    },
  ) {
    const config = channel.config as any;
    const webhook = config.webhook;

    if (!webhook) {
      throw new Error('钉钉 Webhook 地址未配置');
    }

    const levelEmoji = {
      INFO: '🔵',
      WARNING: '🟡',
      CRITICAL: '🔴',
    };

    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: message.title,
        text: `## ${levelEmoji[message.level]} ${message.title}\n\n` +
              `**级别**: ${message.level}\n\n` +
              `**时间**: ${message.timestamp.toLocaleString('zh-CN')}\n\n` +
              `**内容**: ${message.content}\n\n` +
              `---\n\n` +
              `*来自 DevOps 运维管理平台*`,
      },
    };

    await axios.post(webhook, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    this.logger.log(`钉钉通知发送成功 [${channel.name}]`);
  }

  private async sendEmailNotification(
    channel: NotificationChannel,
    message: {
      title: string;
      content: string;
      level: 'INFO' | 'WARNING' | 'CRITICAL';
      timestamp: Date;
    },
  ) {
    const config = channel.config as any;
    const recipients = config.recipients;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('邮件收件人未配置');
    }

    const levelColor = {
      INFO: '#1890ff',
      WARNING: '#faad14',
      CRITICAL: '#ff4d4f',
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${levelColor[message.level]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${message.title}</h2>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
          <p><strong>级别:</strong> ${message.level}</p>
          <p><strong>时间:</strong> ${message.timestamp.toLocaleString('zh-CN')}</p>
          <p><strong>内容:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 4px; margin: 10px 0;">
            ${message.content}
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">来自 DevOps 运维管理平台</p>
        </div>
      </div>
    `;

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@devops.com',
      to: recipients.join(', '),
      subject: `[${message.level}] ${message.title}`,
      html: htmlContent,
    });

    this.logger.log(`邮件通知发送成功 [${channel.name}] -> ${recipients.join(', ')}`);
  }

  private async sendWeChatNotification(
    channel: NotificationChannel,
    message: {
      title: string;
      content: string;
      level: 'INFO' | 'WARNING' | 'CRITICAL';
      timestamp: Date;
    },
  ) {
    const config = channel.config as any;
    const webhook = config.webhook;

    if (!webhook) {
      throw new Error('企业微信 Webhook 地址未配置');
    }

    const levelColor = {
      INFO: 'info',
      WARNING: 'warning',
      CRITICAL: 'error',
    };

    const payload = {
      msgtype: 'markdown',
      markdown: {
        content: `## ${message.title}\n` +
                 `> **级别**: <font color="${levelColor[message.level]}">${message.level}</font>\n` +
                 `> **时间**: ${message.timestamp.toLocaleString('zh-CN')}\n` +
                 `> **内容**: ${message.content}\n\n` +
                 `---\n` +
                 `*来自 DevOps 运维管理平台*`,
      },
    };

    await axios.post(webhook, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    this.logger.log(`企业微信通知发送成功 [${channel.name}]`);
  }

  async sendAlertNotification(alertData: {
    ruleName: string;
    hostName: string;
    hostIp: string;
    metric: string;
    value: number;
    threshold: number;
    level: string;
    status: 'FIRING' | 'RESOLVED';
  }) {
    // 获取项目的所有启用的通知渠道
    const channels = await this.prisma.notificationChannel.findMany({
      where: { enabled: true },
    });

    const title = alertData.status === 'FIRING' 
      ? `🚨 告警触发: ${alertData.ruleName}`
      : `✅ 告警恢复: ${alertData.ruleName}`;

    const content = alertData.status === 'FIRING'
      ? `主机 ${alertData.hostName} (${alertData.hostIp}) 的 ${alertData.metric} 为 ${alertData.value.toFixed(2)}，超过阈值 ${alertData.threshold}`
      : `主机 ${alertData.hostName} (${alertData.hostIp}) 的 ${alertData.metric} 已恢复正常`;

    const message = {
      title,
      content,
      level: alertData.level as 'INFO' | 'WARNING' | 'CRITICAL',
      timestamp: new Date(),
    };

    // 并行发送到所有渠道
    const promises = channels.map(channel => 
      this.sendNotification(channel, message).catch(error => {
        this.logger.error(`发送告警通知失败 [${channel.name}]: ${error.message}`);
      })
    );

    await Promise.allSettled(promises);
  }
}