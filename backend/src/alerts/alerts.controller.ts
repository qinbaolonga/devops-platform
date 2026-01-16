import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('告警管理')
@Controller('projects/:projectId/alert-rules')
@UseGuards(JwtAuthGuard, ProjectGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @ApiOperation({ summary: '创建告警规则' })
  createRule(@Param('projectId') projectId: string, @Body() createAlertRuleDto: CreateAlertRuleDto) {
    return this.alertsService.createRule(projectId, createAlertRuleDto);
  }

  @Get()
  @ApiOperation({ summary: '获取告警规则列表' })
  findAllRules(@Param('projectId') projectId: string, @Query() pagination: PaginationDto) {
    return this.alertsService.findAllRules(projectId, pagination);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新告警规则' })
  updateRule(@Param('id') id: string, @Body() updateAlertRuleDto: UpdateAlertRuleDto) {
    return this.alertsService.updateRule(id, updateAlertRuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除告警规则' })
  removeRule(@Param('id') id: string) {
    return this.alertsService.removeRule(id);
  }
}

@ApiTags('告警管理')
@Controller('projects/:projectId/alerts')
@UseGuards(JwtAuthGuard, ProjectGuard)
@ApiBearerAuth()
export class AlertsListController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: '获取告警列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'level', required: false })
  findAllAlerts(
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('level') level?: string,
  ) {
    return this.alertsService.findAllAlerts(projectId, pagination, { status, level });
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: '确认告警' })
  acknowledgeAlert(@Param('id') id: string, @Req() req: any) {
    return this.alertsService.acknowledgeAlert(id, req.user.id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: '解决告警' })
  resolveAlert(@Param('id') id: string) {
    return this.alertsService.resolveAlert(id);
  }
}