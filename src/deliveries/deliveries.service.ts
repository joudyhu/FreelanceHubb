import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(freelancerId: number, projectId: number, fileUrl: string, note?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'IN_PROGRESS') throw new BadRequestException('Project is not in progress');
    const offer = await this.prisma.offer.findFirst({ where: { projectId, freelancerId, status: 'ACCEPTED' } });
    if (!offer) throw new ForbiddenException('Only the selected freelancer can submit delivery');
    return this.prisma.delivery.create({
      data: { projectId, offerId: offer.id, freelancerId, fileUrl, note },
    });
  }

  async forProject(projectId: number, userId: number) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    const isClient = project.clientId === userId;
    const isFreelancer = await this.prisma.offer.findFirst({ where: { projectId, freelancerId: userId, status: 'ACCEPTED' } });
    if (!isClient && !isFreelancer) throw new ForbiddenException('You cannot view these deliveries');
    return this.prisma.delivery.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  }

  async review(deliveryId: number, clientId: number, action: 'APPROVE' | 'REVISION', note?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const delivery = await tx.delivery.findUnique({
          where: { id: deliveryId },
          include: { project: true, offer: true },
        });
        if (!delivery) throw new NotFoundException('Delivery not found');
        if (delivery.project.clientId !== clientId) throw new ForbiddenException('Only the project owner can review delivery');
        if (delivery.project.status !== 'IN_PROGRESS' || delivery.status !== 'SUBMITTED') {
          throw new BadRequestException('Delivery is not awaiting review');
        }
        if (action === 'REVISION') {
          return tx.delivery.update({
            where: { id: deliveryId },
            data: { status: DeliveryStatus.REVISION_REQUESTED, note: note || delivery.note, reviewedAt: new Date() },
          });
        }

        const amount = delivery.offer.price;
        const commissionPercent = Number(process.env.PLATFORM_COMMISSION_PERCENT || 10);
        const fee = new Prisma.Decimal(amount).mul(commissionPercent).div(100).toDecimalPlaces(2);
        const payout = new Prisma.Decimal(amount).minus(fee);
        const clientWallet = await tx.wallet.findUnique({ where: { userId: clientId } });
        const freelancerWallet = await tx.wallet.findUnique({ where: { userId: delivery.freelancerId } });
        if (!clientWallet || !freelancerWallet || clientWallet.escrow.lessThan(amount)) {
          throw new ConflictException('Escrow funds are inconsistent; contact platform support');
        }

        await tx.wallet.update({
          where: { id: clientWallet.id }, data: { escrow: { decrement: amount } },
        });
        const freelancerAfter = await tx.wallet.update({
          where: { id: freelancerWallet.id }, data: { balance: { increment: payout } },
        });
        await tx.ledgerEntry.create({
          data: {
            walletId: freelancerWallet.id, type: 'ESCROW_RELEASE', amount: payout,
            balanceAfter: freelancerAfter.balance, escrowAfter: freelancerAfter.escrow,
            reference: `delivery:${deliveryId}`, description: 'Freelancer payout after client approval',
          },
        });
        const platformFeeEntry = await tx.ledgerEntry.create({
          data: {
            walletId: clientWallet.id, type: 'PLATFORM_FEE', amount: fee,
            balanceAfter: clientWallet.balance, escrowAfter: clientWallet.escrow.minus(amount),
            reference: `delivery:${deliveryId}`, description: 'Platform commission (10%)',
          },
        });
        const approved = await tx.delivery.update({
          where: { id: deliveryId }, data: { status: DeliveryStatus.APPROVED, reviewedAt: new Date() },
        });
        await tx.project.update({ where: { id: delivery.projectId }, data: { status: 'COMPLETED' } });
        await tx.notification.create({
          data: { userId: delivery.freelancerId, title: 'Delivery approved', body: `Your delivery was approved. Net payout: ${payout.toString()}.`, data: { projectId: delivery.projectId, deliveryId } },
        });
        return { delivery: approved, payout, platformFee: fee, ledgerEntryId: platformFeeEntry.id };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Concurrent review detected. Please retry.');
      }
      throw error;
    }
  }
}
