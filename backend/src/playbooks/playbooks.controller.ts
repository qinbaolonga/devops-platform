import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlaybooksService } from './playbooks.service';
import { CreatePlaybookDto } from './dto/create-playbook.dto';
import { UpdatePlaybookDto } from './dto/update-playbook.dto';
import { ExecutePlaybookDto } from './dto/execute-playbook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Playbook 管理')
@Controller('projects/:projectId/playbooks')
@UseGuards(JwtAuthGuard, ProjectGuard)
@ApiBearerAuth()
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Post()
  @ApiOperation({ summary: '创建 Playbook' })
  create(
    @Param('projectId') projectId: string,
    @Body() createPlaybookDto: CreatePlaybookDto,
    @Req() req: any,
  ) {
    return this.playbooksService.create(projectId, createPlaybookDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取 Playbook 列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.playbooksService.findAll(projectId, pagination, { search });
  }

  @Post('validate')
  @ApiOperation({ summary: '验证 Playbook YAML 语法（无需 ID）' })
  validateContent(@Body() body: { content: string }) {
    try {
      const yaml = require('js-yaml');
      const parsed = yaml.load(body.content);
      return {
        valid: true,
        message: 'Playbook 语法正确',
        parsed,
      };
    } catch (error) {
      return {
        valid: false,
        message: 'YAML 语法错误: ' + error.message,
        error: error.message,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取 Playbook 详情' })
  findOne(@Param('id') id: string) {
    return this.playbooksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 Playbook' })
  update(@Param('id') id: string, @Body() updatePlaybookDto: UpdatePlaybookDto) {
    return this.playbooksService.update(id, updatePlaybookDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Playbook' })
  remove(@Param('id') id: string) {
    return this.playbooksService.remove(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: '执行 Playbook' })
  execute(
    @Param('id') id: string,
    @Body() executePlaybookDto: ExecutePlaybookDto,
    @Req() req: any,
  ) {
    return this.playbooksService.execute(id, executePlaybookDto, req.user.id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '获取 Playbook 版本历史' })
  async getVersions(@Param('id') id: string) {
    const playbook = await this.playbooksService.findOne(id);
    return playbook.versions || [];
  }

  @Post(':id/validate')
  @ApiOperation({ summary: '验证 Playbook 语法' })
  validate(@Param('id') id: string) {
    return this.playbooksService.validate(id);
  }
}