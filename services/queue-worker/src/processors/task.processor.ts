import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';

@Processor('task')
export class TaskProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`📥 Processing job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case 'task.created':
        await this.handleTaskCreated(job);
        break;

      case 'task.completed':
        await this.handleTaskCompleted(job);
        break;

      default:
        console.log(`⚠️  Unknown job type: ${job.name}`);
    }
  }

  /**
   * Handle task.created job
   * Sends notification when a task is created
   */
  private async handleTaskCreated(job: Job) {
    const { userId, taskId, title } = job.data;

    try {
      // Call Notification Service to create in-app notification
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/notifications/send`,
        {
          userId,
          type: 'INFO',
          channel: 'IN_APP',
          subject: 'New Task Created',
          message: `Your task "${title}" has been created successfully!`,
        },
      );

      console.log(`✅ Sent notification for task ${taskId}`);
    } catch (error) {
      console.error(`❌ Failed to send notification for task ${taskId}:`, error.message);
      throw error; // Will trigger retry
    }
  }

  /**
   * Handle task.completed job
   * Sends congratulations notification when task is completed
   */
  private async handleTaskCompleted(job: Job) {
    const { userId, taskId, title } = job.data;

    try {
      // Call Notification Service to create in-app notification
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/notifications/send`,
        {
          userId,
          type: 'SUCCESS',
          channel: 'IN_APP',
          subject: 'Task Completed',
          message: `Congratulations! You completed "${title}"`,
        },
      );

      console.log(`✅ Sent completion notification for task ${taskId}`);
    } catch (error) {
      console.error(`❌ Failed to send completion notification for task ${taskId}:`, error.message);
      throw error; // Will trigger retry
    }
  }
}
