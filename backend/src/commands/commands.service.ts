import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnsibleService } from '../ansible/ansible.service';
import { SimpleQueueService } from '../queue/queue.service';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class CommandsService {
  constructor(
    private prisma: PrismaService,
    private ansibleService: AnsibleService,
    private queueService: SimpleQueueService,
  ) {}

  async execute(projectId: string, executeCommandDto: ExecuteCommandDto, userId: string) {
    // 获取目标主机
    const hosts = await this.prisma.host.findMany({
      where: {
        id: { in: executeCommandDto.hostIds },
        projectId,
      },
      include: { credential: true },
    });

    if (hosts.length === 0) {
      throw new NotFoundException('未找到有效的主机');
    }

    // 创建任务记录
    const task = await this.prisma.task.create({
      data: {
        type: 'COMMAND',
        name: `执行命令: ${executeCommandDto.command}`,
        command: executeCommandDto.command,
        status: 'PENDING',
        hostIds: executeCommandDto.hostIds,
        createdBy: userId,
        projectId,
      },
    });

    // 直接执行命令（不使用队列）
    setImmediate(async () => {
      try {
        await this.queueService.executeCommandDirectly({
          taskId: task.id,
          projectId,
          command: executeCommandDto.command,
          hostIds: executeCommandDto.hostIds,
          userId,
          timeout: executeCommandDto.timeout,
        });
      } catch (error) {
        console.error('Command execution failed:', error);
        // 错误已经在executeCommandDirectly中处理了，这里只记录日志
      }
    });

    return {
      taskId: task.id,
      message: '命令已添加到执行队列',
    };
  }

  async getHistory(projectId: string, pagination: PaginationDto) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId, type: 'COMMAND' },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true } } },
      }),
      this.prisma.task.count({ where: { projectId, type: 'COMMAND' } }),
    ]);

    return new PaginatedResponseDto(tasks, total, page, pageSize);
  }

  async getTask(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    return task;
  }
}