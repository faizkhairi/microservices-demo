import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  /**
   * Send task created email
   */
  async sendTaskCreatedEmail(
    toEmail: string,
    userName: string,
    taskTitle: string,
  ) {
    const template = this.loadTemplate('task-created.hbs');
    const html = template({
      userName,
      taskTitle,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@microservices-demo.local',
      to: toEmail,
      subject: '✅ New Task Created',
      html,
    });

    console.log(`📧 Sent task created email to ${toEmail}`);
  }

  /**
   * Send task completed email
   */
  async sendTaskCompletedEmail(
    toEmail: string,
    userName: string,
    taskTitle: string,
  ) {
    const template = this.loadTemplate('task-completed.hbs');
    const html = template({
      userName,
      taskTitle,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@microservices-demo.local',
      to: toEmail,
      subject: '🎉 Task Completed!',
      html,
    });

    console.log(`📧 Sent task completed email to ${toEmail}`);
  }

  /**
   * Load Handlebars email template
   */
  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    const templatePath = path.join(__dirname, 'templates', templateName);
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    return Handlebars.compile(templateContent);
  }
}
