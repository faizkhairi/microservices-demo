import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class TaskQueueService {
  private taskQueue: Queue;

  constructor() {
    const connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });

    this.taskQueue = new Queue('task', { connection });
  }

  /**
   * Publish task.created job to queue
   */
  async publishTaskCreated(userId: string, taskId: string, title: string) {
    await this.taskQueue.add('task.created', {
      userId,
      taskId,
      title,
    });
    console.log(`📤 Published task.created job for task ${taskId}`);
  }

  /**
   * Publish task.completed job to queue
   */
  async publishTaskCompleted(userId: string, taskId: string, title: string) {
    await this.taskQueue.add('task.completed', {
      userId,
      taskId,
      title,
    });
    console.log(`📤 Published task.completed job for task ${taskId}`);
  }
}
