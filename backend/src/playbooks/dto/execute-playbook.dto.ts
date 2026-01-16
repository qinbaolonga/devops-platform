import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsOptional } from 'class-validator';

export class ExecutePlaybookDto {
  @ApiProperty({ description: '目标主机ID列表', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  hostIds: string[];

  @ApiProperty({ description: '执行变量', required: false })
  @IsOptional()
  variables?: any;
}