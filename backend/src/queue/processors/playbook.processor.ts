import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { AnsibleService } from '../../ansible/ansible.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { PlaybookJobData } from '../queue.service';

@Processor('playbook-execution')
export class PlaybookProcessor {
  private readonly logger = new Logger(PlaybookProcessor.name);

  constructor(
    private prisma: PrismaService,
    private ansibleService: AnsibleService,
    private encryptionService: EncryptionService,
  ) {}

  @Process('execute-playbook')
  async handlePlaybookExecution(job: Job<PlaybookJobData>) {
    const { taskId, projectId, playbookId, hostIds, variables = {}, userId, scheduledTaskId } = job.data;
    
    this.logger.log(`开始执行 Playbook 任务: ${taskId || 'scheduled'}`);

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

      // 获取 Playbook 信息
      const playbook = await this.prisma.playbook.findUnique({
        where: { id: playbookId },
      });

      if (!playbook) {
        throw new Error('Playbook 不存在');
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

      // 记录开始执行的输出（只有当有 taskId 时）
      if (taskId) {
        this.logger.log(`开始执行 Playbook: ${playbook.name}, 目标主机: ${decryptedHosts.map(h => h.name).join(', ')}`);
      }

      // 执行 Playbook
      const result = await this.ansibleService.playbook(decryptedHosts, playbook.content, variables);

      // 更新进度
      await job.progress(80);

      // 计算执行结果统计
      const stats = {
        total: decryptedHosts.length,
        success: 0,
        failed: 0,
        changed: 0,
        skipped: 0,
      };

      let output = `Playbook: ${playbook.name}\n`;
      output += `变量: ${JSON.stringify(variables, null, 2)}\n\n`;

      for (const [hostId, hostResult] of Object.entries(result.results)) {
        const host = decryptedHosts.find(h => h.id === hostId);
        const result_typed = hostResult as any;
        
        if (result_typed.success) {
          stats.success++;
          
          // 解析 Ansible 执行结果
          const playbookResult = result_typed.data;
          if (playbookResult?.stats) {
            stats.changed += playbookResult.stats.changed || 0;
            stats.skipped += playbookResult.stats.skipped || 0;
          }

          output += `[${host?.name || hostId}] ✅ 执行成功\n`;
          if (playbookResult?.plays) {
            for (const play of playbookResult.plays) {
              output += `  Play: ${play.play?.name || 'Unnamed'}\n`;
              for (const task of play.tasks || []) {
                const taskName = task.task?.name || 'Unnamed Task';
                const taskResult = task.hosts?.[host?.name || hostId];
                if (taskResult) {
                  const status = taskResult.changed ? '🔄' : taskResult.skipped ? '⏭️' : '✅';
                  output += `    ${status} ${taskName}\n`;
                }
              }
            }
          }
          output += '\n';
        } else {
          stats.failed++;
          output += `[${host?.name || hostId}] ❌ 执行失败\n${result_typed.error || ''}\n\n`;
        }

        // 记录实时输出（只有当有 taskId 时）
        if (taskId) {
          this.logger.log(`[${host?.name || hostId}] ${result_typed.success ? '✅ 执行成功' : '❌ 执行失败'}`);
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
              summary: `Playbook 执行完成: 成功 ${stats.success}/${stats.total}, 变更 ${stats.changed}, 跳过 ${stats.skipped}`,
              playbook: {
                id: playbook.id,
                name: playbook.name,
                version: playbook.version,
              },
              variables,
            },
            output,
          },
        });
      } else if (scheduledTaskId) {
        // 如果是定时任务，创建执行记录
        await this.prisma.task.create({
          data: {
            name: `定时任务执行: ${playbook.name}`,
            type: 'PLAYBOOK',
            playbookId,
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
              summary: `Playbook 执行完成: 成功 ${stats.success}/${stats.total}, 变更 ${stats.changed}, 跳过 ${stats.skipped}`,
              playbook: {
                id: playbook.id,
                name: playbook.name,
                version: playbook.version,
              },
              variables,
            },
            output,
          },
        });
      }

      // 更新进度为完成
      await job.progress(100);

      this.logger.log(`Playbook 任务执行完成: ${taskId || 'scheduled'}, 状态: ${finalStatus}`);

      return {
        taskId,
        status: finalStatus,
        stats,
        duration,
      };

    } catch (error) {
      this.logger.error(`Playbook 任务执行失败: ${taskId || 'scheduled'}`, error.stack);

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
            output: `Playbook 执行失败: ${error.message}`,
          },
        });
      } else if (scheduledTaskId) {
        // 如果是定时任务，创建失败记录
        const playbook = await this.prisma.playbook.findUnique({
          where: { id: playbookId },
        });

        await this.prisma.task.create({
          data: {
            name: `定时任务执行: ${playbook?.name || 'Unknown'}`,
            type: 'PLAYBOOK',
            playbookId,
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
            output: `Playbook 执行失败: ${error.message}`,
          },
        });
      }

      throw error;
    }
  }
}