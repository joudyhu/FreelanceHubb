import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Deliveries')
@Controller('deliveries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveriesController {
  constructor(private readonly service: DeliveriesService) {}

  @Post('projects/:projectId')
  @UseGuards(RolesGuard) @Roles('FREELANCER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: process.env.UPLOAD_DIR || 'uploads',
      filename: (_req, file, cb) => cb(null, `delivery-${Date.now()}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf' || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed'),
  }))
  submit(@CurrentUser() user: AuthUser, @Param('projectId', ParseIntPipe) projectId: number, @UploadedFile() file: Express.Multer.File, @Body('note') note?: string) {
    if (!file) throw new BadRequestException('A PDF or ZIP delivery file up to 20 MB is required');
    return this.service.submit(user.id, projectId, `/${process.env.UPLOAD_DIR || 'uploads'}/${file.filename}`, note);
  }

  @Get('projects/:projectId')
  list(@CurrentUser() user: AuthUser, @Param('projectId', ParseIntPipe) id: number) { return this.service.forProject(id, user.id); }

  @Post(':id/review')
  @UseGuards(RolesGuard) @Roles('CLIENT')
  review(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: { action: 'APPROVE' | 'REVISION'; note?: string }) {
    if (!['APPROVE', 'REVISION'].includes(body.action)) throw new BadRequestException('Action must be APPROVE or REVISION');
    return this.service.review(id, user.id, body.action, body.note);
  }
}
