import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async findAll(projectId: string, pagination: PaginationDto, filters?: any) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: any = { projectId };

    // 添加过滤条件
    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.hostIds && filters.hostIds.length > 0) {
      where.hostIds = {
        hasSome: filters.hostIds,
      };
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true } } },
      }),
      this.prisma.task.count({ where }),
    ]);

    // 获取所有任务涉及的主机ID
    const allHostIds = new Set<string>();
    tasks.forEach(task => {
      const hostIds = task.hostIds as string[] | null;
      if (Array.isArray(hostIds)) {
        hostIds.forEach(id => allHostIds.add(id));
      }
    });

    // 查询主机名称
    const hosts = await this.prisma.host.findMany({
      where: { id: { in: Array.from(allHostIds) } },
      select: { id: true, name: true, ip: true },
    });
    const hostMap = new Map(hosts.map(h => [h.id, h]));

    // 为每个任务添加 targetHosts 字段
    const tasksWithHosts = tasks.map(task => {
      const hostIds = task.hostIds as string[] | null;
      return {
        ...task,
        targetHosts: Array.isArray(hostIds) 
          ? hostIds.map(id => {
              const host = hostMap.get(id);
              return host ? `${host.name}(${host.ip})` : id;
            })
          : [],
      };
    });

    return new PaginatedResponseDto(tasksWithHosts, total, page, pageSize);
  }

  async findOne(id: string, projectId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, projectId },
      include: { user: { select: { username: true } } },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    // 简化版本：直接返回任务状态
    return task;
  }

  async getLogs(id: string, projectId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, projectId },
      include: { user: { select: { username: true } } },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    // 返回完整的任务信息，包括状态、输出等
    return {
      taskId: task.id,
      name: task.name,
      status: task.status,
      output: task.output || '暂无日志',
      result: task.result,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.duration,
      createdAt: task.createdAt,
      command: task.command,
      hostIds: task.hostIds,
      user: task.user,
    };
  }

  async cancel(id: string, projectId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, projectId },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (task.status !== 'PENDING' && task.status !== 'RUNNING') {
      throw new Error('只能取消待执行或正在执行的任务');
    }

    // 简化版本：直接更新数据库状态
    await this.prisma.task.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        endTime: new Date(),
      },
    });

    return { message: '任务已取消' };
  }

  async remove(id: string, projectId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, projectId },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (task.status === 'RUNNING') {
      throw new Error('不能删除正在执行的任务');
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return { message: '任务已删除' };
  }

  async batchRemove(ids: string[], projectId: string) {
    if (!ids || ids.length === 0) {
      throw new Error('请选择要删除的任务');
    }

    // 检查是否有正在运行的任务
    const runningTasks = await this.prisma.task.findMany({
      where: {
        id: { in: ids },
        projectId,
        status: 'RUNNING',
      },
    });

    if (runningTasks.length > 0) {
      throw new Error(`有 ${runningTasks.length} 个任务正在执行中，无法删除`);
    }

    // 批量删除
    const result = await this.prisma.task.deleteMany({
      where: {
        id: { in: ids },
        projectId,
        status: { not: 'RUNNING' },
      },
    });

    return { message: `成功删除 ${result.count} 个任务` };
  }

  async getStatistics(projectId: string, days?: number) {
    const [totalTasks, tasksByStatus, tasksByType, recentTasks] = await Promise.all([
      this.prisma.task.count({ where: { projectId } }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['type'],
        where: { projectId },
        _count: { id: true },
      }),
      this.prisma.task.findMany({
        where: { 
          projectId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
          },
        },
        select: {
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 按天统计任务数量
    const tasksByDay = recentTasks.reduce((acc, task) => {
      const day = task.createdAt.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { date: day, count: 0, success: 0, failed: 0 };
      }
      acc[day].count++;
      if (task.status === 'SUCCESS') acc[day].success++;
      if (task.status === 'FAILED') acc[day].failed++;
      return acc;
    }, {} as Record<string, any>);

    // 转换 byStatus 为前端期望的格式
    const statusMap: Record<string, number> = {};
    tasksByStatus.forEach(item => {
      statusMap[item.status] = item._count.id;
    });

    return {
      total: totalTasks,
      pending: statusMap['PENDING'] || 0,
      running: statusMap['RUNNING'] || 0,
      completed: (statusMap['SUCCESS'] || 0) + (statusMap['COMPLETED'] || 0),
      failed: statusMap['FAILED'] || 0,
      cancelled: statusMap['CANCELLED'] || 0,
      byStatus: tasksByStatus.map(item => ({
        status: item.status,
        count: item._count.id,
      })),
      byType: tasksByType.map(item => ({
        type: item.type,
        count: item._count.id,
      })),
      byDay: Object.values(tasksByDay),
    };
  }

  async retry(id: string, projectId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, projectId },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (task.status !== 'FAILED') {
      throw new Error('只能重试失败的任务');
    }

    // 重置任务状态
    await this.prisma.task.update({
      where: { id },
      data: {
        status: 'PENDING',
        startTime: null,
        endTime: null,
        duration: null,
        output: null,
        result: null as any,
      },
    });

    // 简化版本：暂时不支持重试，只更新状态
    return { message: '任务状态已重置为待执行' };
  }
}