import { IsString, IsEnum, IsBoolean, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChannelType } from '@prisma/client';

export class CreateNotificationChannelDto {
  @ApiProperty({ description: '渠道名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '渠道类型', enum: ChannelType })
  @IsEnum(ChannelType)
  type: ChannelType;

  @ApiProperty({ description: '渠道配置', type: 'object' })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}