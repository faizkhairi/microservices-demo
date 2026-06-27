import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskQueueService } from '../queue/task-queue.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
    CacheModule.registerAsync({
      isGlobal: false,
      useFactory: async () => ({
        store: await redisStore({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        }),
        ttl: 30 * 1000, // 30 seconds in ms for cache-manager v5
      }),
    }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskQueueService, KafkaProducerService, JwtStrategy],
  exports: [TasksService],
})
export class TasksModule {}
