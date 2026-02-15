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
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * POST /notifications/send
   * Create notification (internal service-to-service call)
   */
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  /**
   * GET /notifications
   * Get all notifications for current user
   */
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Request() req,
    @Query('unreadOnly') unreadOnly: string = 'false',
  ) {
    return this.notificationsService.findAll(
      req.user.userId,
      unreadOnly === 'true',
    );
  }

  /**
   * PATCH /notifications/:id/read
   * Mark notification as read
   */
  @Patch(':id/read')
  @UseGuards(AuthGuard('jwt'))
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  /**
   * DELETE /notifications/:id
   * Delete notification
   */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Request() req) {
    return this.notificationsService.remove(id, req.user.userId);
  }

  /**
   * GET /notifications/health
   * Health check endpoint
   */
  @Get('health')
  health() {
    return {
      service: 'notification-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
