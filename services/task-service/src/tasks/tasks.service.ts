import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskQueueService } from '../queue/task-queue.service';
import { CreateTaskDto, TaskStatus } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private taskQueue: TaskQueueService,
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

    // Publish task.created job to BullMQ
    await this.taskQueue.publishTaskCreated(userId, task.id, task.title);

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

    return {
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

    // Publish task.completed job if status changed to COMPLETED
    if (!wasCompleted && isNowCompleted) {
      await this.taskQueue.publishTaskCompleted(
        userId,
        updatedTask.id,
        updatedTask.title,
      );
    }

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

    return {
      message: 'Task deleted successfully',
    };
  }
}
