import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: number, dto: CreateProjectDto, attachmentUrl?: string) {
    const category = await this.prisma.category.findFirst({ where: { id: dto.categoryId, isActive: true } });
    if (!category) throw new BadRequestException('Active category not found');
    return this.prisma.project.create({
      data: { ...dto, budget: dto.budget, clientId, attachmentUrl },
      include: { category: true, client: { select: { id: true, name: true } } },
    });
  }

  async list(query: PaginationDto & { categoryId?: number; search?: string }) {
    const page = Number(query.page || 1), limit = Number(query.limit || 20);
    const where: any = { status: 'OPEN' };
    if (query.categoryId) where.categoryId = Number(query.categoryId);
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    const orderBy: any = query.sort === 'oldest' ? { createdAt: 'asc' }
      : query.sort === 'budget_asc' ? { budget: 'asc' }
      : query.sort === 'budget_desc' ? { budget: 'desc' } : { createdAt: 'desc' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          client: { select: { id: true, name: true } },
          _count: { select: { offers: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async mine(clientId: number) {
    return this.prisma.project.findMany({
      where: { clientId }, orderBy: { createdAt: 'desc' },
      include: { category: true, _count: { select: { offers: true } } },
    });
  }

  async get(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        category: true, client: { select: { id: true, name: true } },
        _count: { select: { offers: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: number, clientId: number, dto: UpdateProjectDto, attachmentUrl?: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.clientId !== clientId) throw new ForbiddenException('You can only edit your own projects');
    if (project.status !== 'OPEN') throw new BadRequestException('Only open projects can be edited');
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({ where: { id: dto.categoryId, isActive: true } });
      if (!category) throw new BadRequestException('Active category not found');
    }
    return this.prisma.project.update({
      where: { id },
      data: { ...dto, ...(attachmentUrl ? { attachmentUrl } : {}) },
      include: { category: true },
    });
  }

  async remove(id: number, clientId: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.clientId !== clientId) throw new ForbiddenException('You can only delete your own projects');
    if (project.status !== 'OPEN') throw new BadRequestException('Only open projects can be deleted');
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted' };
  }
}
