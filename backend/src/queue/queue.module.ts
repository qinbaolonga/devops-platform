import { Module } from '@nestjs/common';
import { SimpleQueueService } from './queue.service';
import { AnsibleModule } from '../ansible/ansible.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    AnsibleModule,
    CommonModule,
  ],
  providers: [SimpleQueueService],
  exports: [SimpleQueueService],
})
export class QueueModule {}