import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnsibleService } from '../ansible/ansible.service';
import { DevOpsWebSocketGateway } from '../websocket/websocket.gateway';
import { EncryptionService } from '../common/services/encryption.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private prisma: PrismaService,
    private ansibleService: AnsibleService,
    private webSocketGateway: DevOpsWebSocketGateway,
    private encryptionService: EncryptionService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics() {
    this.logger.debug('Starting host metrics collection');
    try {
      const hosts = await this.prisma.host.findMany({
        where: { status: 'ONLINE' },
        include: { credential: true },
      });
      if (hosts.length === 0) return;

      const decryptedHosts = hosts.map(host => {
        const decryptedHost = { ...host };
        if (host.password) {
          decryptedHost.password = this.encryptionService.decrypt(host.password);
        }
        return decryptedHost;
      });

      const cmd = "echo '===CPU===' && top -bn1 | grep 'Cpu(s)' | awk '{print $2}' && echo '===MEMORY===' && free | grep Mem | awk '{print $3/$2 * 100}' && echo '===DISK===' && df / | tail -1 | awk '{print $5}' | tr -d '%' && echo '===LOAD===' && cat /proc/loadavg | awk '{print $1}'";
      const result = await this.ansibleService.shell(decryptedHosts, cmd);

      for (const host of hosts) {
        const hostResult = result.results[host.id];
        if (hostResult?.success && hostResult.data?.stdout) {
          try {
            const lines = hostResult.data.stdout.split('\n').map((l: string) => l.trim()).filter(Boolean);
            let cpuUsage = 0, memoryUsage = 0, diskUsage = 0, loadAvg = 0, section = '';
            for (const line of lines) {
              if (line === '===CPU===') { section = 'cpu'; continue; }
              if (line === '===MEMORY===') { section = 'memory'; continue; }
              if (line === '===DISK===') { section = 'disk'; continue; }
              if (line === '===LOAD===') { section = 'load'; continue; }
              const value = parseFloat(line);
              if (!isNaN(value)) {
                if (section === 'cpu') cpuUsage = Math.min(100, Math.max(0, value));
                if (section === 'memory') memoryUsage = Math.min(100, Math.max(0, value));
                if (section === 'disk') diskUsage = Math.min(100, Math.max(0, value));
                if (section === 'load') loadAvg = value;
              }
            }
            const savedMetric = await this.prisma.hostMetric.create({
              data: { hostId: host.id, cpuUsage, memoryUsage, diskUsage, networkIn: 0, networkOut: 0, loadAvg },
            });
            this.webSocketGateway.sendMetricsUpdate(host.projectId, host.id, {
              cpuUsage, memoryUsage, diskUsage, networkIn: 0, networkOut: 0, loadAvg, timestamp: savedMetric.timestamp,
            });
          } catch (e) {
            this.logger.error('Parse error:', e.message);
          }
        }
      }
      await this.collectSystemInfo(decryptedHosts, hosts);
    } catch (error) {
      this.logger.error('Metrics collection failed:', error.message);
    }
  }

  private async collectSystemInfo(decryptedHosts: any[], hosts: any[]) {
    const hostsNeedInfo = hosts.filter(h => !h.osType || !h.cpuCores || !h.memoryTotal);
    if (hostsNeedInfo.length === 0) return;
    const filteredHosts = decryptedHosts.filter(h => hostsNeedInfo.some(nh => nh.id === h.id));
    if (filteredHosts.length === 0) return;
    try {
      const result = await this.ansibleService.setup(filteredHosts);
      for (const host of hostsNeedInfo) {
        const hostResult = result.results[host.id];
        if (hostResult?.success && hostResult.data) {
          const facts = hostResult.data.ansible_facts || hostResult.data;
          const updateData: any = {};
          if (!host.osType && facts.ansible_distribution) {
            updateData.osType = facts.ansible_distribution.toLowerCase().includes('euler') ? 'EulerOS' : facts.ansible_distribution;
          }
          if (!host.osVersion && facts.ansible_distribution_version) updateData.osVersion = facts.ansible_distribution_version;
          if (!host.cpuCores) updateData.cpuCores = facts.ansible_processor_vcpus || facts.ansible_processor_cores;
          if (!host.memoryTotal && facts.ansible_memtotal_mb) updateData.memoryTotal = BigInt(facts.ansible_memtotal_mb * 1024 * 1024);
          if (Object.keys(updateData).length > 0) {
            await this.prisma.host.update({ where: { id: host.id }, data: updateData });
          }
        }
      }
    } catch (error) {
      this.logger.error('System info collection failed:', error.message);
    }
  }

  async getOverview(projectId: string) {
    const [totalHosts, onlineHosts, offlineHosts, recentMetrics] = await Promise.all([
      this.prisma.host.count({ where: { projectId } }),
      this.prisma.host.count({ where: { projectId, status: 'ONLINE' } }),
      this.prisma.host.count({ where: { projectId, status: 'OFFLINE' } }),
      this.prisma.hostMetric.findMany({
        where: { host: { projectId }, timestamp: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
        include: { host: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
        take: 100,
      }),
    ]);
    const avgMetrics = recentMetrics.reduce(
      (acc, m) => { acc.cpuUsage += m.cpuUsage; acc.memoryUsage += m.memoryUsage; acc.diskUsage += m.diskUsage; acc.loadAvg += m.loadAvg; return acc; },
      { cpuUsage: 0, memoryUsage: 0, diskUsage: 0, loadAvg: 0 },
    );
    const count = recentMetrics.length || 1;
    Object.keys(avgMetrics).forEach(k => { avgMetrics[k as keyof typeof avgMetrics] /= count; });
    return { hosts: { total: totalHosts, online: onlineHosts, offline: offlineHosts }, averageMetrics: avgMetrics, recentMetrics: recentMetrics.slice(0, 20) };
  }

  async getHostMetrics(hostId: string, hours: number = 24) {
    return this.prisma.hostMetric.findMany({
      where: { hostId, timestamp: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) } },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getTrends(projectId: string, hours: number = 24) {
    const metrics = await this.prisma.hostMetric.findMany({
      where: { host: { projectId }, timestamp: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) } },
      include: { host: { select: { name: true } } },
      orderBy: { timestamp: 'asc' },
    });
    const hourlyData: Record<string, any> = {};
    metrics.forEach(m => {
      const hour = new Date(m.timestamp).toISOString().slice(0, 13);
      if (!hourlyData[hour]) hourlyData[hour] = { timestamp: hour, cpuUsage: [], memoryUsage: [], diskUsage: [], loadAvg: [] };
      hourlyData[hour].cpuUsage.push(m.cpuUsage);
      hourlyData[hour].memoryUsage.push(m.memoryUsage);
      hourlyData[hour].diskUsage.push(m.diskUsage);
      hourlyData[hour].loadAvg.push(m.loadAvg);
    });
    return Object.values(hourlyData).map((d: any) => ({
      timestamp: d.timestamp,
      cpuUsage: d.cpuUsage.reduce((a: number, b: number) => a + b, 0) / d.cpuUsage.length,
      memoryUsage: d.memoryUsage.reduce((a: number, b: number) => a + b, 0) / d.memoryUsage.length,
      diskUsage: d.diskUsage.reduce((a: number, b: number) => a + b, 0) / d.diskUsage.length,
      loadAvg: d.loadAvg.reduce((a: number, b: number) => a + b, 0) / d.loadAvg.length,
    }));
  }
}
