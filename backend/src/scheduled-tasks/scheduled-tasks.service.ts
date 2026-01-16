import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import * as cron from 'node-cron';
import * as cronParser from 'cron-parser';

@Injectable()
export class ScheduledTasksService {
  constructor(
    private prisma: PrismaService,
  ) {}

  // 计算下次执行时间
  private calculateNextExecuteAt(cronExpression: string): Date | null {
    try {
      const interval = cronParser.parseExpression(cronExpression);
      return interval.next().toDate();
    } catch (error) {
      return null;
    }
  }

  async create(projectId: string, createDto: CreateScheduledTaskDto, userId: string) {
    // 验证 Cron 表达式
    if (!cron.validate(createDto.cronExpression)) {
      throw new BadRequestException('无效的 Cron 表达式');
    }

    // 转换 type 为大写
    const taskType = createDto.type.toUpperCase() as 'COMMAND' | 'PLAYBOOK';

    // 验证任务配置
    if (taskType === 'COMMAND' && !createDto.command) {
      throw new BadRequestException('命令类型任务必须提供命令内容');
    }

    if (taskType === 'PLAYBOOK' && !createDto.playbookId) {
      throw new BadRequestException('Playbook 类型任务必须提供 Playbook ID');
    }

    // 验证主机是否存在且属于该项目
    const hosts = await this.prisma.host.findMany({
      where: {
        id: { in: createDto.hostIds },
        projectId,
      },
    });

    if (hosts.length !== createDto.hostIds.length) {
      throw new BadRequestException('部分主机不存在或不属于该项目');
    }

    // 如果是 Playbook 类型，验证 Playbook 是否存在
    if (taskType === 'PLAYBOOK') {
      const playbook = await this.prisma.playbook.findFirst({
        where: {
          id: createDto.playbookId,
          projectId,
        },
      });

      if (!playbook) {
        throw new BadRequestException('Playbook 不存在或不属于该项目');
      }
    }

    // 计算下次执行时间
    const nextExecuteAt = createDto.enabled !== false ? this.calculateNextExecuteAt(createDto.cronExpression) : null;

    const scheduledTask = await this.prisma.scheduledTask.create({
      data: {
        ...createDto,
        type: taskType,
        projectId,
        createdBy: userId,
        hostIds: createDto.hostIds,
        variables: createDto.variables || {},
        nextExecuteAt,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return scheduledTask;
  }

  async findAll(projectId: string, pagination: PaginationDto) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const [tasks, total] = await Promise.all([
      this.prisma.scheduledTask.findMany({
        where: { projectId },
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.scheduledTask.count({ where: { projectId } }),
    ]);

    return new PaginatedResponseDto(tasks, total, page, pageSize);
  }

  async findOne(id: string, projectId: string) {
    const task = await this.prisma.scheduledTask.findFirst({
      where: { id, projectId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('定时任务不存在');
    }

    return task;
  }

  async update(id: string, projectId: string, updateDto: UpdateScheduledTaskDto) {
    const existingTask = await this.findOne(id, projectId);

    // 如果更新了 Cron 表达式，验证其有效性
    if (updateDto.cronExpression && !cron.validate(updateDto.cronExpression)) {
      throw new BadRequestException('无效的 Cron 表达式');
    }

    // 转换 type 为大写
    const taskType = updateDto.type ? updateDto.type.toUpperCase() as 'COMMAND' | 'PLAYBOOK' : existingTask.type;

    // 验证任务配置
    if (taskType === 'COMMAND' && updateDto.command === undefined && !existingTask.command) {
      throw new BadRequestException('命令类型任务必须提供命令内容');
    }

    if (taskType === 'PLAYBOOK' && updateDto.playbookId === undefined && !existingTask.playbookId) {
      throw new BadRequestException('Playbook 类型任务必须提供 Playbook ID');
    }

    // 验证主机
    if (updateDto.hostIds) {
      const hosts = await this.prisma.host.findMany({
        where: {
          id: { in: updateDto.hostIds },
          projectId,
        },
      });

      if (hosts.length !== updateDto.hostIds.length) {
        throw new BadRequestException('部分主机不存在或不属于该项目');
      }
    }

    // 如果是 Playbook 类型，验证 Playbook 是否存在
    if (updateDto.playbookId) {
      const playbook = await this.prisma.playbook.findFirst({
        where: {
          id: updateDto.playbookId,
          projectId,
        },
      });

      if (!playbook) {
        throw new BadRequestException('Playbook 不存在或不属于该项目');
      }
    }

    // 构建更新数据
    const updateData: any = {
      ...updateDto,
      hostIds: updateDto.hostIds || (existingTask.hostIds as any),
      variables: updateDto.variables !== undefined ? updateDto.variables : (existingTask as any).variables,
    };
    
    // 如果有 type，转换为大写
    if (updateDto.type) {
      updateData.type = taskType;
    }

    // 如果更新了 cron 表达式或启用状态，重新计算下次执行时间
    const cronExpr = updateDto.cronExpression || existingTask.cronExpression;
    const isEnabled = updateDto.enabled !== undefined ? updateDto.enabled : existingTask.enabled;
    if (isEnabled) {
      updateData.nextExecuteAt = this.calculateNextExecuteAt(cronExpr);
    } else {
      updateData.nextExecuteAt = null;
    }

    const updatedTask = await this.prisma.scheduledTask.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return updatedTask;
  }

  async remove(id: string, projectId: string) {
    const task = await this.findOne(id, projectId);

    await this.prisma.scheduledTask.delete({ where: { id } });

    return { message: '定时任务已删除' };
  }

  async enable(id: string, projectId: string) {
    const task = await this.findOne(id, projectId);

    if (task.enabled) {
      throw new BadRequestException('任务已经是启用状态');
    }

    // 计算下次执行时间
    const nextExecuteAt = this.calculateNextExecuteAt(task.cronExpression);

    const updatedTask = await this.prisma.scheduledTask.update({
      where: { id },
      data: {
        enabled: true,
        nextExecuteAt,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return updatedTask;
  }

  async disable(id: string, projectId: string) {
    const task = await this.findOne(id, projectId);

    if (!task.enabled) {
      throw new BadRequestException('任务已经是禁用状态');
    }

    const updatedTask = await this.prisma.scheduledTask.update({
      where: { id },
      data: {
        enabled: false,
        nextExecuteAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return updatedTask;
  }

  async getExecutionHistory(id: string, projectId: string, pagination: PaginationDto) {
    const task = await this.findOne(id, projectId);

    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const skip = (page - 1) * pageSize;

    // 查询由该定时任务触发的执行记录
    const [executions, total] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          projectId,
          scheduledTaskId: id,
        },
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({
        where: {
          projectId,
          scheduledTaskId: id,
        },
      }),
    ]);

    return new PaginatedResponseDto(executions, total, page, pageSize);
  }
}