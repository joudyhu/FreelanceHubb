import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  private cache: { expiresAt: number; data: any[] } | null = null;
  constructor(private readonly prisma: PrismaService) {}
  private slug(name: string) {
    return name.toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  async list() {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.data;
    const data = await this.prisma.category.findMany({
      where: { isActive: true }, orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, description: true },
    });
    this.cache = { data, expiresAt: Date.now() + 60_000 };
    return data;
  }
  async create(dto: CreateCategoryDto) {
    const slug = this.slug(dto.name);
    try {
      const result = await this.prisma.category.create({ data: { name: dto.name.trim(), slug, description: dto.description } });
      this.cache = null;
      return result;
    } catch { throw new ConflictException('Category name or slug already exists'); }
  }
  async update(id: number, dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Category not found');
    const result = await this.prisma.category.update({
      where: { id },
      data: { ...dto, ...(dto.name ? { name: dto.name.trim(), slug: this.slug(dto.name) } : {}) },
    });
    this.cache = null;
    return result;
  }
  async remove(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    const result = await this.prisma.category.update({ where: { id }, data: { isActive: false } });
    this.cache = null;
    return { id: result.id, isActive: result.isActive };
  }
}
