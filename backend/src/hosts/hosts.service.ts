import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { CreateHostDto } from './dto/create-host.dto';
import { UpdateHostDto } from './dto/update-host.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { AnsibleService } from '../ansible/ansible.service';
import { HostStatus } from '@prisma/client';

@Injectable()
export class HostsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private ansibleService: AnsibleService,
  ) {}

  async create(projectId: string, createHostDto: CreateHostDto) {
    console.log('=== Service 创建主机 ===');
    console.log('Service 接收到的数据:', JSON.stringify(createHostDto, null, 2));
    
    // IP地址在controller中已经验证过，这里可以安全使用
    const ip = createHostDto.ip!; // 使用非空断言，因为controller已验证
    
    // 验证IP地址格式（支持IPv4、IPv6和域名）
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!ipRegex.test(ip)) {
      throw new BadRequestException('IP地址格式不正确，请输入有效的IPv4地址、IPv6地址或域名');
    }

    const data: any = {
      name: createHostDto.name || createHostDto.hostname,
      ip: ip,
      port: createHostDto.port || 22,
      username: createHostDto.username || 'root',
      authType: createHostDto.authType || 'PASSWORD',
      projectId,
    };

    // 添加可选字段
    if (createHostDto.publicIp && createHostDto.publicIp.trim() !== '') {
      data.publicIp = createHostDto.publicIp.trim();
      console.log('设置 publicIp:', data.publicIp);
    } else {
      console.log('publicIp 为空或未提供:', createHostDto.publicIp);
    }
    
    if (createHostDto.privateIp && createHostDto.privateIp.trim() !== '') {
      data.privateIp = createHostDto.privateIp.trim();
      console.log('设置 privateIp:', data.privateIp);
    } else {
      console.log('privateIp 为空或未提供:', createHostDto.privateIp);
    }
    
    if (createHostDto.password) {
      data.password = this.encryptionService.encrypt(createHostDto.password);
    }
    
    if (createHostDto.credentialId) {
      data.credentialId = createHostDto.credentialId;
    }
    
    if (createHostDto.groupId) {
      data.groupId = createHostDto.groupId;
    }
    
    if (createHostDto.tags) {
      data.tags = createHostDto.tags;
    }
    
    if (createHostDto.customFields) {
      data.customFields = createHostDto.customFields;
    }

    console.log('=== Service 准备写入数据库的数据 ===');
    console.log('data:', JSON.stringify(data, null, 2));

    const host = await this.prisma.host.create({
      data,
      include: { group: true, credential: true },
    });

    console.log('=== Service 数据库创建成功 ===');
    console.log('创建的主机:', JSON.stringify(this.sanitizeHost(host), null, 2));

    return this.sanitizeHost(host);
  }

  async findAll(projectId: string, pagination: PaginationDto, filters?: any) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: any = { projectId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.groupId) {
      where.groupId = filters.groupId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { ip: { contains: filters.search } },
        { publicIp: { contains: filters.search } },
        { privateIp: { contains: filters.search } },
        { username: { contains: filters.search } },
        { osType: { contains: filters.search } },
        { osVersion: { contains: filters.search } },
      ];
    }

    const [hosts, total] = await Promise.all([
      this.prisma.host.findMany({
        where,
        skip,
        take: pageSize,
        include: { group: true, credential: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.host.count({ where }),
    ]);

    const sanitizedHosts = hosts.map(host => this.sanitizeHost(host));
    return new PaginatedResponseDto(sanitizedHosts, total, page, pageSize);
  }

  async findOne(id: string) {
    const host = await this.prisma.host.findUnique({
      where: { id },
      include: { group: true, credential: true, metrics: { take: 10, orderBy: { timestamp: 'desc' } } },
    });

    if (!host) {
      throw new NotFoundException('主机不存在');
    }

    return this.sanitizeHost(host);
  }

  async update(id: string, updateHostDto: UpdateHostDto) {
    console.log('更新主机服务:', { id, updateHostDto: JSON.stringify(updateHostDto, null, 2) });
    
    // 过滤掉数据库中不存在的字段
    const { hostname, ...validData } = updateHostDto as any;
    
    // 如果有hostname，用它来更新ip字段（连接地址）
    if (hostname) {
      validData.ip = hostname;
    }
    
    // 如果有hostname但没有name，使用hostname作为name
    if (hostname && !validData.name) {
      validData.name = hostname;
    }

    // 处理authType - 转换为正确的枚举值
    if (validData.authType) {
      const authTypeStr = String(validData.authType).toUpperCase();
      if (authTypeStr === 'PASSWORD' || authTypeStr === 'PWD') {
        validData.authType = 'PASSWORD';
      } else if (authTypeStr === 'SSH_KEY' || authTypeStr === 'SSHKEY' || authTypeStr === 'SSH KEY') {
        validData.authType = 'SSH_KEY';
      } else if (authTypeStr === 'CREDENTIAL' || authTypeStr === 'CRED') {
        validData.authType = 'CREDENTIAL';
      }
    }

    console.log('处理后的数据:', JSON.stringify(validData, null, 2));

    // 加密新密码
    if (validData.password) {
      validData.password = this.encryptionService.encrypt(validData.password);
    }

    try {
      const host = await this.prisma.host.update({
        where: { id },
        data: validData,
        include: { group: true, credential: true },
      });

      console.log('更新成功:', JSON.stringify(this.sanitizeHost(host), null, 2));
      return this.sanitizeHost(host);
    } catch (error) {
      console.error('更新失败:', error);
      throw error;
    }
  }

  async remove(id: string) {
    await this.prisma.host.delete({ where: { id } });
    return { message: '主机删除成功' };
  }

  async testConnection(id: string) {
    const host = await this.prisma.host.findUnique({ where: { id } });
    if (!host) {
      throw new NotFoundException('主机不存在');
    }

    console.log('=== 开始测试连接 ===');
    console.log('主机信息:', {
      id: host.id,
      name: host.name,
      ip: host.ip,
      port: host.port,
      username: host.username,
      authType: host.authType,
      status: host.status
    });

    try {
      // 解密密码
      const decryptedHost = { ...host };
      if (host.password) {
        console.log('解密前密码:', host.password);
        decryptedHost.password = this.encryptionService.decrypt(host.password);
        console.log('解密后密码:', decryptedHost.password);
      }

      console.log('调用Ansible ping...');
      const result = await this.ansibleService.ping([decryptedHost]);
      console.log('Ansible ping结果:', JSON.stringify(result, null, 2));
      
      const isOnline = result.success && result.results[host.id]?.success;
      console.log('连接状态:', isOnline ? 'ONLINE' : 'OFFLINE');

      // 更新主机状态
      await this.prisma.host.update({
        where: { id },
        data: {
          status: isOnline ? HostStatus.ONLINE : HostStatus.OFFLINE,
          lastCheckTime: new Date(),
        },
      });

      console.log('=== 测试连接完成 ===');
      return {
        success: isOnline,
        message: isOnline ? '连接成功' : '连接失败',
        details: result.results[host.id],
      };
    } catch (error) {
      console.error('测试连接异常:', error);
      await this.prisma.host.update({
        where: { id },
        data: { status: HostStatus.OFFLINE, lastCheckTime: new Date() },
      });

      return {
        success: false,
        message: '连接测试失败',
        error: error.message,
      };
    }
  }

  async collectInfo(id: string) {
    const host = await this.prisma.host.findUnique({ where: { id } });
    if (!host) {
      throw new NotFoundException('主机不存在');
    }

    console.log('开始采集主机信息:', { 
      id, 
      name: host.name, 
      ip: host.ip, 
      status: host.status 
    });

    try {
      // 解密密码
      const decryptedHost = { ...host };
      if (host.password) {
        decryptedHost.password = this.encryptionService.decrypt(host.password);
      }

      // 单主机执行setup - 确保只传入一个主机
      console.log('执行单主机Ansible setup...');
      const result = await this.ansibleService.setup([decryptedHost]);
      console.log('Ansible setup结果:', JSON.stringify(result, null, 2));
      
      if (result.success && result.results[host.id]?.success) {
        const hostResult = result.results[host.id];
        console.log('主机结果成功，开始提取数据');
        
        if (hostResult.data) {
          const rawData = hostResult.data;
          console.log('原始数据类型:', typeof rawData);
          
          // 提取facts数据
          let facts = null;
          if (rawData.ansible_facts) {
            facts = rawData.ansible_facts;
          } else if (rawData.ansible_os_family || rawData.ansible_distribution) {
            facts = rawData;
          } else {
            console.log('未找到ansible_facts，尝试从其他字段提取');
            facts = rawData;
          }
          
          console.log('提取的facts包含字段:', Object.keys(facts || {}));
          
          if (facts && (facts.ansible_os_family || facts.ansible_distribution)) {
            // 更新主机信息
            const updateData: any = {
              status: HostStatus.ONLINE,
              lastCheckTime: new Date(),
            };

            // 安全地提取系统信息
            // 优先使用更具体的发行版信息，特别处理EulerOS
            let osType = null;
            if (facts.ansible_distribution) {
              osType = facts.ansible_distribution;
              // 特殊处理EulerOS
              if (osType.toLowerCase().includes('euler')) {
                osType = '欧拉Linux';
              }
            } else if (facts.ansible_os_family) {
              osType = facts.ansible_os_family;
              // 如果是RedHat家族，检查是否是EulerOS
              if (osType === 'RedHat' && facts.ansible_distribution_file_variety === 'EulerOS') {
                osType = '欧拉Linux';
              }
            }
            
            if (osType) {
              updateData.osType = osType;
              console.log('设置osType:', osType);
            }
            
            if (facts.ansible_distribution_version || facts.ansible_distribution) {
              updateData.osVersion = facts.ansible_distribution_version || facts.ansible_distribution;
              console.log('设置osVersion:', updateData.osVersion);
            }
            
            if (facts.ansible_processor_vcpus || facts.ansible_processor_cores) {
              updateData.cpuCores = facts.ansible_processor_vcpus || facts.ansible_processor_cores;
              console.log('设置cpuCores:', updateData.cpuCores);
            }
            
            if (facts.ansible_memtotal_mb) {
              updateData.memoryTotal = BigInt(facts.ansible_memtotal_mb * 1024 * 1024);
              console.log('设置memoryTotal:', facts.ansible_memtotal_mb, 'MB');
            }
            
            // 尝试获取磁盘信息
            if (facts.ansible_devices) {
              const devices = facts.ansible_devices;
              console.log('可用设备:', Object.keys(devices));
              // 查找主要磁盘设备
              const mainDisk = devices.sda || devices.vda || devices.nvme0n1 || devices.hda;
              if (mainDisk && mainDisk.size) {
                console.log('找到主磁盘:', mainDisk.size);
                // 解析磁盘大小（可能是 "20.00 GB" 这样的格式）
                const sizeStr = mainDisk.size.toString();
                const sizeMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*(GB|TB|MB)/i);
                if (sizeMatch) {
                  const size = parseFloat(sizeMatch[1]);
                  const unit = sizeMatch[2].toUpperCase();
                  let bytes = size;
                  if (unit === 'GB') bytes *= 1024 * 1024 * 1024;
                  else if (unit === 'TB') bytes *= 1024 * 1024 * 1024 * 1024;
                  else if (unit === 'MB') bytes *= 1024 * 1024;
                  updateData.diskTotal = BigInt(Math.floor(bytes));
                  console.log('设置diskTotal:', bytes, 'bytes');
                }
              }
            }
            
            console.log('准备更新的数据字段:', Object.keys(updateData));
            
            const updatedHost = await this.prisma.host.update({
              where: { id },
              data: updateData,
            });
            
            console.log('数据库更新成功');

            return {
              success: true,
              message: '信息采集成功',
              data: facts,
            };
          } else {
            console.log('未找到有效的facts数据');
            return {
              success: false,
              message: '信息采集失败：未获取到系统信息',
              error: 'No valid facts data found',
            };
          }
        } else {
          console.log('主机结果中没有数据');
          return {
            success: false,
            message: '信息采集失败：未获取到数据',
            error: hostResult.error || 'No data returned',
          };
        }
      }

      console.log('采集失败，result.success:', result.success, 'host result:', result.results[host.id]);
      return {
        success: false,
        message: '信息采集失败',
        error: result.results[host.id]?.error || 'Unknown error',
      };
    } catch (error) {
      console.error('采集信息异常:', error);
      return {
        success: false,
        message: '信息采集失败',
        error: error.message,
      };
    }
  }

  private sanitizeHost(host: any) {
    const { password, ...sanitized } = host;
    
    // 处理BigInt字段，转换为数字（以字节为单位）
    if (sanitized.memoryTotal && typeof sanitized.memoryTotal === 'bigint') {
      sanitized.memoryTotal = Number(sanitized.memoryTotal);
    }
    
    if (sanitized.diskTotal && typeof sanitized.diskTotal === 'bigint') {
      sanitized.diskTotal = Number(sanitized.diskTotal);
    }
    
    return sanitized;
  }
}