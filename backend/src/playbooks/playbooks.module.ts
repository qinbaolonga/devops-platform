import { Module } from '@nestjs/common';
import { PlaybooksService } from './playbooks.service';
import { PlaybooksController } from './playbooks.controller';
import { AnsibleModule } from '../ansible/ansible.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AnsibleModule, QueueModule],
  controllers: [PlaybooksController],
  providers: [PlaybooksService],
  exports: [PlaybooksService],
})
export class PlaybooksModule {}