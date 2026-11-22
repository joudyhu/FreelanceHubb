import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, OfferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(freelancerId: number, dto: CreateOfferDto) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'OPEN') throw new BadRequestException('Offers are accepted only on open projects');
    if (project.clientId === freelancerId) throw new ForbiddenException('You cannot submit an offer to your own project');
    const freelancer = await this.prisma.user.findUnique({ where: { id: freelancerId } });
    if (freelancer?.role !== 'FREELANCER') throw new ForbiddenException('Only freelancers can submit offers');
    try {
      return await this.prisma.offer.create({
        data: { ...dto, freelancerId },
        include: { freelancer: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } },
      });
    } catch { throw new ConflictException('You have already submitted an offer for this project'); }
  }

  async mine(freelancerId: number) {
    return this.prisma.offer.findMany({
      where: { freelancerId }, orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, title: true, status: true, clientId: true } } },
    });
  }

  async forProject(projectId: number, clientId: number) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.clientId !== clientId) throw new ForbiddenException('You can only view offers on your own projects');
    return this.prisma.offer.findMany({
      where: { projectId }, orderBy: { createdAt: 'asc' },
      include: { freelancer: { select: { id: true, name: true, bio: true, avatarUrl: true, hourlyRate: true } } },
    });
  }

  async accept(offerId: number, clientId: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const offer = await tx.offer.findUnique({
          where: { id: offerId }, include: { project: true },
        });
        if (!offer) throw new NotFoundException('Offer not found');
        if (offer.project.clientId !== clientId) throw new ForbiddenException('Only the project owner can accept an offer');
        if (offer.project.status !== 'OPEN' || offer.status !== 'PENDING') {
          throw new BadRequestException('Project or offer is no longer available');
        }
        const wallet = await tx.wallet.findUnique({ where: { userId: clientId } });
        if (!wallet || Number(wallet.balance) < Number(offer.price)) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        // Conditional update prevents concurrent accept requests from spending the same funds.
        const debit = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: { gte: offer.price } },
          data: { balance: { decrement: offer.price }, escrow: { increment: offer.price } },
        });
        if (debit.count !== 1) throw new BadRequestException('Insufficient wallet balance');

        const updatedProject = await tx.project.updateMany({
          where: { id: offer.projectId, status: 'OPEN' },
          data: { status: 'IN_PROGRESS' },
        });
        if (updatedProject.count !== 1) throw new ConflictException('Project was already assigned');

        await tx.offer.update({ where: { id: offer.id }, data: { status: 'ACCEPTED', acceptedForProjectId: offer.projectId } });
        await tx.offer.updateMany({
          where: { projectId: offer.projectId, id: { not: offer.id }, status: 'PENDING' },
          data: { status: 'REJECTED' },
        });

        const after = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id, type: 'ESCROW_HOLD', amount: offer.price,
            balanceAfter: after.balance, escrowAfter: after.escrow,
            reference: `offer:${offer.id}`, description: 'Funds reserved for accepted project offer',
          },
        });
        await tx.notification.create({
          data: { userId: offer.freelancerId, title: 'Offer accepted', body: `Your offer for "${offer.project.title}" was accepted.`, data: { projectId: offer.projectId, offerId: offer.id } },
        });
        return { offerId: offer.id, projectId: offer.projectId, status: 'ACCEPTED', escrowAmount: offer.price };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Concurrent update detected. Please retry.');
      }
      throw error;
    }
  }

  async reject(offerId: number, clientId: number) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId }, include: { project: true } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.project.clientId !== clientId) throw new ForbiddenException('Only the project owner can reject offers');
    if (offer.status !== 'PENDING' || offer.project.status !== 'OPEN') throw new BadRequestException('Offer cannot be rejected');
    return this.prisma.offer.update({ where: { id: offerId }, data: { status: OfferStatus.REJECTED } });
  }
}
