import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import { BrowseFilesDto } from './dto/browse-files.dto';
import { CreateDirectoryDto } from './dto/create-directory.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { RenameFileDto } from './dto/rename-file.dto';
import { ChangePermissionsDto } from './dto/change-permissions.dto';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('文件管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/hosts/:hostId/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('browse')
  @ApiOperation({ summary: '浏览文件和目录' })
  async browseFiles(
    @Param('hostId') hostId: string,
    @Query() browseFilesDto: BrowseFilesDto,
  ) {
    return this.filesService.browseFiles(hostId, browseFilesDto.path);
  }

  @Post('upload')
  @ApiOperation({ summary: '上传文件' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = './uploads/temp';
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB
      },
    }),
  )
  async uploadFile(
    @Param('hostId') hostId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('remotePath') remotePath: string,
  ) {
    try {
      if (!file) {
        throw new Error('未选择文件');
      }

      if (!remotePath) {
        throw new Error('未指定远程路径');
      }

      await this.filesService.uploadFile(hostId, file.path, remotePath);

      // 清理临时文件
      fs.unlinkSync(file.path);

      return {
        message: '文件上传成功',
        filename: file.originalname,
        size: file.size,
        remotePath,
      };
    } catch (error) {
      // 清理临时文件
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  @Get('download')
  @ApiOperation({ summary: '下载文件' })
  async downloadFile(
    @Param('hostId') hostId: string,
    @Query('remotePath') remotePath: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!remotePath) {
      throw new Error('未指定远程文件路径');
    }

    const tempDir = './uploads/temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filename = path.basename(remotePath);
    const localPath = path.join(tempDir, `download-${Date.now()}-${filename}`);

    try {
      await this.filesService.downloadFile(hostId, remotePath, localPath);

      const file = fs.createReadStream(localPath);
      
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });

      // 设置清理定时器
      setTimeout(() => {
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }, 60000); // 1分钟后清理

      return new StreamableFile(file);
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      throw error;
    }
  }

  @Get('content')
  @ApiOperation({ summary: '获取文件内容（文本文件）' })
  async getFileContent(
    @Param('hostId') hostId: string,
    @Query('remotePath') remotePath: string,
  ) {
    if (!remotePath) {
      throw new Error('未指定远程文件路径');
    }

    const buffer = await this.filesService.getFileContent(hostId, remotePath);
    const content = buffer.toString('utf8');

    return {
      path: remotePath,
      content,
      size: buffer.length,
    };
  }

  @Put('content')
  @ApiOperation({ summary: '保存文件内容（文本文件）' })
  async saveFileContent(
    @Param('hostId') hostId: string,
    @Body() body: { path: string; content: string },
  ) {
    if (!body.path) {
      throw new Error('未指定远程文件路径');
    }

    await this.filesService.saveFileContent(hostId, body.path, body.content);

    return {
      message: '文件保存成功',
      path: body.path,
    };
  }

  @Post('mkdir')
  @ApiOperation({ summary: '创建目录' })
  async createDirectory(
    @Param('hostId') hostId: string,
    @Body() createDirectoryDto: CreateDirectoryDto,
  ) {
    await this.filesService.createDirectory(
      hostId,
      createDirectoryDto.path,
      createDirectoryDto.recursive,
    );

    return {
      message: '目录创建成功',
      path: createDirectoryDto.path,
    };
  }

  @Delete()
  @ApiOperation({ summary: '删除文件或目录' })
  async deleteFile(
    @Param('hostId') hostId: string,
    @Body() deleteFileDto: DeleteFileDto,
  ) {
    await this.filesService.deleteFile(
      hostId,
      deleteFileDto.path,
      deleteFileDto.isDirectory,
    );

    return {
      message: `${deleteFileDto.isDirectory ? '目录' : '文件'}删除成功`,
      path: deleteFileDto.path,
    };
  }

  @Put('rename')
  @ApiOperation({ summary: '重命名文件或目录' })
  async renameFile(
    @Param('hostId') hostId: string,
    @Body() renameFileDto: RenameFileDto,
  ) {
    await this.filesService.renameFile(hostId, renameFileDto.oldPath, renameFileDto.newPath);

    return {
      message: '重命名成功',
      oldPath: renameFileDto.oldPath,
      newPath: renameFileDto.newPath,
    };
  }

  @Put('chmod')
  @ApiOperation({ summary: '修改文件权限' })
  async changePermissions(
    @Param('hostId') hostId: string,
    @Body() changePermissionsDto: ChangePermissionsDto,
  ) {
    await this.filesService.changePermissions(
      hostId,
      changePermissionsDto.path,
      changePermissionsDto.permissions,
    );

    return {
      message: '权限修改成功',
      path: changePermissionsDto.path,
      permissions: changePermissionsDto.permissions,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: '获取文件统计信息' })
  async getFileStats(
    @Param('hostId') hostId: string,
    @Query('remotePath') remotePath: string,
  ) {
    if (!remotePath) {
      throw new Error('未指定远程文件路径');
    }

    const stats = await this.filesService.getFileStats(hostId, remotePath);

    return {
      path: remotePath,
      stats,
    };
  }
}