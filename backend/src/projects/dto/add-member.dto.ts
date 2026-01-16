import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum ProjectRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export class AddMemberDto {
  @ApiProperty({ description: '用户ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: '项目角色', enum: ProjectRole })
  @IsEnum(ProjectRole)
  role: ProjectRole;
}