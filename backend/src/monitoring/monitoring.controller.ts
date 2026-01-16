import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';

@ApiTags('监控管理')
@Controller('projects/:projectId/metrics')
@UseGuards(JwtAuthGuard, ProjectGuard)
@ApiBearerAuth()
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('overview')
  @ApiOperation({ summary: '获取监控概览' })
  getOverview(@Param('projectId') projectId: string) {
    return this.monitoringService.getOverview(projectId);
  }

  @Get('hosts/:id')
  @ApiOperation({ summary: '获取主机监控指标' })
  @ApiQuery({ name: 'hours', required: false, description: '时间范围（小时）' })
  getHostMetrics(@Param('id') hostId: string, @Query('hours') hours?: string) {
    return this.monitoringService.getHostMetrics(hostId, hours ? parseInt(hours) : 24);
  }

  @Get('trends')
  @ApiOperation({ summary: '获取监控趋势' })
  @ApiQuery({ name: 'hours', required: false, description: '时间范围（小时）' })
  getTrends(@Param('projectId') projectId: string, @Query('hours') hours?: string) {
    return this.monitoringService.getTrends(projectId, hours ? parseInt(hours) : 24);
  }
}