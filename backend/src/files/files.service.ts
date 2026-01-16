import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import * as SftpClient from 'ssh2-sftp-client';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

export interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size: number;
  permissions: string;
  owner: string;
  group: string;
  modifyTime: Date;
  path: string;
}

export interface UploadProgress {
  transferred: number;
  total: number;
  percentage: number;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async browseFiles(hostId: string, remotePath: string = '/'): Promise<FileInfo[]> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      const files = await sftp.list(remotePath);
      
      return files.map((file: any) => ({
        name: file.name,
        type: file.type === 'd' ? 'directory' : 'file',
        size: file.size,
        permissions: file.rights?.user + file.rights?.group + file.rights?.other || '',
        owner: file.owner?.toString() || '',
        group: file.group?.toString() || '',
        modifyTime: new Date(file.modifyTime),
        path: path.posix.join(remotePath, file.name),
      }));
    } finally {
      await sftp.end();
    }
  }

  async uploadFile(
    hostId: string,
    localFilePath: string,
    remotePath: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<void> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      // 检查本地文件是否存在
      if (!fs.existsSync(localFilePath)) {
        throw new NotFoundException('本地文件不存在');
      }

      const stats = fs.statSync(localFilePath);
      let transferred = 0;

      // 创建进度回调
      const progressCallback = onProgress ? (total: number, chunk: number) => {
        transferred += chunk;
        onProgress({
          transferred,
          total,
          percentage: Math.round((transferred / total) * 100),
        });
      } : undefined;

      await sftp.fastPut(localFilePath, remotePath, {
        step: progressCallback,
      });

      this.logger.log(`文件上传成功: ${localFilePath} -> ${host.name}:${remotePath}`);
    } finally {
      await sftp.end();
    }
  }

  async downloadFile(hostId: string, remotePath: string, localPath: string): Promise<void> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      // 确保本地目录存在
      const localDir = path.dirname(localPath);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      await sftp.fastGet(remotePath, localPath);
      
      this.logger.log(`文件下载成功: ${host.name}:${remotePath} -> ${localPath}`);
    } finally {
      await sftp.end();
    }
  }

  async getFileContent(hostId: string, remotePath: string): Promise<Buffer> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      const buffer = await sftp.get(remotePath);
      return buffer as Buffer;
    } finally {
      await sftp.end();
    }
  }

  async saveFileContent(hostId: string, remotePath: string, content: string): Promise<void> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      const buffer = Buffer.from(content, 'utf8');
      await sftp.put(buffer, remotePath);
      
      this.logger.log(`文件保存成功: ${host.name}:${remotePath}`);
    } finally {
      await sftp.end();
    }
  }

  async createDirectory(hostId: string, remotePath: string, recursive: boolean = false): Promise<void> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      await sftp.mkdir(remotePath, recursive);
      
      this.logger.log(`目录创建成功: ${host.name}:${remotePath}`);
    } finally {
      await sftp.end();
    }
  }

  async deleteFile(hostId: string, remotePath: string, isDirectory: boolean = false): Promise<void> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      if (isDirectory) {
        await sftp.rmdir(remotePath, true);
      } else {
        await sftp.delete(remotePath);
      }
      
      this.logger.log(`${isDirectory ? '目录' : '文件'}删除成功: ${host.name}:${remotePath}`);
    } finally {
      await sftp.end();
    }
  }

  async renameFile(hostId: string, oldPath: string, newPath: string): Promise<void> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      await sftp.rename(oldPath, newPath);
      
      this.logger.log(`文件重命名成功: ${host.name}:${oldPath} -> ${newPath}`);
    } finally {
      await sftp.end();
    }
  }

  async changePermissions(hostId: string, remotePath: string, permissions: string): Promise<void> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      // 将权限字符串转换为八进制数字
      const mode = parseInt(permissions, 8);
      await sftp.chmod(remotePath, mode);
      
      this.logger.log(`权限修改成功: ${host.name}:${remotePath} -> ${permissions}`);
    } finally {
      await sftp.end();
    }
  }

  async getFileStats(hostId: string, remotePath: string): Promise<any> {
    const host = await this.getHostWithCredentials(hostId);
    const sftp = new SftpClient();

    try {
      await this.connectSftp(sftp, host);
      
      const stats = await sftp.stat(remotePath);
      return stats;
    } finally {
      await sftp.end();
    }
  }

  private async getHostWithCredentials(hostId: string) {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
      include: { credential: true },
    });

    if (!host) {
      throw new NotFoundException('主机不存在');
    }

    return host;
  }

  private async connectSftp(sftp: SftpClient, host: any): Promise<void> {
    const config: any = {
      host: host.ip,
      port: host.port || 22,
      username: host.username,
      readyTimeout: 30000,
      retries: 3,
    };

    this.logger.log(`SFTP 连接: host=${host.name}, authType=${host.authType}, hasPassword=${!!host.password}, hasCredential=${!!host.credential}`);

    // 根据认证类型配置连接
    if (host.authType === 'PASSWORD') {
      if (host.password) {
        config.password = this.encryptionService.decrypt(host.password);
      } else if (host.credential?.password) {
        config.password = this.encryptionService.decrypt(host.credential.password);
      } else {
        throw new BadRequestException('未配置密码');
      }
    } else if (host.authType === 'SSH_KEY') {
      if (host.credential?.privateKey) {
        config.privateKey = this.encryptionService.decrypt(host.credential.privateKey);
        if (host.credential.passphrase) {
          config.passphrase = this.encryptionService.decrypt(host.credential.passphrase);
        }
      } else {
        throw new BadRequestException('未配置 SSH 私钥');
      }
    } else if (host.authType === 'CREDENTIAL' && host.credential) {
      // 使用凭据表中的认证信息
      if (host.credential.privateKey) {
        config.privateKey = this.encryptionService.decrypt(host.credential.privateKey);
        if (host.credential.passphrase) {
          config.passphrase = this.encryptionService.decrypt(host.credential.passphrase);
        }
      } else if (host.credential.password) {
        config.password = this.encryptionService.decrypt(host.credential.password);
      } else {
        throw new BadRequestException('凭据中未配置认证信息');
      }
      // 如果凭据中有用户名，使用凭据的用户名
      if (host.credential.username) {
        config.username = host.credential.username;
      }
    } else {
      throw new BadRequestException('不支持的认证类型或凭据未配置');
    }

    try {
      await sftp.connect(config);
    } catch (error) {
      this.logger.error(`SFTP 连接失败 [${host.name}]: ${error.message}`);
      throw new BadRequestException(`SFTP 连接失败: ${error.message}`);
    }
  }
}