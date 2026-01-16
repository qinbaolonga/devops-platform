import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';

@ApiTags('任务管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  findAll(
    @Param('projectId') projectId: string,
    @Query() queryDto: QueryTasksDto,
  ) {
    // 处理 limit 参数兼容性
    const pagination = {
      page: queryDto.page || 1,
      pageSize: queryDto.limit || queryDto.pageSize || 10,
    };

    const filters = {
      status: queryDto.status,
      type: queryDto.type,
      createdBy: queryDto.createdBy,
      startDate: queryDto.startDate,
      endDate: queryDto.endDate,
    };

    return this.tasksService.findAll(projectId, pagination, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取任务统计信息' })
  getStatistics(
    @Param('projectId') projectId: string,
    @Query('days') days?: number,
  ) {
    return this.tasksService.getStatistics(projectId, days ? parseInt(days.toString()) : 30);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除任务' })
  batchRemove(
    @Param('projectId') projectId: string,
    @Body() body: { ids: string[] },
  ) {
    return this.tasksService.batchRemove(body.ids, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.tasksService.findOne(id, projectId);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '获取任务日志' })
  getLogs(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.tasksService.getLogs(id, projectId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消任务' })
  cancel(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.tasksService.cancel(id, projectId);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: '重试失败的任务' })
  retry(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.tasksService.retry(id, projectId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务' })
  remove(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.tasksService.remove(id, projectId);
  }
}