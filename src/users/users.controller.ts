import { Controller, Get, Param, ParseIntPipe, Patch, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('freelancers/:id')
  profile(@Param('id', ParseIntPipe) id: number) { return this.users.publicProfile(id); }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Patch('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: process.env.UPLOAD_DIR || 'uploads',
      filename: (_req, file, cb) => cb(null, `avatar-${Date.now()}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
  }))
  avatar(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('A valid image (JPEG, PNG or WebP) up to 2 MB is required');
    return this.users.updateProfile(user.id, {}, `/${process.env.UPLOAD_DIR || 'uploads'}/${file.filename}`);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  list(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.users.listUsers(Math.max(1, Number(page)), Math.min(100, Math.max(1, Number(limit))));
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  setStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: 'ACTIVE' | 'SUSPENDED') {
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) throw new BadRequestException('Invalid status');
    return this.users.setStatus(id, status);
  }
}
