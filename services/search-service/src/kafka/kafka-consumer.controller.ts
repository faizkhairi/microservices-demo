import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SearchService } from '../search/search.service';

@Controller()
export class KafkaConsumerController {
  private readonly logger = new Logger(KafkaConsumerController.name);

  constructor(private readonly searchService: SearchService) {}

  @EventPattern('task.created')
  async handleTaskCreated(@Payload() payload: { userId: string; taskId: string; title: string }) {
    this.logger.log(`[Kafka] Indexing new task: ${payload.taskId}`);
    await this.searchService.indexTask(payload.taskId, payload.userId, payload.title);
  }

  @EventPattern('task.updated')
  async handleTaskUpdated(@Payload() payload: { userId: string; taskId: string; title: string; status: string }) {
    this.logger.log(`[Kafka] Updating task index: ${payload.taskId}`);
    await this.searchService.indexTask(payload.taskId, payload.userId, payload.title, payload.status);
  }

  @EventPattern('task.deleted')
  async handleTaskDeleted(@Payload() payload: { userId: string; taskId: string }) {
    this.logger.log(`[Kafka] Removing task from index: ${payload.taskId}`);
    await this.searchService.deleteTask(payload.taskId);
  }
}
