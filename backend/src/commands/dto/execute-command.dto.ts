import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ArrayNotEmpty, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExecuteCommandDto {
  @ApiProperty({ description: '要执行的命令' })
  @IsString()
  @IsNotEmpty()
  command: string;

  @ApiProperty({ description: '目标主机ID列表', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  hostIds: string[];

  @ApiProperty({ description: '超时时间（秒）', required: false, default: 300 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return 300;
    return Number(value);
  })
  @IsNumber()
  @Min(1)
  @Max(3600)
  timeout?: number = 300;

  @ApiProperty({ description: '是否使用 root 用户执行', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  useRoot?: boolean = false;
}