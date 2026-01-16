import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly maxFailedAttempts = 5;
  private readonly lockDuration = 15 * 60 * 1000; // 15分钟

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private encryptionService: EncryptionService,
    private configService: ConfigService,
  ) {}

  /**
   * 用户登录
   */
  async login(username: string, password: string, ip: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查账户是否被禁用
    if (!user.enabled) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 检查账户是否被锁定
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `账户已被锁定，请在 ${remainingMinutes} 分钟后重试`,
      );
    }

    // 验证密码
    const isPasswordValid = await this.encryptionService.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      // 增加失败次数
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 登录成功，重置失败次数
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    // 生成 JWT Token
    const token = await this.generateToken(user);

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * 处理登录失败
   */
  private async handleFailedLogin(user: User) {
    const failedAttempts = user.failedAttempts + 1;
    const updateData: any = { failedAttempts };

    // 如果失败次数达到上限，锁定账户
    if (failedAttempts >= this.maxFailedAttempts) {
      updateData.lockedUntil = new Date(Date.now() + this.lockDuration);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
  }

  /**
   * 生成 JWT Token
   */
  async generateToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 验证 Token
   */
  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.enabled) {
        throw new UnauthorizedException('无效的令牌');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('无效的令牌');
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    // 验证旧密码
    const isPasswordValid = await this.encryptionService.comparePassword(
      oldPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('原密码错误');
    }

    // 哈希新密码
    const hashedPassword = await this.encryptionService.hashPassword(newPassword);

    // 更新密码
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: '密码修改成功' };
  }

  /**
   * 获取用户信息
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        enabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    return user;
  }

  /**
   * 更新个人信息
   */
  async updateProfile(userId: string, updateData: { username?: string; email?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    // 如果要更新用户名，检查是否已存在
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: updateData.username },
      });
      if (existingUser) {
        throw new BadRequestException('用户名已存在');
      }
    }

    // 如果要更新邮箱，检查是否已存在
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: updateData.email },
      });
      if (existingUser) {
        throw new BadRequestException('邮箱已被使用');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        enabled: true,
      },
    });

    return updatedUser;
  }

  /**
   * 清理用户敏感信息
   */
  private sanitizeUser(user: User) {
    const { password, failedAttempts, lockedUntil, ...sanitized } = user;
    return sanitized;
  }
}
