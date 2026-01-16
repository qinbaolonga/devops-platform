import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreatePlaybookDto } from './create-playbook.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePlaybookDto extends PartialType(CreatePlaybookDto) {
  @ApiProperty({ description: '版本更新说明', required: false })
  @IsOptional()
  @IsString()
  changelog?: string;
}