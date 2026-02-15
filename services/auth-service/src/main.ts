import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for API Gateway and frontend
  app.enableCors({
    origin: [
      'http://localhost:3000', // Frontend
      'http://localhost:4000', // API Gateway
    ],
    credentials: true,
  });

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.AUTH_SERVICE_PORT || 4001;
  await app.listen(port);

  console.log(`🔐 Auth Service running on http://localhost:${port}`);
}

bootstrap();
