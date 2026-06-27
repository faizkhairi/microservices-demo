import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/jwt.strategy';

export interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  channel: string;
  subject: string | null;
  message: string;
  read: boolean;
  createdAt: Date;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:4000',
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const userId = this.resolveUserId(client);

    if (!userId) {
      this.logger.warn(`Rejected WebSocket connection: ${client.id}`);
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    await client.join(this.userRoom(userId));
    client.emit('connected', { userId, socketId: client.id });
    this.logger.log(`Client ${client.id} joined room ${this.userRoom(userId)}`);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitToUser(userId: string, notification: NotificationPayload) {
    if (!this.server) {
      return;
    }

    this.server.to(this.userRoom(userId)).emit('notification', notification);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private resolveUserId(client: Socket): string | null {
    const token = this.extractToken(client);

    if (!token) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
      return payload.sub;
    } catch {
      return null;
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken.replace(/^Bearer\s+/i, '');
    }

    const authorization = client.handshake.headers.authorization;

    if (typeof authorization === 'string' && authorization.length > 0) {
      return authorization.replace(/^Bearer\s+/i, '');
    }

    const queryToken = client.handshake.query?.token;

    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    return null;
  }
}
