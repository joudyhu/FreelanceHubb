import { Controller, Get, Patch, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
  @Patch(':id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() },
    });
    return { updated: result.count === 1 };
  }
}
