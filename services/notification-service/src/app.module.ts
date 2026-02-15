import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
})
export class AppModule {}
