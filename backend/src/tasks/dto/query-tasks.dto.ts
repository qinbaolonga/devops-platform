import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';

export class QueryTasksDto {
  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiProperty({ description: '限制数量（兼容前端limit参数）', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ 
    description: '任务状态', 
    enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    required: false 
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.toUpperCase() : value)
  @IsIn(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'])
  status?: string;

  @ApiProperty({ 
    description: '任务类型', 
    enum: ['COMMAND', 'PLAYBOOK', 'SCRIPT'],
    required: false 
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.toUpperCase() : value)
  @IsIn(['COMMAND', 'PLAYBOOK', 'SCRIPT'])
  type?: string;

  @ApiProperty({ description: '创建者ID', required: false })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiProperty({ description: '开始日期', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: '结束日期', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;
}