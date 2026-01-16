import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';

@ApiTags('定时任务管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/scheduled-tasks')
export class ScheduledTasksController {
  constructor(private readonly scheduledTasksService: ScheduledTasksService) {}

  @Post()
  @ApiOperation({ summary: '创建定时任务' })
  create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateScheduledTaskDto,
    @Request() req: any,
  ) {
    return this.scheduledTasksService.create(projectId, createDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取定时任务列表' })
  findAll(
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.scheduledTasksService.findAll(projectId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取定时任务详情' })
  findOne(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.scheduledTasksService.findOne(id, projectId);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: '获取定时任务执行历史' })
  getExecutionHistory(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.scheduledTasksService.getExecutionHistory(id, projectId, pagination);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新定时任务' })
  update(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() updateDto: UpdateScheduledTaskDto,
  ) {
    return this.scheduledTasksService.update(id, projectId, updateDto);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: '启用定时任务' })
  enable(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.scheduledTasksService.enable(id, projectId);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: '禁用定时任务' })
  disable(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.scheduledTasksService.disable(id, projectId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除定时任务' })
  remove(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.scheduledTasksService.remove(id, projectId);
  }
}