import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TerminalService } from './terminal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';

@ApiTags('Web终端')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('terminal')
export class TerminalController {
  constructor(private readonly terminalService: TerminalService) {}

  @Get('sessions')
  @ApiOperation({ summary: '获取用户的终端会话列表' })
  getUserSessions(@Request() req: any) {
    const sessions = this.terminalService.getUserSessions(req.user.id);
    
    return {
      sessions: sessions.map(session => ({
        id: session.id,
        hostId: session.hostId,
        projectId: session.projectId,
        isActive: session.isActive,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        cols: session.cols,
        rows: session.rows,
      })),
    };
  }

  @Get('projects/:projectId/sessions')
  @ApiOperation({ summary: '获取项目的终端会话列表' })
  @UseGuards(ProjectGuard)
  getProjectSessions(@Param('projectId') projectId: string) {
    const sessions = this.terminalService.getProjectSessions(projectId);
    
    return {
      sessions: sessions.map(session => ({
        id: session.id,
        hostId: session.hostId,
        userId: session.userId,
        isActive: session.isActive,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        cols: session.cols,
        rows: session.rows,
      })),
    };
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: '关闭终端会话' })
  async closeSession(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    // 验证会话所有权
    const session = this.terminalService.getSession(sessionId);
    
    if (!session) {
      throw new Error('终端会话不存在');
    }

    if (session.userId !== req.user.id) {
      throw new Error('无权限关闭此终端会话');
    }

    await this.terminalService.closeSession(sessionId);
    
    return { message: '终端会话已关闭' };
  }

  @Get('stats')
  @ApiOperation({ summary: '获取终端会话统计信息（管理员）' })
  getSessionStats() {
    // 这里应该添加管理员权限检查
    return this.terminalService.getSessionStats();
  }

  @Post('sessions/:sessionId/resize')
  @ApiOperation({ summary: '调整终端窗口大小' })
  async resizeSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { cols: number; rows: number },
    @Request() req: any,
  ) {
    // 验证会话所有权
    const session = this.terminalService.getSession(sessionId);
    
    if (!session) {
      throw new Error('终端会话不存在');
    }

    if (session.userId !== req.user.id) {
      throw new Error('无权限操作此终端会话');
    }

    await this.terminalService.resizeSession(sessionId, body.cols, body.rows);
    
    return { message: '终端窗口大小已调整' };
  }
}