import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePermissionsDto {
  @ApiProperty({ description: '文件或目录路径' })
  @IsString()
  path: string;

  @ApiProperty({ description: '权限（八进制格式，如 755）', example: '755' })
  @IsString()
  @Matches(/^[0-7]{3,4}$/, { message: '权限格式不正确，应为3-4位八进制数字' })
  permissions: string;
}