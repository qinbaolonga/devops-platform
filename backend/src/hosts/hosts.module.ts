import { Module } from '@nestjs/common';
import { HostsService } from './hosts.service';
import { HostsController } from './hosts.controller';
import { AnsibleModule } from '../ansible/ansible.module';

@Module({
  imports: [AnsibleModule],
  controllers: [HostsController],
  providers: [HostsService],
  exports: [HostsService],
})
export class HostsModule {}