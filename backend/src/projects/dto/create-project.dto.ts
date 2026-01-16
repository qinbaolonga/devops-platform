import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '项目描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
