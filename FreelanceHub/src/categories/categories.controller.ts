import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}
  @Get() list() { return this.service.list(); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  create(@Body() dto: CreateCategoryDto) { return this.service.create(dto); }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
