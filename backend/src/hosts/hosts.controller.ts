import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HostsService } from './hosts.service';
import { CreateHostDto } from './dto/create-host.dto';
import { UpdateHostDto } from './dto/update-host.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('主机管理')
@Controller('projects/:projectId/hosts')
@UseGuards(JwtAuthGuard, ProjectGuard)
@ApiBearerAuth()
export class HostsController {
  constructor(private readonly hostsService: HostsService) {}

  @Post()
  @ApiOperation({ summary: '添加主机' })
  create(@Param('projectId') projectId: string, @Body() createHostDto: CreateHostDto) {
    console.log('=== Controller 接收到的原始数据 ===');
    console.log('createHostDto:', JSON.stringify(createHostDto, null, 2));
    
    // 处理name字段 - 支持name或hostname
    let finalName = createHostDto.name;
    if (!finalName && createHostDto.hostname) {
      finalName = createHostDto.hostname;
    }
    
    // 处理IP字段 - 如果没有ip字段，但name/hostname看起来像IP，就使用它
    let finalIp = createHostDto.ip;
    if (!finalIp) {
      // 检查name或hostname是否是IP地址格式
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (createHostDto.name && ipRegex.test(createHostDto.name)) {
        finalIp = createHostDto.name;
        finalName = createHostDto.name; // 使用IP作为名称
      } else if (createHostDto.hostname && ipRegex.test(createHostDto.hostname)) {
        finalIp = createHostDto.hostname;
        finalName = createHostDto.hostname; // 使用IP作为名称
      }
    }
    
    // 验证必要字段
    if (!finalName || finalName.trim() === '') {
      throw new BadRequestException('主机名称不能为空，请输入有效的主机名称');
    }
    
    if (!finalIp || finalIp.trim() === '') {
      throw new BadRequestException('IP地址不能为空，请输入有效的IP地址或域名');
    }

    // 处理authType - 转换为正确的枚举值
    let finalAuthType = 'PASSWORD'; // 默认值
    if (createHostDto.authType) {
      const authTypeStr = String(createHostDto.authType).toUpperCase();
      if (authTypeStr === 'PASSWORD' || authTypeStr === 'PWD') {
        finalAuthType = 'PASSWORD';
      } else if (authTypeStr === 'SSH_KEY' || authTypeStr === 'SSHKEY' || authTypeStr === 'SSH KEY') {
        finalAuthType = 'SSH_KEY';
      } else if (authTypeStr === 'CREDENTIAL' || authTypeStr === 'CRED') {
        finalAuthType = 'CREDENTIAL';
      }
    }

    // 准备数据
    const processedDto = {
      name: finalName.trim(),
      ip: finalIp.trim(),
      port: createHostDto.port || 22,
      username: createHostDto.username || 'root',
      authType: finalAuthType,
      password: createHostDto.password,
      publicIp: createHostDto.publicIp,
      privateIp: createHostDto.privateIp,
      credentialId: createHostDto.credentialId,
      groupId: createHostDto.groupId,
      description: createHostDto.description,
      tags: createHostDto.tags,
      customFields: createHostDto.customFields,
    };

    console.log('=== Controller 处理后的数据 ===');
    console.log('processedDto:', JSON.stringify(processedDto, null, 2));

    return this.hostsService.create(projectId, processedDto);
  }

  @Get()
  @ApiOperation({ summary: '获取主机列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() query: PaginationDto,
  ) {
    const { page, pageSize, search, status, groupId } = query;
    return this.hostsService.findAll(projectId, { page, pageSize }, { status, groupId, search });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取主机详情' })
  findOne(@Param('id') id: string) {
    return this.hostsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新主机' })
  update(@Param('id') id: string, @Body() updateHostDto: UpdateHostDto) {
    return this.hostsService.update(id, updateHostDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除主机' })
  remove(@Param('id') id: string) {
    return this.hostsService.remove(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: '测试主机连接' })
  testConnection(@Param('id') id: string) {
    return this.hostsService.testConnection(id);
  }

  @Post(':id/collect')
  @ApiOperation({ summary: '采集主机信息' })
  collectInfo(@Param('id') id: string) {
    return this.hostsService.collectInfo(id);
  }
}