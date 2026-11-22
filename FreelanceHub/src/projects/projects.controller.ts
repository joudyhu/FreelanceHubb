import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get() list(@Query() query: PaginationDto, @Query('categoryId') categoryId?: string, @Query('search') search?: string) {
    return this.service.list({ ...query, categoryId: categoryId ? Number(categoryId) : undefined, search });
  }
  @Get('mine')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  mine(@CurrentUser() user: AuthUser) { return this.service.mine(user.id); }

  @Get(':id') get(@Param('id', ParseIntPipe) id: number) { return this.service.get(id); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CLIENT') @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: process.env.UPLOAD_DIR || 'uploads',
      filename: (_req, file, cb) => cb(null, `project-${Date.now()}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype) || file.mimetype === 'application/pdf'),
  }))
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto, @UploadedFile() file?: Express.Multer.File) {
    if (file && !file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') throw new BadRequestException('Only images or PDF files are allowed');
    return this.service.create(user.id, dto, file ? `/${process.env.UPLOAD_DIR || 'uploads'}/${file.filename}` : undefined);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CLIENT') @ApiBearerAuth()
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CLIENT') @ApiBearerAuth()
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.service.remove(id, user.id); }
}
