import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateNotificationDto,
  NotificationChannel,
} from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create a notification (called by Queue Worker or other services)
   */
  async create(createNotificationDto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: createNotificationDto,
    });

    // If email channel, send email
    if (createNotificationDto.channel === NotificationChannel.EMAIL) {
      // Note: We don't have the user's email here, this is simplified
      // In production, you'd query the Auth Service or have email in DTO
      console.log('📧 Email notification triggered:', notification.id);
    }

    return notification;
  }

  /**
   * Get all notifications for a user
   */
  async findAll(userId: string, unreadOnly: boolean = false) {
    const where: any = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You can only mark your own notifications');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  /**
   * Delete notification
   */
  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You can only delete your own notifications');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return {
      message: 'Notification deleted successfully',
    };
  }
}
