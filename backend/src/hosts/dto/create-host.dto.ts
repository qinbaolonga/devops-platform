import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AuthType } from '@prisma/client';

export class CreateHostDto {
  @ApiProperty({ description: '主机名称', required: false })
  @IsOptional()
  @IsString({ message: '主机名称必须是字符串格式' })
  name?: string;

  @ApiProperty({ description: '主机名（兼容字段）', required: false })
  @IsOptional()
  @IsString({ message: '主机名必须是字符串格式' })
  hostname?: string;

  @ApiProperty({ description: 'IP地址（用于SSH连接）', required: false })
  @IsOptional()
  @IsString({ message: 'IP地址必须是字符串格式' })
  ip?: string;

  @ApiProperty({ description: '公网IP', required: false })
  @IsOptional()
  @IsString({ message: '公网IP必须是字符串格式' })
  publicIp?: string;

  @ApiProperty({ description: '内网IP', required: false })
  @IsOptional()
  @IsString({ message: '内网IP必须是字符串格式' })
  privateIp?: string;

  @ApiProperty({ description: 'SSH端口', default: 22, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'SSH端口必须是整数' })
  @Min(1, { message: 'SSH端口必须大于0' })
  @Max(65535, { message: 'SSH端口必须小于65536' })
  port?: number;

  @ApiProperty({ description: '用户名', default: 'root', required: false })
  @IsOptional()
  @IsString({ message: '用户名必须是字符串格式' })
  username?: string;

  @ApiProperty({ 
    description: '认证类型', 
    enum: AuthType,
    enumName: 'AuthType',
    example: 'PASSWORD',
    required: false
  })
  @IsOptional()
  authType?: any;

  @ApiProperty({ description: '密码', required: false })
  @IsOptional()
  @IsString({ message: '密码必须是字符串格式' })
  password?: string;

  @ApiProperty({ description: '凭据ID', required: false })
  @IsOptional()
  @IsString({ message: '凭据ID必须是字符串格式' })
  credentialId?: string;

  @ApiProperty({ description: '主机分组ID', required: false })
  @IsOptional()
  @IsString({ message: '主机分组ID必须是字符串格式' })
  groupId?: string;

  @ApiProperty({ description: '描述信息', required: false })
  @IsOptional()
  @IsString({ message: '描述信息必须是字符串格式' })
  description?: string;

  @ApiProperty({ description: '标签', required: false })
  @IsOptional()
  tags?: any;

  @ApiProperty({ description: '自定义字段', required: false })
  @IsOptional()
  customFields?: any;
}