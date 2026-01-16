import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController, AlertsListController } from './alerts.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [NotificationsModule, WebSocketModule],
  controllers: [AlertsController, AlertsListController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}