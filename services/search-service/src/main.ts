import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'search-service-consumer',
        brokers: [(process.env.KAFKA_BROKERS || 'localhost:9092')],
      },
      consumer: {
        groupId: 'search-service-group',
      },
    },
  });

  await app.startAllMicroservices();
  const port = process.env.SEARCH_SERVICE_PORT || 4005;
  await app.listen(port);
  console.log(`Search Service running on http://localhost:${port}`);
}
bootstrap();
