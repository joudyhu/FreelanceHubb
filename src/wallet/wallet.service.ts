import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TopUpDto } from './dto/top-up.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: number) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async topUp(userId: number, dto: TopUpDto) {
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) throw new BadRequestException('Amount must be positive');
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      const updated = await tx.wallet.update({
        where: { id: wallet.id }, data: { balance: { increment: dto.amount } },
      });
      const entry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id, type: 'TOP_UP', amount: dto.amount,
          balanceAfter: updated.balance, escrowAfter: updated.escrow,
          description: 'Manual development top-up (no payment gateway connected)',
        },
      });
      return { wallet: updated, transaction: entry };
    });
  }

  async history(userId: number, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where: { walletId: wallet.id }, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ledgerEntry.count({ where: { walletId: wallet.id } }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
