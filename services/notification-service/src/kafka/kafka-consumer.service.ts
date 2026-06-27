import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from '../notifications/notifications.service';

interface TaskCreatedPayload {
  userId: string;
  taskId: string;
  title: string;
}

interface TaskUpdatedPayload {
  userId: string;
  taskId: string;
  title: string;
  status: string;
}

interface TaskDeletedPayload {
  userId: string;
  taskId: string;
}

@Controller()
export class KafkaConsumerController {
  private readonly logger = new Logger(KafkaConsumerController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('task.created')
  async handleTaskCreated(@Payload() payload: TaskCreatedPayload) {
    this.logger.log(`[Kafka] task.created received: taskId=${payload.taskId}`);
    await this.notificationsService.createFromKafkaEvent({
      userId: payload.userId,
      type: 'TASK_CREATED',
      title: 'Task Created',
      message: `New task created: "${payload.title}"`,
      metadata: { taskId: payload.taskId },
    });
  }

  @EventPattern('task.updated')
  async handleTaskUpdated(@Payload() payload: TaskUpdatedPayload) {
    this.logger.log(`[Kafka] task.updated received: taskId=${payload.taskId}, status=${payload.status}`);
    await this.notificationsService.createFromKafkaEvent({
      userId: payload.userId,
      type: 'TASK_UPDATED',
      title: 'Task Updated',
      message: `Task "${payload.title}" updated to ${payload.status}`,
      metadata: { taskId: payload.taskId, status: payload.status },
    });
  }

  @EventPattern('task.deleted')
  async handleTaskDeleted(@Payload() payload: TaskDeletedPayload) {
    this.logger.log(`[Kafka] task.deleted received: taskId=${payload.taskId}`);
    await this.notificationsService.createFromKafkaEvent({
      userId: payload.userId,
      type: 'TASK_DELETED',
      title: 'Task Deleted',
      message: `Task ${payload.taskId} was deleted`,
      metadata: { taskId: payload.taskId },
    });
  }
}
