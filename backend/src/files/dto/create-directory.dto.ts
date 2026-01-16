import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDirectoryDto {
  @ApiProperty({ description: '目录路径' })
  @IsString()
  path: string;

  @ApiProperty({ description: '是否递归创建', default: false })
  @IsBoolean()
  @IsOptional()
  recursive?: boolean = false;
}