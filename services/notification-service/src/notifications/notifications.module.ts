import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from '../email/email.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { KafkaConsumerController } from '../kafka/kafka-consumer.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PassportModule,
    RealtimeModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  controllers: [NotificationsController, KafkaConsumerController],
  providers: [NotificationsService, EmailService, JwtStrategy],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
