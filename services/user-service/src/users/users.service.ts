import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user profile by userId
   */
  async findOne(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Auto-create profile if doesn't exist (first-time user)
      return this.createProfile(userId);
    }

    return profile;
  }

  /**
   * Update user profile
   */
  async update(userId: string, currentUserId: string, updateUserDto: UpdateUserDto) {
    // Check ownership
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Check if profile exists
    let profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create profile if doesn't exist
      profile = await this.createProfile(userId);
    }

    // Update profile
    return this.prisma.userProfile.update({
      where: { userId },
      data: updateUserDto,
    });
  }

  /**
   * Get all users (paginated)
   */
  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      this.prisma.userProfile.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userProfile.count(),
    ]);

    return {
      data: profiles,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete user profile (soft delete)
   */
  async remove(userId: string, currentUserId: string) {
    // Check ownership (or admin role - future enhancement)
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own profile');
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    await this.prisma.userProfile.delete({
      where: { userId },
    });

    return {
      message: 'Profile deleted successfully',
    };
  }

  /**
   * Create user profile (auto-called on first access)
   */
  private async createProfile(userId: string) {
    return this.prisma.userProfile.create({
      data: {
        userId,
      },
    });
  }
}
