import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { AnsibleService } from '../../ansible/ansible.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { CommandJobData } from '../queue.service';

@Processor('command-execution')
export class CommandProcessor {
  private readonly logger = new Logger(CommandProcessor.name);

  constructor(
    private prisma: PrismaService,
    private ansibleService: AnsibleService,
    private encryptionService: EncryptionService,
  ) {
    this.logger.log('CommandProcessor initialized');
  }

  @Process('execute-command')
  async handleCommandExecution(job: Job<CommandJobData>) {
    const { taskId, projectId, command, hostIds, userId, timeout = 300, scheduledTaskId } = job.data;
    
    this.logger.log(`开始执行命令任务: ${taskId || 'scheduled'}`);

    try {
      // 只有当有 taskId 时才更新任务状态
      if (taskId) {
        await this.prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'RUNNING',
            startTime: new Date(),
          },
        });
      }

      // 获取主机信息
      const hosts = await this.prisma.host.findMany({
        where: {
          id: { in: hostIds },
          projectId,
        },
        include: { credential: true },
      });

      if (hosts.length === 0) {
        throw new Error('未找到有效的主机');
      }

      // 解密主机密码
      const decryptedHosts = hosts.map(host => {
        const decryptedHost = { ...host };
        if (host.password) {
          decryptedHost.password = this.encryptionService.decrypt(host.password);
        }
        return decryptedHost;
      });

      // 更新进度
      await job.progress(10);

      // 执行命令
      const result = await this.ansibleService.shell(decryptedHosts, command, timeout);

      // 更新进度
      await job.progress(80);

      // 计算执行结果统计
      const stats = {
        total: decryptedHosts.length,
        success: 0,
        failed: 0,
      };

      let output = '';
      for (const [hostId, hostResult] of Object.entries(result.results)) {
        const host = decryptedHosts.find(h => h.id === hostId);
        const result_typed = hostResult as any;
        if (result_typed.success) {
          stats.success++;
          output += `[${host?.name || hostId}] ✅ 执行成功\n${result_typed.data?.stdout || ''}\n\n`;
        } else {
          stats.failed++;
          output += `[${host?.name || hostId}] ❌ 执行失败\n${result_typed.error || ''}\n\n`;
        }
      }

      // 更新进度
      await job.progress(90);

      // 计算任务持续时间
      const startTime = new Date(job.processedOn || Date.now());
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      // 更新任务状态为完成（只有当有 taskId 时）
      const finalStatus = stats.failed > 0 ? 'FAILED' : 'SUCCESS';
      if (taskId) {
        await this.prisma.task.update({
          where: { id: taskId },
          data: {
            status: finalStatus,
            endTime,
            duration,
            result: {
              stats,
              summary: `执行完成: 成功 ${stats.success}/${stats.total}`,
            },
            output,
          },
        });
      } else if (scheduledTaskId) {
        // 如果是定时任务，创建执行记录
        await this.prisma.task.create({
          data: {
            name: `定时任务执行: ${command.substring(0, 50)}...`,
            type: 'COMMAND',
            command,
            hostIds,
            projectId,
            createdBy: userId,
            scheduledTaskId,
            status: finalStatus,
            startTime: startTime,
            endTime,
            duration,
            result: {
              stats,
              summary: `执行完成: 成功 ${stats.success}/${stats.total}`,
            },
            output,
          },
        });
      }

      // 更新进度为完成
      await job.progress(100);

      this.logger.log(`命令任务执行完成: ${taskId || 'scheduled'}, 状态: ${finalStatus}`);

      return {
        taskId,
        status: finalStatus,
        stats,
        duration,
      };

    } catch (error) {
      this.logger.error(`命令任务执行失败: ${taskId || 'scheduled'}`, error.stack);

      // 更新任务状态为失败（只有当有 taskId 时）
      if (taskId) {
        await this.prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'FAILED',
            endTime: new Date(),
            result: {
              error: error.message,
            },
            output: `执行失败: ${error.message}`,
          },
        });
      } else if (scheduledTaskId) {
        // 如果是定时任务，创建失败记录
        await this.prisma.task.create({
          data: {
            name: `定时任务执行: ${command.substring(0, 50)}...`,
            type: 'COMMAND',
            command,
            hostIds,
            projectId,
            createdBy: userId,
            scheduledTaskId,
            status: 'FAILED',
            startTime: new Date(job.processedOn || Date.now()),
            endTime: new Date(),
            result: {
              error: error.message,
            },
            output: `执行失败: ${error.message}`,
          },
        });
      }

      throw error;
    }
  }
}