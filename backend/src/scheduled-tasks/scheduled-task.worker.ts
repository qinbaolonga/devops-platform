import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SimpleQueueService } from '../queue/queue.service';
import * as cronParser from 'cron-parser';

@Injectable()
export class ScheduledTaskWorker {
  private readonly logger = new Logger(ScheduledTaskWorker.name);

  constructor(
    private prisma: PrismaService,
    private queueService: SimpleQueueService,
  ) {
    this.logger.log('ScheduledTaskWorker 已初始化，定时任务调度器已启动');
  }

  // 计算下次执行时间
  private calculateNextExecuteAt(cronExpression: string): Date | null {
    try {
      const interval = cronParser.parseExpression(cronExpression);
      return interval.next().toDate();
    } catch (error) {
      return null;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledTasks() {
    try {
      const now = new Date();
      this.logger.log(`[定时任务调度器] 开始检查待执行的定时任务... 当前时间: ${now.toISOString()}`);

      // 查找所有启用的定时任务
      const scheduledTasks = await this.prisma.scheduledTask.findMany({
        where: {
          enabled: true,
        },
      });

      this.logger.log(`[定时任务调度器] 找到 ${scheduledTasks.length} 个启用的定时任务`);

      for (const task of scheduledTasks) {
        try {
          this.logger.debug(`[定时任务调度器] 检查任务: ${task.name}, cron: ${task.cronExpression}, lastExecutedAt: ${task.lastExecutedAt}`);
          
          // 检查任务是否需要执行
          if (this.shouldExecuteTask(task, now)) {
            this.logger.log(`[定时任务调度器] 任务 ${task.name} 需要执行`);
            await this.executeTask(task);
            
            // 计算下次执行时间
            const nextExecuteAt = this.calculateNextExecuteAt(task.cronExpression);
            
            // 更新最后执行时间和下次执行时间
            await this.prisma.scheduledTask.update({
              where: { id: task.id },
              data: { 
                lastExecutedAt: now,
                nextExecuteAt,
              },
            });
            this.logger.log(`[定时任务调度器] 任务 ${task.name} 执行完成，已更新执行时间`);
          } else {
            this.logger.debug(`[定时任务调度器] 任务 ${task.name} 不需要执行`);
          }
        } catch (error) {
          this.logger.error(`[定时任务调度器] 执行定时任务失败: ${task.name}`, error);
        }
      }
      
      this.logger.log(`[定时任务调度器] 定时任务检查完成`);
    } catch (error) {
      this.logger.error('[定时任务调度器] 处理定时任务时发生错误:', error);
    }
  }

  private shouldExecuteTask(task: any, now: Date): boolean {
    // 如果从未执行过，则需要执行
    if (!task.lastExecutedAt) {
      return true;
    }

    // 简单的时间间隔检查（这里可以根据 cron 表达式进行更精确的计算）
    const lastExecution = new Date(task.lastExecutedAt);
    const timeDiff = now.getTime() - lastExecution.getTime();
    
    // 根据 cron 表达式判断是否应该执行
    // 这里简化处理，实际应该解析 cron 表达式
    return this.parseCronExpression(task.cronExpression, lastExecution, now);
  }

  private parseCronExpression(cronExpr: string, lastExecution: Date, now: Date): boolean {
    // 简化的 cron 解析逻辑
    
    const parts = cronExpr.split(' ');
    if (parts.length !== 5) {
      return false;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // 检查是否已经在这个时间点执行过（防止重复执行）
    if (lastExecution) {
      const lastMinute = lastExecution.getMinutes();
      const lastHour = lastExecution.getHours();
      const lastDay = lastExecution.getDate();
      const currentMinute = now.getMinutes();
      const currentHour = now.getHours();
      const currentDay = now.getDate();

      // 如果在同一分钟内已经执行过，则不再执行
      if (lastDay === currentDay && lastHour === currentHour && lastMinute === currentMinute) {
        return false;
      }
    }

    // 检查分钟
    if (!this.matchCronField(minute, now.getMinutes())) {
      return false;
    }

    // 检查小时
    if (!this.matchCronField(hour, now.getHours())) {
      return false;
    }

    // 检查日期
    if (!this.matchCronField(dayOfMonth, now.getDate())) {
      return false;
    }

    // 检查月份 (cron 月份是 1-12)
    if (!this.matchCronField(month, now.getMonth() + 1)) {
      return false;
    }

    // 检查星期 (cron 星期是 0-6，0 是周日)
    if (!this.matchCronField(dayOfWeek, now.getDay())) {
      return false;
    }

    return true;
  }

  private matchCronField(field: string, value: number): boolean {
    // 通配符，匹配所有
    if (field === '*') {
      return true;
    }

    // 处理 */N 格式（每 N 个单位）
    if (field.startsWith('*/')) {
      const interval = parseInt(field.slice(2));
      if (!isNaN(interval) && interval > 0) {
        return value % interval === 0;
      }
      return false;
    }

    // 处理逗号分隔的多个值
    if (field.includes(',')) {
      const values = field.split(',').map(v => parseInt(v.trim()));
      return values.includes(value);
    }

    // 处理范围 N-M
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(v => parseInt(v.trim()));
      return value >= start && value <= end;
    }

    // 单个数值
    const targetValue = parseInt(field);
    return !isNaN(targetValue) && value === targetValue;
  }

  private async executeTask(task: any) {
    this.logger.log(`执行定时任务: ${task.name}`);

    try {
      if (task.type === 'COMMAND') {
        // 创建任务记录
        const newTask = await this.prisma.task.create({
          data: {
            name: `[定时] ${task.name}`,
            type: 'COMMAND',
            command: task.command,
            hostIds: Array.isArray(task.hostIds) ? task.hostIds : [],
            status: 'PENDING',
            projectId: task.projectId,
            createdBy: task.createdBy,
            scheduledTaskId: task.id,
          },
        });

        this.logger.log(`创建任务记录: ${newTask.id}`);

        // 执行命令
        await this.queueService.executeCommandDirectly({
          taskId: newTask.id,
          projectId: task.projectId,
          command: task.command,
          hostIds: Array.isArray(task.hostIds) ? task.hostIds : [],
          userId: task.createdBy,
          scheduledTaskId: task.id,
        });
      } else if (task.type === 'PLAYBOOK') {
        // 创建任务记录
        const newTask = await this.prisma.task.create({
          data: {
            name: `[定时] ${task.name}`,
            type: 'PLAYBOOK',
            playbookId: task.playbookId,
            hostIds: Array.isArray(task.hostIds) ? task.hostIds : [],
            status: 'PENDING',
            projectId: task.projectId,
            createdBy: task.createdBy,
            scheduledTaskId: task.id,
          },
        });

        this.logger.log(`创建 Playbook 任务记录: ${newTask.id}`);

        // 执行 Playbook
        await this.queueService.executePlaybookDirectly({
          taskId: newTask.id,
          projectId: task.projectId,
          playbookId: task.playbookId,
          hostIds: Array.isArray(task.hostIds) ? task.hostIds : [],
          variables: task.variables || {},
          userId: task.createdBy,
          scheduledTaskId: task.id,
        });
      }

      this.logger.log(`定时任务已执行: ${task.name}`);
    } catch (error) {
      this.logger.error(`执行定时任务失败: ${task.name}`, error);
      throw error;
    }
  }

  // 手动触发定时任务检查（用于测试）
  async triggerScheduledTaskCheck() {
    this.logger.log('手动触发定时任务检查');
    await this.processScheduledTasks();
  }
}