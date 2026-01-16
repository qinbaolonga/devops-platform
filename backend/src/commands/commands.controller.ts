import { Controller, Get, Post, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommandsService } from './commands.service';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('命令执行')
@Controller('projects/:projectId/commands')
@UseGuards(JwtAuthGuard, ProjectGuard)
@ApiBearerAuth()
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post('execute')
  @ApiOperation({ summary: '执行命令' })
  execute(
    @Param('projectId') projectId: string,
    @Body() executeCommandDto: ExecuteCommandDto,
    @Req() req: any,
  ) {
    console.log('Received executeCommandDto:', JSON.stringify(executeCommandDto, null, 2));
    console.log('Timeout type:', typeof executeCommandDto.timeout);
    return this.commandsService.execute(projectId, executeCommandDto, req.user.id);
  }

  @Get('history')
  @ApiOperation({ summary: '获取命令执行历史' })
  getHistory(@Param('projectId') projectId: string, @Query() pagination: PaginationDto) {
    return this.commandsService.getHistory(projectId, pagination);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: '获取任务详情' })
  getTask(@Param('id') id: string) {
    return this.commandsService.getTask(id);
  }
}