import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification-channel.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';

@ApiTags('通知渠道')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/notification-channels')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: '创建通知渠道' })
  create(
    @Param('projectId') projectId: string,
    @Body() createNotificationChannelDto: CreateNotificationChannelDto,
  ) {
    return this.notificationsService.createChannel(projectId, createNotificationChannelDto);
  }

  @Get()
  @ApiOperation({ summary: '获取通知渠道列表' })
  findAll(
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.notificationsService.findAllChannels(projectId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取通知渠道详情' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOneChannel(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新通知渠道' })
  update(
    @Param('id') id: string,
    @Body() updateNotificationChannelDto: UpdateNotificationChannelDto,
  ) {
    return this.notificationsService.updateChannel(id, updateNotificationChannelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知渠道' })
  remove(@Param('id') id: string) {
    return this.notificationsService.removeChannel(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: '测试通知渠道' })
  test(@Param('id') id: string) {
    return this.notificationsService.testChannel(id);
  }
}