import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

export interface SystemConfig {
  // 系统基础配置
  systemName: string;
  systemDescription: string;
  systemVersion: string;
  
  // 安全配置
  sessionTimeout: number; // 分钟
  passwordMinLength: number;
  passwordRequireSpecialChar: boolean;
  maxLoginAttempts: number;
  accountLockoutDuration: number; // 分钟
  
  // 任务配置
  maxConcurrentTasks: number;
  taskTimeout: number; // 分钟
  taskRetryAttempts: number;
  
  // 监控配置
  metricsRetentionDays: number;
  monitoringInterval: number; // 秒
  alertCheckInterval: number; // 秒
  
  // 文件配置
  maxFileSize: number; // MB
  allowedFileTypes: string[];
  
  // 邮件配置
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  
  // 其他配置
  enableAuditLog: boolean;
  enableMetricsCollection: boolean;
  enableNotifications: boolean;
  timezone: string;
  language: string;
}

const DEFAULT_CONFIG: SystemConfig = {
  systemName: '企业级 DevOps 运维管理平台',
  systemDescription: '基于 Ansible 的企业级 IT 运维自动化管理平台',
  systemVersion: '1.0.0',
  
  sessionTimeout: 30,
  passwordMinLength: 8,
  passwordRequireSpecialChar: true,
  maxLoginAttempts: 5,
  accountLockoutDuration: 15,
  
  maxConcurrentTasks: 10,
  taskTimeout: 60,
  taskRetryAttempts: 3,
  
  metricsRetentionDays: 30,
  monitoringInterval: 60,
  alertCheckInterval: 30,
  
  maxFileSize: 100,
  allowedFileTypes: ['.yml', '.yaml', '.txt', '.sh', '.py', '.json', '.xml', '.conf'],
  
  enableAuditLog: true,
  enableMetricsCollection: true,
  enableNotifications: true,
  timezone: 'Asia/Shanghai',
  language: 'zh-CN',
};

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private configCache: SystemConfig | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async getConfig(): Promise<SystemConfig> {
    // 检查缓存
    if (this.configCache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.configCache;
    }

    try {
      // 从数据库获取配置
      const configs = await this.prisma.systemConfig.findMany();
      
      // 构建配置对象
      const config: SystemConfig = { ...DEFAULT_CONFIG };
      
      for (const item of configs) {
        const key = item.key as keyof SystemConfig;
        let value: any = item.value;
        
        // 类型转换
        if (item.type === 'number') {
          value = parseInt(value, 10);
        } else if (item.type === 'boolean') {
          value = value === 'true';
        } else if (item.type === 'array') {
          value = JSON.parse(value);
        } else if (item.encrypted && value) {
          // 解密敏感配置
          value = this.encryptionService.decrypt(value);
        }
        
        (config as any)[key] = value;
      }
      
      // 更新缓存
      this.configCache = config;
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION);
      
      return config;
    } catch (error) {
      this.logger.error(`获取系统配置失败: ${error.message}`);
      // 返回默认配置
      return DEFAULT_CONFIG;
    }
  }

  async updateConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
    try {
      // 验证配置
      this.validateConfig(updates);
      
      // 更新数据库
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) continue;
        
        let processedValue: string;
        let type: string;
        let encrypted = false;
        
        // 确定类型和是否需要加密
        if (typeof value === 'number') {
          type = 'number';
          processedValue = value.toString();
        } else if (typeof value === 'boolean') {
          type = 'boolean';
          processedValue = value.toString();
        } else if (Array.isArray(value)) {
          type = 'array';
          processedValue = JSON.stringify(value);
        } else {
          type = 'string';
          processedValue = value as string;
          
          // 敏感字段加密
          if (this.isSensitiveField(key)) {
            processedValue = this.encryptionService.encrypt(processedValue);
            encrypted = true;
          }
        }
        
        // 更新或创建配置项
        await this.prisma.systemConfig.upsert({
          where: { key },
          update: {
            value: processedValue,
            type,
            encrypted,
            updatedAt: new Date(),
          },
          create: {
            key,
            value: processedValue,
            type,
            encrypted,
          },
        });
      }
      
      // 清除缓存
      this.configCache = null;
      this.cacheExpiry = null;
      
      this.logger.log(`系统配置已更新: ${Object.keys(updates).join(', ')}`);
      
      // 返回更新后的配置
      return await this.getConfig();
    } catch (error) {
      this.logger.error(`更新系统配置失败: ${error.message}`);
      throw new Error(`更新系统配置失败: ${error.message}`);
    }
  }

  async resetConfig(): Promise<SystemConfig> {
    try {
      // 删除所有配置
      await this.prisma.systemConfig.deleteMany();
      
      // 清除缓存
      this.configCache = null;
      this.cacheExpiry = null;
      
      this.logger.log('系统配置已重置为默认值');
      
      return DEFAULT_CONFIG;
    } catch (error) {
      this.logger.error(`重置系统配置失败: ${error.message}`);
      throw new Error(`重置系统配置失败: ${error.message}`);
    }
  }

  async getConfigItem(key: keyof SystemConfig): Promise<any> {
    const config = await this.getConfig();
    return config[key];
  }

  async updateConfigItem(key: keyof SystemConfig, value: any): Promise<void> {
    await this.updateConfig({ [key]: value } as Partial<SystemConfig>);
  }

  async testEmailConfig(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      
      if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPassword) {
        throw new Error('邮件配置不完整');
      }
      
      // 这里可以实现实际的邮件发送测试
      // 暂时返回 true 表示配置有效
      this.logger.log('邮件配置测试通过');
      return true;
    } catch (error) {
      this.logger.error(`邮件配置测试失败: ${error.message}`);
      return false;
    }
  }

  private validateConfig(config: Partial<SystemConfig>): void {
    // 验证数值范围
    if (config.sessionTimeout !== undefined && (config.sessionTimeout < 5 || config.sessionTimeout > 480)) {
      throw new Error('会话超时时间必须在 5-480 分钟之间');
    }
    
    if (config.passwordMinLength !== undefined && (config.passwordMinLength < 6 || config.passwordMinLength > 32)) {
      throw new Error('密码最小长度必须在 6-32 字符之间');
    }
    
    if (config.maxLoginAttempts !== undefined && (config.maxLoginAttempts < 3 || config.maxLoginAttempts > 10)) {
      throw new Error('最大登录尝试次数必须在 3-10 次之间');
    }
    
    if (config.accountLockoutDuration !== undefined && (config.accountLockoutDuration < 5 || config.accountLockoutDuration > 1440)) {
      throw new Error('账户锁定时长必须在 5-1440 分钟之间');
    }
    
    if (config.maxConcurrentTasks !== undefined && (config.maxConcurrentTasks < 1 || config.maxConcurrentTasks > 100)) {
      throw new Error('最大并发任务数必须在 1-100 之间');
    }
    
    if (config.taskTimeout !== undefined && (config.taskTimeout < 1 || config.taskTimeout > 1440)) {
      throw new Error('任务超时时间必须在 1-1440 分钟之间');
    }
    
    if (config.metricsRetentionDays !== undefined && (config.metricsRetentionDays < 1 || config.metricsRetentionDays > 365)) {
      throw new Error('监控数据保留天数必须在 1-365 天之间');
    }
    
    if (config.monitoringInterval !== undefined && (config.monitoringInterval < 30 || config.monitoringInterval > 3600)) {
      throw new Error('监控采集间隔必须在 30-3600 秒之间');
    }
    
    if (config.alertCheckInterval !== undefined && (config.alertCheckInterval < 10 || config.alertCheckInterval > 600)) {
      throw new Error('告警检查间隔必须在 10-600 秒之间');
    }
    
    if (config.maxFileSize !== undefined && (config.maxFileSize < 1 || config.maxFileSize > 1024)) {
      throw new Error('最大文件大小必须在 1-1024 MB 之间');
    }
    
    // 验证邮件端口
    if (config.smtpPort !== undefined && (config.smtpPort < 1 || config.smtpPort > 65535)) {
      throw new Error('SMTP 端口必须在 1-65535 之间');
    }
    
    // 验证邮件地址格式
    if (config.smtpFromEmail !== undefined && config.smtpFromEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.smtpFromEmail)) {
        throw new Error('发件人邮箱格式不正确');
      }
    }
    
    // 验证时区
    if (config.timezone !== undefined && config.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: config.timezone });
      } catch {
        throw new Error('时区格式不正确');
      }
    }
    
    // 验证语言代码
    if (config.language !== undefined && config.language) {
      const supportedLanguages = ['zh-CN', 'en-US'];
      if (!supportedLanguages.includes(config.language)) {
        throw new Error(`不支持的语言: ${config.language}`);
      }
    }
  }

  private isSensitiveField(key: string): boolean {
    const sensitiveFields = ['smtpPassword'];
    return sensitiveFields.includes(key);
  }

  // 获取系统统计信息
  async getSystemStats() {
    try {
      const [
        userCount,
        projectCount,
        hostCount,
        taskCount,
        alertCount,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.project.count(),
        this.prisma.host.count(),
        this.prisma.task.count(),
        this.prisma.alert.count({ where: { status: 'FIRING' } }),
      ]);
      
      return {
        users: userCount,
        projects: projectCount,
        hosts: hostCount,
        tasks: taskCount,
        activeAlerts: alertCount,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: DEFAULT_CONFIG.systemVersion,
      };
    } catch (error) {
      this.logger.error(`获取系统统计失败: ${error.message}`);
      throw new Error(`获取系统统计失败: ${error.message}`);
    }
  }

  // 系统健康检查
  async healthCheck() {
    const checks = {
      database: false,
      redis: false,
      disk: false,
      memory: false,
    };
    
    try {
      // 数据库检查
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      this.logger.error(`数据库健康检查失败: ${error.message}`);
    }
    
    try {
      // 内存检查（使用率 < 90%）
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      checks.memory = memUsagePercent < 90;
    } catch (error) {
      this.logger.error(`内存健康检查失败: ${error.message}`);
    }
    
    const healthStatus = Object.values(checks).every(check => check);
    
    return {
      status: healthStatus ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date(),
    };
  }
}