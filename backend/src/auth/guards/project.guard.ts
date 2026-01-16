import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, ProjectRole } from '@prisma/client';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.projectId || request.body.projectId;

    if (!user) {
      throw new ForbiddenException('未授权访问');
    }

    // 超级管理员和管理员可以访问所有项目
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      return true;
    }

    if (!projectId) {
      throw new ForbiddenException('缺少项目ID');
    }

    // 检查用户是否是项目成员
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    });

    if (!member) {
      throw new ForbiddenException('无权访问此项目');
    }

    // 将项目角色添加到请求对象
    request.projectRole = member.role;

    return true;
  }
}
