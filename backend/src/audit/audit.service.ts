import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

export interface AuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ip: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建审计日志
   */
  async createLog(data: AuditLogData) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details || {},
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * 查询审计日志
   */
  async findLogs(params: {
    pagination?: PaginationDto;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { pagination, userId, action, resource, startDate, endDate } = params;
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = { contains: action };
    }

    if (resource) {
      where.resource = { contains: resource };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return new PaginatedResponseDto(logs, total, page, pageSize);
  }

  /**
   * 导出审计日志
   */
  async exportLogs(params: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.action) {
      where.action = { contains: params.action };
    }

    if (params.resource) {
      where.resource = { contains: params.resource };
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }
}
