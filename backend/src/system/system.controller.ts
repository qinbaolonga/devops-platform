import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService, SystemConfig } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

@ApiTags('系统管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('config')
  @ApiOperation({ summary: '获取系统配置' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getConfig(): Promise<SystemConfig> {
    return await this.systemService.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: '更新系统配置' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateConfig(@Body() updateDto: UpdateSystemConfigDto): Promise<SystemConfig> {
    return await this.systemService.updateConfig(updateDto);
  }

  @Post('config/reset')
  @ApiOperation({ summary: '重置系统配置为默认值' })
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async resetConfig(): Promise<SystemConfig> {
    return await this.systemService.resetConfig();
  }

  @Post('config/test-email')
  @ApiOperation({ summary: '测试邮件配置' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async testEmailConfig(): Promise<{ success: boolean; message: string }> {
    const success = await this.systemService.testEmailConfig();
    return {
      success,
      message: success ? '邮件配置测试成功' : '邮件配置测试失败',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: '获取系统统计信息' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getSystemStats() {
    return await this.systemService.getSystemStats();
  }

  @Get('health')
  @ApiOperation({ summary: '系统健康检查' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  async healthCheck() {
    return await this.systemService.healthCheck();
  }

  @Get('info')
  @ApiOperation({ summary: '获取系统基本信息（公开接口）' })
  @Public()
  async getSystemInfo() {
    const config = await this.systemService.getConfig();
    
    // 只返回公开信息
    return {
      systemName: config.systemName,
      systemDescription: config.systemDescription,
      systemVersion: config.systemVersion,
      timezone: config.timezone,
      language: config.language,
    };
  }
}