import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnsibleService } from '../ansible/ansible.service';
import { SimpleQueueService } from '../queue/queue.service';
import { CreatePlaybookDto } from './dto/create-playbook.dto';
import { UpdatePlaybookDto } from './dto/update-playbook.dto';
import { ExecutePlaybookDto } from './dto/execute-playbook.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import * as yaml from 'js-yaml';

@Injectable()
export class PlaybooksService {
  constructor(
    private prisma: PrismaService,
    private ansibleService: AnsibleService,
    private queueService: SimpleQueueService,
  ) {}

  async create(projectId: string, createPlaybookDto: CreatePlaybookDto, userId: string) {
    // 验证 YAML 语法
    try {
      yaml.load(createPlaybookDto.content);
    } catch (error) {
      throw new BadRequestException('Playbook YAML 语法错误: ' + error.message);
    }

    const playbook = await this.prisma.playbook.create({
      data: {
        ...createPlaybookDto,
        projectId,
        createdBy: userId,
        versions: {
          create: {
            version: 1,
            content: createPlaybookDto.content,
            changelog: '初始版本',
          },
        },
      },
      include: { versions: true },
    });

    return playbook;
  }

  async findAll(projectId: string, pagination: PaginationDto, filters?: any) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: any = { projectId };

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [playbooks, total] = await Promise.all([
      this.prisma.playbook.findMany({
        where,
        skip,
        take: pageSize,
        include: { user: { select: { username: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.playbook.count({ where }),
    ]);

    return new PaginatedResponseDto(playbooks, total, page, pageSize);
  }

  async findOne(id: string) {
    const playbook = await this.prisma.playbook.findUnique({
      where: { id },
      include: {
        user: { select: { username: true } },
        versions: { orderBy: { version: 'desc' } },
      },
    });

    if (!playbook) {
      throw new NotFoundException('Playbook 不存在');
    }

    return playbook;
  }

  async update(id: string, updatePlaybookDto: UpdatePlaybookDto) {
    const playbook = await this.prisma.playbook.findUnique({ where: { id } });
    if (!playbook) {
      throw new NotFoundException('Playbook 不存在');
    }

    // 如果内容有变化，创建新版本
    if (updatePlaybookDto.content && updatePlaybookDto.content !== playbook.content) {
      try {
        yaml.load(updatePlaybookDto.content);
      } catch (error) {
        throw new BadRequestException('Playbook YAML 语法错误: ' + error.message);
      }

      const newVersion = playbook.version + 1;
      
      await this.prisma.playbookVersion.create({
        data: {
          playbookId: id,
          version: newVersion,
          content: updatePlaybookDto.content,
          changelog: updatePlaybookDto.changelog || `版本 ${newVersion}`,
        },
      });

      (updatePlaybookDto as any).version = newVersion;
    }

    return this.prisma.playbook.update({
      where: { id },
      data: updatePlaybookDto,
    });
  }

  async remove(id: string) {
    await this.prisma.playbook.delete({ where: { id } });
    return { message: 'Playbook 删除成功' };
  }

  async execute(id: string, executePlaybookDto: ExecutePlaybookDto, userId: string) {
    const playbook = await this.prisma.playbook.findUnique({ where: { id } });
    if (!playbook) {
      throw new NotFoundException('Playbook 不存在');
    }

    // 获取目标主机
    const hosts = await this.prisma.host.findMany({
      where: {
        id: { in: executePlaybookDto.hostIds },
        projectId: playbook.projectId,
      },
      include: { credential: true },
    });

    if (hosts.length === 0) {
      throw new NotFoundException('未找到有效的主机');
    }

    // 创建任务记录
    const task = await this.prisma.task.create({
      data: {
        type: 'PLAYBOOK',
        name: `执行 Playbook: ${playbook.name}`,
        playbookId: id,
        status: 'PENDING',
        hostIds: executePlaybookDto.hostIds,
        createdBy: userId,
        projectId: playbook.projectId,
      },
    });

    // 添加到队列异步执行
    await this.queueService.addPlaybookJob({
      taskId: task.id,
      projectId: playbook.projectId,
      playbookId: id,
      hostIds: executePlaybookDto.hostIds,
      variables: executePlaybookDto.variables,
      userId,
    });

    return {
      taskId: task.id,
      message: 'Playbook 已添加到执行队列',
    };
  }

  async validate(id: string) {
    const playbook = await this.prisma.playbook.findUnique({ where: { id } });
    if (!playbook) {
      throw new NotFoundException('Playbook 不存在');
    }

    try {
      const parsed = yaml.load(playbook.content);
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
}