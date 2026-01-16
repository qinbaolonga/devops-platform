import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsArray, IsBoolean, Min } from 'class-validator';
import { MetricType, Operator, AlertLevel } from '@prisma/client';

export class CreateAlertRuleDto {
  @ApiProperty({ description: '规则名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '监控指标', enum: MetricType })
  @IsEnum(MetricType)
  metric: MetricType;

  @ApiProperty({ description: '比较操作符', enum: Operator })
  @IsEnum(Operator)
  operator: Operator;

  @ApiProperty({ description: '阈值' })
  @IsNumber()
  threshold: number;

  @ApiProperty({ description: '持续时间（分钟）' })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ description: '告警级别', enum: AlertLevel })
  @IsEnum(AlertLevel)
  level: AlertLevel;

  @ApiProperty({ description: '目标主机ID列表', type: [String] })
  @IsArray()
  hostIds: string[];

  @ApiProperty({ description: '是否启用', default: true })
  @IsBoolean()
  enabled: boolean = true;
}