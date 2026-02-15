import {
  Controller,
  Get,
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
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * GET /users/:id
   * Get user profile by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * PATCH /users/:id
   * Update user profile (owner only)
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, req.user.userId, updateUserDto);
  }

  /**
   * GET /users
   * List all users with pagination
   */
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.usersService.findAll(parseInt(page), parseInt(limit));
  }

  /**
   * DELETE /users/:id
   * Delete user profile (owner only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user.userId);
  }

  /**
   * GET /users/health
   * Health check endpoint
   */
  @Get('health')
  health() {
    return {
      service: 'user-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
