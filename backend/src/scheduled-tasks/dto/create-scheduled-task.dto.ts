import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduledTaskDto {
  @ApiProperty({ description: '任务名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '任务描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Cron 表达式' })
  @IsString()
  @IsNotEmpty()
  cronExpression: string;

  @ApiProperty({ description: '任务类型', enum: ['COMMAND', 'PLAYBOOK'] })
  @IsString()
  @IsNotEmpty()
  type: 'COMMAND' | 'PLAYBOOK';

  @ApiProperty({ description: '命令内容（当类型为 COMMAND 时）', required: false })
  @IsString()
  @IsOptional()
  command?: string;

  @ApiProperty({ description: 'Playbook ID（当类型为 PLAYBOOK 时）', required: false })
  @IsString()
  @IsOptional()
  playbookId?: string;

  @ApiProperty({ description: '目标主机 ID 列表' })
  @IsString({ each: true })
  hostIds: string[];

  @ApiProperty({ description: '任务变量', required: false })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiProperty({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;
}