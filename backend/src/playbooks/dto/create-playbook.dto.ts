import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePlaybookDto {
  @ApiProperty({ description: 'Playbook 名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Playbook 描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Playbook 内容 (YAML)' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '变量定义', required: false })
  @IsOptional()
  variables?: any;
}