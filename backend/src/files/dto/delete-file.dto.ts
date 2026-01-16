import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteFileDto {
  @ApiProperty({ description: '文件或目录路径' })
  @IsString()
  path: string;

  @ApiProperty({ description: '是否为目录', default: false })
  @IsBoolean()
  @IsOptional()
  isDirectory?: boolean = false;
}