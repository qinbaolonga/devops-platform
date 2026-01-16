import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenameFileDto {
  @ApiProperty({ description: '原文件路径' })
  @IsString()
  oldPath: string;

  @ApiProperty({ description: '新文件路径' })
  @IsString()
  newPath: string;
}