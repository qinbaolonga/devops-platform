import { Module } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { ScheduledTasksController } from './scheduled-tasks.controller';
import { ScheduledTaskWorker } from './scheduled-task.worker';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [ScheduledTasksController],
  providers: [ScheduledTasksService, ScheduledTaskWorker],
  exports: [ScheduledTasksService, ScheduledTaskWorker],
})
export class ScheduledTasksModule {}