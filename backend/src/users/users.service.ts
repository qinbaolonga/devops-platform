import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }

    // 检查邮箱是否已存在
    if (createUserDto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingEmail) {
        throw new BadRequestException('邮箱已存在');
      }
    }

    // 哈希密码
    const hashedPassword = await this.encryptionService.hashPassword(createUserDto.password);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    return this.sanitizeUser(user);
  }

  async findAll(pagination: PaginationDto, filters?: any) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 100; // 增加默认页面大小
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.enabled !== undefined) {
      where.enabled = filters.enabled === 'true';
    }

    if (filters?.search) {
      where.OR = [
        { username: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedUsers = users.map(user => this.sanitizeUser(user));
    return sanitizedUsers; // 直接返回数组
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        projects: {
          include: { project: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    return this.sanitizeUser(user);
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: '用户删除成功' };
  }

  async enable(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { enabled: true },
    });

    return this.sanitizeUser(user);
  }

  async disable(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { enabled: false },
    });

    return this.sanitizeUser(user);
  }

  async resetPassword(id: string) {
    const newPassword = this.encryptionService.generateRandomPassword(12);
    const hashedPassword = await this.encryptionService.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    return {
      message: '密码重置成功',
      newPassword,
    };
  }

  private sanitizeUser(user: any) {
    const { password, failedAttempts, lockedUntil, ...sanitized } = user;
    return sanitized;
  }
}