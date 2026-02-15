import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000); // Port doesn't matter, worker doesn't expose HTTP

  console.log(`⚙️  Queue Worker started - processing jobs from Redis`);
}

bootstrap();
