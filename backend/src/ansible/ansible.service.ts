import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

@Injectable()
export class AnsibleService {
  private readonly logger = new Logger(AnsibleService.name);
  private readonly tempDir = '/tmp/ansible-devops';

  constructor() {
    // 确保临时目录存在
    try {
      mkdirSync(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.warn('Failed to create temp directory:', error.message);
    }
  }

  async ping(hosts: any[]): Promise<any> {
    const inventory = this.buildInventory(hosts);
    const inventoryFile = this.writeInventoryFile(inventory);

    try {
      const result = await this.runAnsibleModule(inventoryFile, 'ping');
      return this.parseResults(result, hosts);
    } finally {
      this.cleanupFile(inventoryFile);
    }
  }

  async setup(hosts: any[]): Promise<any> {
    const inventory = this.buildInventory(hosts);
    const inventoryFile = this.writeInventoryFile(inventory);

    try {
      const result = await this.runAnsibleModule(inventoryFile, 'setup');
      return this.parseSetupResults(result, hosts);
    } finally {
      this.cleanupFile(inventoryFile);
    }
  }

  async shell(hosts: any[], command: string, timeout?: number): Promise<any> {
    const inventory = this.buildInventory(hosts);
    const inventoryFile = this.writeInventoryFile(inventory);

    try {
      const result = await this.runAnsibleModule(inventoryFile, 'shell', { cmd: command }, timeout);
      return this.parseResults(result, hosts);
    } finally {
      this.cleanupFile(inventoryFile);
    }
  }

  async runPlaybook(hosts: any[], playbookContent: string, variables?: any): Promise<any> {
    const inventory = this.buildInventory(hosts);
    const inventoryFile = this.writeInventoryFile(inventory);
    const playbookFile = this.writePlaybookFile(playbookContent);

    try {
      const result = await this.runAnsiblePlaybook(inventoryFile, playbookFile, variables);
      return this.parsePlaybookResults(result, hosts);
    } finally {
      this.cleanupFile(inventoryFile);
      this.cleanupFile(playbookFile);
    }
  }

  // 别名方法，为了兼容处理器中的调用
  async playbook(hosts: any[], playbookContent: string, variables?: any): Promise<any> {
    return this.runPlaybook(hosts, playbookContent, variables);
  }

  private buildInventory(hosts: any[]): string {
    const inventory: any = {
      all: {
        hosts: {},
        vars: {
          ansible_ssh_common_args: '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null',
        },
      },
    };

    hosts.forEach(host => {
      const hostConfig: any = {
        ansible_host: host.ip,
        ansible_port: host.port || 22,
        ansible_user: host.username || 'root',
      };

      if (host.authType === 'PASSWORD' && host.password) {
        hostConfig.ansible_ssh_pass = host.password;
      } else if (host.authType === 'SSH_KEY' && host.credential?.privateKey) {
        // 写入私钥文件
        const keyFile = join(this.tempDir, `key_${host.id}`);
        writeFileSync(keyFile, host.credential.privateKey, { mode: 0o600 });
        hostConfig.ansible_ssh_private_key_file = keyFile;
        
        if (host.credential.passphrase) {
          hostConfig.ansible_ssh_pass = host.credential.passphrase;
        }
      }

      inventory.all.hosts[host.id] = hostConfig;
    });

    return yaml.dump(inventory);
  }

  private writeInventoryFile(inventory: string): string {
    const filename = join(this.tempDir, `inventory_${Date.now()}.yml`);
    writeFileSync(filename, inventory);
    return filename;
  }

  private writePlaybookFile(content: string): string {
    const filename = join(this.tempDir, `playbook_${Date.now()}.yml`);
    writeFileSync(filename, content);
    return filename;
  }

  private async runAnsibleModule(inventoryFile: string, module: string, args?: any, timeout?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = ['ansible', 'all', '-i', inventoryFile, '-m', module];
      
      if (args) {
        if (typeof args === 'object' && args.cmd) {
          command.push('-a', args.cmd);
        } else {
          command.push('-a', typeof args === 'string' ? args : Object.entries(args).map(([k, v]) => `${k}=${v}`).join(' '));
        }
      }

      command.push('--timeout=' + (timeout || 30), '-f', '10', '-v');
      
      // 添加SSH配置以跳过主机密钥检查
      command.push('-e', 'ansible_ssh_common_args="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"');

      this.logger.debug(`Running Ansible command: ${command.join(' ')}`);

      const process = spawn(command[0], command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        this.logger.debug(`Ansible command finished with code ${code}`);
        if (stdout) this.logger.debug(`Stdout: ${stdout.substring(0, 500)}...`);
        if (stderr) this.logger.debug(`Stderr: ${stderr.substring(0, 500)}...`);
        
        if (code === 0) {
          resolve(stdout);
        } else {
          const errorMsg = `Ansible failed with code ${code}. Stderr: ${stderr}. Stdout: ${stdout}`;
          this.logger.error(errorMsg);
          reject(new Error(errorMsg));
        }
      });

      process.on('error', (error) => {
        this.logger.error(`Ansible process error: ${error.message}`);
        reject(error);
      });
    });
  }

  private async runAnsiblePlaybook(inventoryFile: string, playbookFile: string, variables?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = ['ansible-playbook', '-i', inventoryFile, playbookFile];

      if (variables) {
        command.push('--extra-vars', JSON.stringify(variables));
      }
      
      // 添加SSH配置以跳过主机密钥检查
      command.push('-e', 'ansible_ssh_common_args="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"');

      const process = spawn(command[0], command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Ansible playbook failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseResults(output: string, hosts: any[]): any {
    const results: any = {};
    let success = true;

    hosts.forEach(host => {
      results[host.id] = {
        success: false,
        data: null,
        error: null,
      };
    });

    this.logger.debug('Ansible原始输出长度: ' + output.length);
    this.logger.debug('Ansible原始输出:\n' + output);
    this.logger.debug('主机列表: ' + hosts.map(h => h.id).join(', '));

    // 按主机分割输出 - Ansible输出格式: hostId | SUCCESS | rc=0 >>
    // 或者: hostId | CHANGED | rc=0 >>
    hosts.forEach(host => {
      const hostId = host.id;
      
      // 转义hostId中的特殊字符用于正则表达式
      const escapedHostId = hostId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 检查主机是否成功执行
      // 格式1: hostId | SUCCESS | rc=0 >> 输出内容
      // 格式2: hostId | CHANGED | rc=0 >> 输出内容
      const successPattern = new RegExp(
        `${escapedHostId}\\s*\\|\\s*(SUCCESS|CHANGED)\\s*\\|\\s*rc=(\\d+)\\s*>>([\\s\\S]*?)(?=${escapedHostId}\\s*\\||$|\\n[a-f0-9-]{36}\\s*\\|)`,
        'i'
      );
      
      let match = output.match(successPattern);
      
      if (match) {
        const status = match[1];
        const rc = parseInt(match[2]);
        const commandOutput = match[3].trim();
        
        results[host.id].success = true;
        results[host.id].data = {
          stdout: commandOutput || '(命令执行成功，无输出)',
          stderr: '',
          rc: rc
        };
        this.logger.debug(`主机 ${host.id} 解析成功 (${status}), rc=${rc}, 输出: ${commandOutput.substring(0, 100)}...`);
      } else {
        // 尝试更宽松的匹配 - 只匹配 >> 后面的内容
        const loosePattern = new RegExp(
          `${escapedHostId}[^>]*>>\\s*([\\s\\S]*?)(?=\\n[a-f0-9-]{36}\\s*\\||$)`,
          'i'
        );
        match = output.match(loosePattern);
        
        if (match) {
          const commandOutput = match[1].trim();
          results[host.id].success = true;
          results[host.id].data = {
            stdout: commandOutput || '(命令执行成功，无输出)',
            stderr: '',
            rc: 0
          };
          this.logger.debug(`主机 ${host.id} 宽松模式解析成功, 输出: ${commandOutput.substring(0, 100)}...`);
        } else {
          // 检查是否有FAILED或UNREACHABLE
          const failPattern = new RegExp(`${escapedHostId}\\s*\\|\\s*(FAILED|UNREACHABLE)`, 'i');
          const failMatch = output.match(failPattern);
          
          if (failMatch) {
            results[host.id].success = false;
            results[host.id].error = `主机 ${failMatch[1]}`;
            success = false;
            this.logger.debug(`主机 ${host.id} 执行失败: ${failMatch[1]}`);
          } else if (output.includes(hostId)) {
            // 主机ID在输出中，但无法解析具体结果
            // 检查整体是否有SUCCESS标记
            if (output.includes('SUCCESS') || output.includes('CHANGED')) {
              results[host.id].success = true;
              results[host.id].data = {
                stdout: '(命令执行成功)',
                stderr: '',
                rc: 0
              };
              this.logger.debug(`主机 ${host.id} 检测到成功标记`);
            } else {
              results[host.id].success = false;
              results[host.id].error = '无法解析输出';
              this.logger.debug(`主机 ${host.id} 无法解析输出`);
            }
          } else {
            results[host.id].success = false;
            results[host.id].error = '未找到主机输出';
            this.logger.debug(`主机 ${host.id} 未找到输出`);
          }
        }
      }
    });

    // 检查整体成功状态
    const hasAnySuccess = Object.values(results).some((r: any) => r.success);
    const hasAnyFailure = Object.values(results).some((r: any) => !r.success);
    
    if (hasAnyFailure && !hasAnySuccess) {
      success = false;
    }

    this.logger.debug('最终解析结果: ' + JSON.stringify(results, null, 2));
    
    return { success, results };
  }

  private extractFactsManually(output: string): any {
    const facts: any = {};
    
    try {
      // 提取操作系统信息
      const osMatch = output.match(/"ansible_os_family":\s*"([^"]+)"/);
      if (osMatch) facts.ansible_os_family = osMatch[1];
      
      const distMatch = output.match(/"ansible_distribution":\s*"([^"]+)"/);
      if (distMatch) facts.ansible_distribution = distMatch[1];
      
      const versionMatch = output.match(/"ansible_distribution_version":\s*"([^"]+)"/);
      if (versionMatch) facts.ansible_distribution_version = versionMatch[1];
      
      // 提取CPU信息
      const cpuMatch = output.match(/"ansible_processor_vcpus":\s*(\d+)/);
      if (cpuMatch) facts.ansible_processor_vcpus = parseInt(cpuMatch[1]);
      
      const coresMatch = output.match(/"ansible_processor_cores":\s*(\d+)/);
      if (coresMatch) facts.ansible_processor_cores = parseInt(coresMatch[1]);
      
      // 提取内存信息
      const memMatch = output.match(/"ansible_memtotal_mb":\s*(\d+)/);
      if (memMatch) facts.ansible_memtotal_mb = parseInt(memMatch[1]);
      
      // 提取磁盘设备信息
      const devicesMatch = output.match(/"ansible_devices":\s*\{([^}]+)\}/);
      if (devicesMatch) {
        // 尝试提取主要磁盘设备的大小信息
        const diskSizeMatch = output.match(/"size":\s*"([^"]+)"/);
        if (diskSizeMatch) {
          const sizeStr = diskSizeMatch[1];
          const sizeMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*(GB|TB|MB)/i);
          if (sizeMatch) {
            facts.ansible_devices = {
              sda: { size: sizeStr }
            };
          }
        }
      }
      
      console.log('手动提取的facts:', facts);
      
      return Object.keys(facts).length > 0 ? facts : null;
    } catch (error) {
      console.log('手动提取失败:', error.message);
      return null;
    }
  }

  private parseSetupResults(output: string, hosts: any[]): any {
    const results: any = {};
    let success = true;

    hosts.forEach(host => {
      results[host.id] = {
        success: false,
        data: null,
        error: null,
      };
    });

    this.logger.debug('Setup原始输出长度: ' + output.length);

    // 按主机分割输出
    hosts.forEach(host => {
      const hostId = host.id;
      const escapedHostId = hostId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 检查主机是否成功执行 - setup模块返回SUCCESS
      const successPattern = new RegExp(
        `${escapedHostId}\\s*\\|\\s*SUCCESS\\s*=>\\s*\\{([\\s\\S]*?)\\}(?=\\n[a-f0-9-]{36}\\s*\\||$)`,
        'i'
      );
      
      let match = output.match(successPattern);
      
      if (match) {
        try {
          // 尝试解析JSON
          const jsonStr = '{' + match[1] + '}';
          const data = JSON.parse(jsonStr);
          results[host.id].success = true;
          results[host.id].data = data.ansible_facts || data;
          this.logger.debug(`主机 ${host.id} setup解析成功`);
        } catch (e) {
          // JSON解析失败，尝试手动提取
          this.logger.debug(`主机 ${host.id} JSON解析失败，尝试手动提取`);
          const facts = this.extractFactsFromOutput(output, hostId);
          if (facts) {
            results[host.id].success = true;
            results[host.id].data = facts;
          } else {
            results[host.id].success = false;
            results[host.id].error = 'JSON解析失败';
          }
        }
      } else {
        // 尝试更宽松的匹配 - 查找包含ansible_facts的JSON块
        const loosePattern = new RegExp(
          `${escapedHostId}[^{]*\\{[\\s\\S]*?"ansible_facts"\\s*:\\s*\\{([\\s\\S]*?)\\}\\s*\\}`,
          'i'
        );
        match = output.match(loosePattern);
        
        if (match) {
          const facts = this.extractFactsFromOutput(output, hostId);
          if (facts) {
            results[host.id].success = true;
            results[host.id].data = facts;
            this.logger.debug(`主机 ${host.id} 宽松模式解析成功`);
          }
        } else {
          // 检查是否有FAILED或UNREACHABLE
          const failPattern = new RegExp(`${escapedHostId}\\s*\\|\\s*(FAILED|UNREACHABLE)`, 'i');
          const failMatch = output.match(failPattern);
          
          if (failMatch) {
            results[host.id].success = false;
            results[host.id].error = `主机 ${failMatch[1]}`;
            success = false;
            this.logger.debug(`主机 ${host.id} 执行失败: ${failMatch[1]}`);
          } else if (output.includes(hostId) && output.includes('SUCCESS')) {
            // 主机成功但无法解析JSON，尝试手动提取
            const facts = this.extractFactsFromOutput(output, hostId);
            if (facts) {
              results[host.id].success = true;
              results[host.id].data = facts;
              this.logger.debug(`主机 ${host.id} 手动提取成功`);
            } else {
              results[host.id].success = false;
              results[host.id].error = '无法解析facts数据';
            }
          } else {
            results[host.id].success = false;
            results[host.id].error = '未找到主机输出';
            this.logger.debug(`主机 ${host.id} 未找到输出`);
          }
        }
      }
    });

    const hasAnySuccess = Object.values(results).some((r: any) => r.success);
    if (!hasAnySuccess) {
      success = false;
    }

    this.logger.debug('Setup最终解析结果: ' + JSON.stringify(Object.keys(results).map(k => ({ id: k, success: results[k].success })), null, 2));
    
    return { success, results };
  }

  private extractFactsFromOutput(output: string, hostId: string): any {
    const facts: any = {};
    
    try {
      // 找到该主机的输出部分
      const hostPattern = new RegExp(`${hostId}[\\s\\S]*?(?=[a-f0-9-]{36}\\s*\\||$)`, 'i');
      const hostOutput = output.match(hostPattern)?.[0] || output;
      
      // 提取操作系统信息
      const osMatch = hostOutput.match(/"ansible_os_family":\s*"([^"]+)"/);
      if (osMatch) facts.ansible_os_family = osMatch[1];
      
      const distMatch = hostOutput.match(/"ansible_distribution":\s*"([^"]+)"/);
      if (distMatch) facts.ansible_distribution = distMatch[1];
      
      const versionMatch = hostOutput.match(/"ansible_distribution_version":\s*"([^"]+)"/);
      if (versionMatch) facts.ansible_distribution_version = versionMatch[1];
      
      // 提取CPU信息
      const cpuMatch = hostOutput.match(/"ansible_processor_vcpus":\s*(\d+)/);
      if (cpuMatch) facts.ansible_processor_vcpus = parseInt(cpuMatch[1]);
      
      const coresMatch = hostOutput.match(/"ansible_processor_cores":\s*(\d+)/);
      if (coresMatch) facts.ansible_processor_cores = parseInt(coresMatch[1]);
      
      // 提取内存信息
      const memMatch = hostOutput.match(/"ansible_memtotal_mb":\s*(\d+)/);
      if (memMatch) facts.ansible_memtotal_mb = parseInt(memMatch[1]);
      
      // 提取磁盘设备信息 - 查找主要磁盘
      const diskPatterns = [
        /"sda":\s*\{[^}]*"size":\s*"([^"]+)"/,
        /"vda":\s*\{[^}]*"size":\s*"([^"]+)"/,
        /"nvme0n1":\s*\{[^}]*"size":\s*"([^"]+)"/,
      ];
      
      for (const pattern of diskPatterns) {
        const diskMatch = hostOutput.match(pattern);
        if (diskMatch) {
          facts.ansible_devices = {
            sda: { size: diskMatch[1] }
          };
          break;
        }
      }
      
      this.logger.debug(`主机 ${hostId} 手动提取的facts: ${JSON.stringify(facts)}`);
      
      return Object.keys(facts).length > 0 ? facts : null;
    } catch (error) {
      this.logger.debug(`主机 ${hostId} 手动提取失败: ${error.message}`);
      return null;
    }
  }

  private parsePlaybookResults(output: string, hosts: any[]): any {
    // 简化的 playbook 结果解析
    return {
      success: !output.includes('FAILED'),
      output,
      results: {},
    };
  }

  private splitOutputByHosts(output: string, hosts: any[]): Record<string, string> {
    const hostSections: Record<string, string> = {};
    
    // 初始化每个主机的输出
    hosts.forEach(host => {
      hostSections[host.id] = '';
    });
    
    // 尝试按主机标识符分割输出
    const lines = output.split('\n');
    let currentHostId = '';
    
    for (const line of lines) {
      // 查找主机标识符 - 检查是否包含主机的IP、ID或名称
      let foundHost = null;
      for (const host of hosts) {
        if (line.includes(host.ip) || line.includes(host.id) || line.includes(host.name)) {
          foundHost = host;
          break;
        }
      }
      
      if (foundHost) {
        currentHostId = foundHost.id;
      }
      
      // 如果找到了当前主机，将行添加到该主机的输出中
      if (currentHostId && hostSections[currentHostId] !== undefined) {
        hostSections[currentHostId] += line + '\n';
      } else {
        // 如果没有找到特定主机，将行添加到所有主机的输出中
        hosts.forEach(host => {
          hostSections[host.id] += line + '\n';
        });
      }
    }
    
    return hostSections;
  }

  private cleanupFile(filename: string) {
    try {
      unlinkSync(filename);
    } catch (error) {
      this.logger.warn(`Failed to cleanup file ${filename}:`, error.message);
    }
  }
}