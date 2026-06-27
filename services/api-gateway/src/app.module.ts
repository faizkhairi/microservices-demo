import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    HttpModule,
    ProxyModule,
    HealthModule,
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      path: '/metrics',
    }),
  ],
})
export class AppModule {}
