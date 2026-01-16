import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BrowseFilesDto {
  @ApiProperty({ description: '远程路径', default: '/', required: false })
  @IsString()
  @IsOptional()
  path?: string = '/';
}