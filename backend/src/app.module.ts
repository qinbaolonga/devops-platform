import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ProjectsModule } from './projects/projects.module';
import { HostsModule } from './hosts/hosts.module';
import { CommandsModule } from './commands/commands.module';
import { UsersModule } from './users/users.module';
import { PlaybooksModule } from './playbooks/playbooks.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AlertsModule } from './alerts/alerts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebSocketModule } from './websocket/websocket.module';
import { QueueModule } from './queue/queue.module';
import { FilesModule } from './files/files.module';
import { TasksModule } from './tasks/tasks.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { TerminalModule } from './terminal/terminal.module';
import { SystemModule } from './system/system.module';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    AuditModule,
    ProjectsModule,
    HostsModule,
    CommandsModule,
    UsersModule,
    PlaybooksModule,
    MonitoringModule,
    AlertsModule,
    NotificationsModule,
    WebSocketModule,
    QueueModule,
    FilesModule,
    TasksModule,
    ScheduledTasksModule,
    TerminalModule,
    SystemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
