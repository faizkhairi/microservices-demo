import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HttpModule, ProxyModule, HealthModule],
})
export class AppModule {}
