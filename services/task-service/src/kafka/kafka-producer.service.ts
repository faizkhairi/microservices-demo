import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private client: ClientKafka;

  async onModuleInit() {
    this.client = new ClientKafka({
      client: {
        clientId: 'task-service-producer',
        brokers: [(process.env.KAFKA_BROKERS || 'localhost:9092')],
      },
      producer: {
        allowAutoTopicCreation: true,
      },
    });

    await this.client.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  async emitTaskCreated(payload: { userId: string; taskId: string; title: string }) {
    this.logger.log(`Emitting task.created for taskId=${payload.taskId}`);
    this.client.emit('task.created', payload);
  }

  async emitTaskUpdated(payload: { userId: string; taskId: string; title: string; status: string }) {
    this.logger.log(`Emitting task.updated for taskId=${payload.taskId}`);
    this.client.emit('task.updated', payload);
  }

  async emitTaskDeleted(payload: { userId: string; taskId: string }) {
    this.logger.log(`Emitting task.deleted for taskId=${payload.taskId}`);
    this.client.emit('task.deleted', payload);
  }
}
