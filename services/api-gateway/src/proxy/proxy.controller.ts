import {
  All,
  Controller,
  Param,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Controller()
export class ProxyController {
  constructor(private readonly httpService: HttpService) {}

  @All('api/auth/*path')
  async proxyAuth(
    @Param('path') path: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.forward(
      process.env.AUTH_SERVICE_URL || 'http://auth-service:4001',
      'auth',
      path,
      req,
      res,
    );
  }

  @All('api/users/*path')
  async proxyUsers(
    @Param('path') path: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.forward(
      process.env.USER_SERVICE_URL || 'http://user-service:4002',
      'users',
      path,
      req,
      res,
    );
  }

  @All('api/tasks/*path')
  async proxyTasks(
    @Param('path') path: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.forward(
      process.env.TASK_SERVICE_URL || 'http://task-service:4003',
      'tasks',
      path,
      req,
      res,
    );
  }

  @All('api/notifications/*path')
  async proxyNotifications(
    @Param('path') path: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.forward(
      process.env.NOTIFICATION_SERVICE_URL ||
        'http://notification-service:4004',
      'notifications',
      path,
      req,
      res,
    );
  }

  private async forward(
    serviceUrl: string,
    prefix: string,
    path: string,
    req: Request,
    res: Response,
  ) {
    const targetUrl = `${serviceUrl}/api/${prefix}/${path}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;

    // Strip hop-by-hop headers before forwarding
    const { host, connection, 'transfer-encoding': te, ...forwardHeaders } = req.headers as Record<string, string>;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method,
          url: targetUrl,
          headers: forwardHeaders,
          data: req.body,
          validateStatus: () => true, // pass all status codes through
        }),
      );

      res.status(response.status).json(response.data);
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response) {
        res.status(axiosErr.response.status).json(axiosErr.response.data);
      } else {
        throw new HttpException(
          'Service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }
  }
}
