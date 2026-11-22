import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async publicProfile(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'FREELANCER', status: 'ACTIVE' },
      select: { id: true, name: true, bio: true, avatarUrl: true, hourlyRate: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Freelancer not found');
    return user;
  }

  async updateProfile(id: number, dto: UpdateProfileDto, avatarUrl?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { ...dto, ...(avatarUrl ? { avatarUrl } : {}) },
      select: { id: true, name: true, email: true, role: true, bio: true, avatarUrl: true, hourlyRate: true },
    });
  }

  async listUsers(page = 1, limit = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip: (page - 1) * limit, take: limit,
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async setStatus(id: number, status: 'ACTIVE' | 'SUSPENDED') {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({ where: { id }, data: { status } });
    if (status === 'SUSPENDED') {
      await this.prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return { id: updated.id, status: updated.status };
  }
}
