import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { AnsibleModule } from '../ansible/ansible.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [AnsibleModule, WebSocketModule, CommonModule],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}