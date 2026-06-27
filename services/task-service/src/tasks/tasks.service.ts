import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { TaskQueueService } from '../queue/task-queue.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { CreateTaskDto, TaskStatus } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private taskQueue: TaskQueueService,
    private kafkaProducer: KafkaProducerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Create a new task
   */
  async create(userId: string, createTaskDto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        userId,
        ...createTaskDto,
      },
    });

    // BullMQ: retry queue for notification delivery
    await this.taskQueue.publishTaskCreated(userId, task.id, task.title);

    // Kafka: event stream for downstream consumers (search, analytics, etc.)
    await this.kafkaProducer.emitTaskCreated({ userId, taskId: task.id, title: task.title });

    // Invalidate user task list cache after creation
    await this.cacheManager.del(`tasks:user:${userId}`);

    return task;
  }

  /**
   * Get all tasks for a user with filtering and pagination
   */
  async findAll(
    userId: string,
    status?: TaskStatus,
    page: number = 1,
    limit: number = 10,
  ) {
    // Only cache unfiltered first-page requests to avoid cache explosion
    const cacheKey = `tasks:user:${userId}`;
    if (!status && page === 1 && limit === 10) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    const result = {
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Populate cache for default list request
    if (!status && page === 1 && limit === 10) {
      await this.cacheManager.set(cacheKey, result, 30000);
    }

    return result;
  }

  /**
   * Get a single task by ID
   */
  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check ownership
    if (task.userId !== userId) {
      throw new ForbiddenException('You can only access your own tasks');
    }

    return task;
  }

  /**
   * Update a task
   */
  async update(id: string, userId: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.findOne(id, userId);

    // Check if status changed to COMPLETED
    const wasCompleted = task.status === TaskStatus.COMPLETED;
    const isNowCompleted = updateTaskDto.status === TaskStatus.COMPLETED;

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    });

    // BullMQ: queue job for completion notification
    if (!wasCompleted && isNowCompleted) {
      await this.taskQueue.publishTaskCompleted(
        userId,
        updatedTask.id,
        updatedTask.title,
      );
    }

    // Kafka: always emit update event for downstream consumers
    await this.kafkaProducer.emitTaskUpdated({
      userId,
      taskId: updatedTask.id,
      title: updatedTask.title,
      status: updatedTask.status,
    });

    // Invalidate user task list cache after update
    await this.cacheManager.del(`tasks:user:${userId}`);

    return updatedTask;
  }

  /**
   * Delete a task
   */
  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Check ownership

    await this.prisma.task.delete({
      where: { id },
    });

    // Kafka: emit delete event for downstream consumers
    await this.kafkaProducer.emitTaskDeleted({ userId, taskId: id });

    // Invalidate user task list cache after deletion
    await this.cacheManager.del(`tasks:user:${userId}`);

    return {
      message: 'Task deleted successfully',
    };
  }
}
