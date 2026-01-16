import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TerminalService } from './terminal.service';
import { TerminalGateway } from './terminal.gateway';
import { TerminalController } from './terminal.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [TerminalController],
  providers: [TerminalService, TerminalGateway],
  exports: [TerminalService, TerminalGateway],
})
export class TerminalModule {}