import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DevOpsWebSocketGateway } from './websocket.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [DevOpsWebSocketGateway],
  exports: [DevOpsWebSocketGateway],
})
export class WebSocketModule {}