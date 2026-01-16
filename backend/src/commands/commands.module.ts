import { Module } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { CommandsController } from './commands.controller';
import { AnsibleModule } from '../ansible/ansible.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AnsibleModule, QueueModule],
  controllers: [CommandsController],
  providers: [CommandsService],
  exports: [CommandsService],
})
export class CommandsModule {}