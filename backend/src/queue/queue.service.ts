import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnsibleService } from '../ansible/ansible.service';
import { EncryptionService } from '../common/services/encryption.service';

export interface CommandJobData {
  taskId: string | null;
  projectId: string;
  command: string;
  hostIds: string[];
  userId: string;
  timeout?: number;
  scheduledTaskId?: string;
}

export interface PlaybookJobData {
  taskId: string | null;
  projectId: string;
  playbookId: string;
  hostIds: string[];
  variables?: Record<string, any>;
  userId: string;
  scheduledTaskId?: string;
}

@Injectable()
export class SimpleQueueService {
  private readonly logger = new Logger(SimpleQueueService.name);

  constructor(
    private prisma: PrismaService,
    private ansibleService: AnsibleService,
    private encryptionService: EncryptionService,
  ) {
    this.logger.log('SimpleQueueService initialized');
  }

  async addPlaybookJob(data: PlaybookJobData): Promise<any> {
    // 直接执行 playbook，不使用队列
    return this.executePlaybookDirectly(data);
  }

  async executePlaybookDirectly(data: PlaybookJobData): Promise<any> {
    const { taskId, projectId, playbookId, hostIds, variables, userId } = data;
    
    this.logger.log(`开始执行 Playbook 任务: ${taskId}`);
    
    const startTime = new Date();

    try {
      // 更新任务状态（只有当有 taskId 时）
      if (taskId) {
        await this.prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'RUNNING',
            startTime,
          },
        });
      }

      // 获取 Playbook 内容
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

      // 执行 Playbook
      const result = await this.ansibleService.playbook(decryptedHosts, playbook.content, variables);

      // 计算执行结果
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const finalStatus = result.success ? 'SUCCESS' : 'FAILED';

      // 更新任务状态（只有当有 taskId 时）
      if (taskId) {
        await this.prisma.task.update({
          where: { id: taskId },
          data: {
            status: finalStatus,
            endTime,
            duration,
            result: {
              success: result.success,
            },
            output: result.output || 'Playbook 执行完成',
          },
        });
      }

      this.logger.log(`Playbook 任务执行完成: ${taskId}, 状态: ${finalStatus}`);

      return {
        taskId,
        status: finalStatus,
        duration,
      };

    } catch (error) {
      this.logger.error(`Playbook 任务执行失败: ${taskId}`, error.stack);

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
      }

      return {
        taskId,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  async executeCommandDirectly(data: CommandJobData): Promise<any> {
    const { taskId, projectId, command, hostIds, userId, timeout = 300, scheduledTaskId } = data;
    
    this.logger.log(`开始执行命令任务: ${taskId || 'scheduled'}, 命令: ${command}`);
    
    const startTime = new Date();

    try {
      // 只有当有 taskId 时才更新任务状态
      if (taskId) {
        await this.prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'RUNNING',
            startTime,
          },
        });
        this.logger.log(`任务 ${taskId} 状态更新为 RUNNING`);
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

      this.logger.log(`找到 ${hosts.length} 台主机`);

      // 解密主机密码
      const decryptedHosts = hosts.map(host => {
        const decryptedHost = { ...host };
        if (host.password) {
          decryptedHost.password = this.encryptionService.decrypt(host.password);
        }
        return decryptedHost;
      });

      this.logger.log(`开始执行 Ansible 命令: ${command}`);
      // 执行命令
      const result = await this.ansibleService.shell(decryptedHosts, command, timeout);
      this.logger.log(`Ansible 命令执行完成，结果:`, JSON.stringify(result, null, 2));

      // 计算执行结果统计
      const stats = {
        total: decryptedHosts.length,
        success: 0,
        failed: 0,
      };

      let output = `命令执行开始: ${command}\n`;
      output += `目标主机: ${decryptedHosts.map(h => `${h.name}(${h.ip})`).join(', ')}\n`;
      output += `执行时间: ${new Date().toLocaleString()}\n\n`;
      
      this.logger.log(`处理 ${Object.keys(result.results).length} 个主机的结果`);
      
      for (const [hostId, hostResult] of Object.entries(result.results)) {
        const host = decryptedHosts.find(h => h.id === hostId);
        const result_typed = hostResult as any;
        
        this.logger.log(`处理主机 ${hostId} (${host?.name}) 的结果:`, result_typed);
        
        if (result_typed.success) {
          stats.success++;
          output += `[${host?.name || hostId}] ✅ 执行成功\n`;
          if (result_typed.data?.stdout) {
            output += `输出:\n${result_typed.data.stdout}\n`;
          }
          output += '\n';
        } else {
          stats.failed++;
          output += `[${host?.name || hostId}] ❌ 执行失败\n`;
          output += `错误: ${result_typed.error || '未知错误'}\n\n`;
        }
      }

      output += `\n执行完成: 成功 ${stats.success}/${stats.total} 台主机\n`;
      output += `总耗时: ${Math.round((new Date().getTime() - startTime.getTime()) / 1000)}秒`;

      // 计算任务持续时间
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
      }

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
      }

      // 不要重新抛出错误，让调用者知道任务已经处理完成
      return {
        taskId,
        status: 'FAILED',
        error: error.message,
      };
    }
  }
}