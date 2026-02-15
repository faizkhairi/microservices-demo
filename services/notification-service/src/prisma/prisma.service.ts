import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['query', 'error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Notification Service connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('⚠️  Notification Service disconnected from database');
  }
}
