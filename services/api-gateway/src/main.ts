import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for the configured origin
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.GATEWAY_PORT || 4000;
  await app.listen(port);

  console.log(`API Gateway running on http://localhost:${port}`);
}

bootstrap();
