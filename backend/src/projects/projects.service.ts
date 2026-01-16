import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: { 
        members: { 
          include: { 
            user: { 
              select: { 
                id: true, 
                username: true, 
                email: true, 
                role: true 
              } 
            } 
          } 
        } 
      },
    });
    
    // 计算成员数量
    const projectWithCount = {
      ...project,
      memberCount: project.members.length,
    };
    
    return projectWithCount;
  }

  async findAll(pagination: PaginationDto, userId: string, userRole: string) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 100; // 增加默认页面大小
    const skip = (page - 1) * pageSize;

    const where = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' 
      ? {} 
      : { members: { some: { userId } } };

    const projects = await this.prisma.project.findMany({ 
      where, 
      skip, 
      take: pageSize, 
      include: { 
        members: { 
          include: { 
            user: { 
              select: { 
                id: true, 
                username: true, 
                email: true, 
                role: true 
              } 
            } 
          } 
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 添加成员数量和创建者信息
    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        const createdBy = await this.prisma.user.findUnique({
          where: { id: project.createdBy },
          select: { id: true, username: true, email: true, role: true }
        });
        
        return {
          ...project,
          memberCount: project._count.members,
          createdBy: createdBy,
        };
      })
    );

    // 直接返回项目数组，不使用分页包装
    return projectsWithDetails;
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { 
        members: { 
          include: { 
            user: { 
              select: { 
                id: true, 
                username: true, 
                email: true, 
                role: true 
              } 
            } 
          } 
        },
        _count: {
          select: { members: true }
        }
      },
    });
    
    if (!project) throw new NotFoundException('项目不存在');
    
    const createdBy = await this.prisma.user.findUnique({
      where: { id: project.createdBy },
      select: { id: true, username: true, email: true, role: true }
    });
    
    return {
      ...project,
      memberCount: project._count.members,
      createdBy: createdBy,
    };
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: { 
        members: { 
          include: { 
            user: { 
              select: { 
                id: true, 
                username: true, 
                email: true, 
                role: true 
              } 
            } 
          } 
        },
        _count: {
          select: { members: true }
        }
      },
    });
    
    const createdBy = await this.prisma.user.findUnique({
      where: { id: project.createdBy },
      select: { id: true, username: true, email: true, role: true }
    });
    
    return {
      ...project,
      memberCount: project._count.members,
      createdBy: createdBy,
    };
  }

  async remove(id: string) {
    await this.prisma.project.delete({ where: { id } });
    return { message: '项目删除成功' };
  }

  async getMembers(projectId: string) {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { 
        user: { 
          select: { 
            id: true, 
            username: true, 
            email: true, 
            role: true 
          } 
        } 
      },
      orderBy: { joinedAt: 'asc' }
    });
    
    return members;
  }

  async addMember(projectId: string, addMemberDto: AddMemberDto) {
    // 检查项目是否存在
    const project = await this.prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    
    // 检查用户是否已经是项目成员
    const existingMember = await this.prisma.projectMember.findUnique({
      where: { 
        projectId_userId: { 
          projectId, 
          userId: addMemberDto.userId 
        } 
      }
    });
    
    if (existingMember) {
      throw new ForbiddenException('用户已经是项目成员');
    }
    
    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: addMemberDto.userId,
        role: addMemberDto.role,
      },
      include: { 
        user: { 
          select: { 
            id: true, 
            username: true, 
            email: true, 
            role: true 
          } 
        } 
      },
    });
    
    return member;
  }

  async removeMember(projectId: string, userId: string) {
    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    return { message: '成员移除成功' };
  }

  async removeMemberById(projectId: string, memberId: string) {
    await this.prisma.projectMember.delete({
      where: { id: memberId },
    });
    return { message: '成员移除成功' };
  }
}
