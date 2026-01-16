import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('项目管理')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: '创建项目' })
  create(@Body() createProjectDto: CreateProjectDto, @Req() req: any) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取项目列表' })
  findAll(@Query() pagination: PaginationDto, @Req() req: any) {
    return this.projectsService.findAll(pagination, req.user.id, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新项目' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '获取项目成员列表' })
  getMembers(@Param('id') id: string) {
    return this.projectsService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: '添加项目成员' })
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.projectsService.addMember(id, addMemberDto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: '移除项目成员' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.projectsService.removeMemberById(id, memberId);
  }
}
