import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { CurrentUser } from '../common/types/current-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getCurrentUserProfile(currentUser: CurrentUser): Promise<UserProfileDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: currentUser.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toUserProfile(user);
  }

  private toUserProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
