import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, IsEmail, Min, Max } from 'class-validator';

export class UpdateSystemConfigDto {
  @ApiProperty({ description: '系统名称', required: false })
  @IsOptional()
  @IsString()
  systemName?: string;

  @ApiProperty({ description: '系统描述', required: false })
  @IsOptional()
  @IsString()
  systemDescription?: string;

  @ApiProperty({ description: '系统版本', required: false })
  @IsOptional()
  @IsString()
  systemVersion?: string;

  @ApiProperty({ description: '会话超时时间（分钟）', required: false, minimum: 5, maximum: 480 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(480)
  sessionTimeout?: number;

  @ApiProperty({ description: '密码最小长度', required: false, minimum: 6, maximum: 32 })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(32)
  passwordMinLength?: number;

  @ApiProperty({ description: '密码是否需要特殊字符', required: false })
  @IsOptional()
  @IsBoolean()
  passwordRequireSpecialChar?: boolean;

  @ApiProperty({ description: '最大登录尝试次数', required: false, minimum: 3, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(10)
  maxLoginAttempts?: number;

  @ApiProperty({ description: '账户锁定时长（分钟）', required: false, minimum: 5, maximum: 1440 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  accountLockoutDuration?: number;

  @ApiProperty({ description: '最大并发任务数', required: false, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxConcurrentTasks?: number;

  @ApiProperty({ description: '任务超时时间（分钟）', required: false, minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440)
  taskTimeout?: number;

  @ApiProperty({ description: '任务重试次数', required: false, minimum: 0, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  taskRetryAttempts?: number;

  @ApiProperty({ description: '监控数据保留天数', required: false, minimum: 1, maximum: 365 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  metricsRetentionDays?: number;

  @ApiProperty({ description: '监控采集间隔（秒）', required: false, minimum: 30, maximum: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(3600)
  monitoringInterval?: number;

  @ApiProperty({ description: '告警检查间隔（秒）', required: false, minimum: 10, maximum: 600 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(600)
  alertCheckInterval?: number;

  @ApiProperty({ description: '最大文件大小（MB）', required: false, minimum: 1, maximum: 1024 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1024)
  maxFileSize?: number;

  @ApiProperty({ description: '允许的文件类型', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];

  @ApiProperty({ description: 'SMTP 服务器地址', required: false })
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiProperty({ description: 'SMTP 端口', required: false, minimum: 1, maximum: 65535 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @ApiProperty({ description: 'SMTP 是否使用 SSL/TLS', required: false })
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @ApiProperty({ description: 'SMTP 用户名', required: false })
  @IsOptional()
  @IsString()
  smtpUser?: string;

  @ApiProperty({ description: 'SMTP 密码', required: false })
  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @ApiProperty({ description: '发件人邮箱', required: false })
  @IsOptional()
  @IsEmail()
  smtpFromEmail?: string;

  @ApiProperty({ description: '发件人名称', required: false })
  @IsOptional()
  @IsString()
  smtpFromName?: string;

  @ApiProperty({ description: '是否启用审计日志', required: false })
  @IsOptional()
  @IsBoolean()
  enableAuditLog?: boolean;

  @ApiProperty({ description: '是否启用监控数据采集', required: false })
  @IsOptional()
  @IsBoolean()
  enableMetricsCollection?: boolean;

  @ApiProperty({ description: '是否启用通知', required: false })
  @IsOptional()
  @IsBoolean()
  enableNotifications?: boolean;

  @ApiProperty({ description: '时区', required: false, example: 'Asia/Shanghai' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: '语言', required: false, example: 'zh-CN' })
  @IsOptional()
  @IsString()
  language?: string;
}