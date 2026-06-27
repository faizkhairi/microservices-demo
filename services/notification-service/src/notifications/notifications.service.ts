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
import { NotificationsGateway } from '../realtime/notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsGateway: NotificationsGateway,
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

    this.pushRealtime(notification.userId, notification);

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
   * Create notification from a Kafka event (internal, no auth required)
   */
  async createFromKafkaEvent(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        subject: data.title,
        message: data.message,
        channel: NotificationChannel.IN_APP,
      },
    });

    this.pushRealtime(notification.userId, notification);

    return notification;
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

  private pushRealtime(
    userId: string,
    notification: {
      id: string;
      userId: string;
      type: string;
      channel: string;
      subject: string | null;
      message: string;
      read: boolean;
      createdAt: Date;
    },
  ) {
    this.notificationsGateway.emitToUser(userId, notification);
  }
}
