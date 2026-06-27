import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Connect Kafka microservice transport (hybrid: HTTP + Kafka consumer)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service-consumer',
        brokers: [(process.env.KAFKA_BROKERS || 'localhost:9092')],
      },
      consumer: {
        groupId: 'notification-service-group',
      },
    },
  });

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000', // Frontend
      'http://localhost:4000', // API Gateway
      'http://localhost:4003', // Task Service
    ],
    credentials: true,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.NOTIFICATION_SERVICE_PORT || 4004;

  await app.startAllMicroservices();
  await app.listen(port);

  console.log(`🔔 Notification Service running on http://localhost:${port}`);
  console.log(`📨 Kafka consumer subscribed to task.created, task.updated, task.deleted`);
  console.log(`🔌 WebSocket namespace: ws://localhost:${port}/notifications`);
}

bootstrap();
