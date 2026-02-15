import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto, TaskStatus } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private tasksService: TasksService) {}

  /**
   * POST /tasks
   * Create a new task
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(req.user.userId, createTaskDto);
  }

  /**
   * GET /tasks
   * Get all tasks for current user with filtering
   */
  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: TaskStatus,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.tasksService.findAll(
      req.user.userId,
      status,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * GET /tasks/:id
   * Get a single task by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.tasksService.findOne(id, req.user.userId);
  }

  /**
   * PATCH /tasks/:id
   * Update a task
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, req.user.userId, updateTaskDto);
  }

  /**
   * DELETE /tasks/:id
   * Delete a task
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Request() req) {
    return this.tasksService.remove(id, req.user.userId);
  }

  /**
   * GET /tasks/health
   * Health check endpoint
   */
  @Get('health')
  health() {
    return {
      service: 'task-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
