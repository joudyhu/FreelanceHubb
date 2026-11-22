import {
  ConflictException, Injectable, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email is already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(), email, passwordHash, role: dto.role,
        wallet: { create: {} },
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return user;
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== 'ACTIVE') throw new ForbiddenException('Account is suspended');
    const session = await this.prisma.session.create({
      data: {
        userId: user.id, refreshTokenHash: 'pending', userAgent, ipAddress,
        expiresAt: new Date(Date.now() + Number(this.config.get('JWT_REFRESH_TTL_DAYS', 7)) * 86400000),
      },
    });
    const tokens = await this.issueTokens(user.id, user.email, user.role, session.id);
    await this.prisma.session.update({
      where: { id: session.id }, data: { refreshTokenHash: this.hash(tokens.refreshToken) },
    });
    return { ...tokens, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }

  private async issueTokens(userId: number, email: string, role: string, sid: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role, sid },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_TTL', '15m') },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, sid, jti: randomUUID() },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: `${this.config.get('JWT_REFRESH_TTL_DAYS', 7)}d` },
    );
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.config.get('JWT_REFRESH_SECRET') });
    } catch { throw new UnauthorizedException('Invalid refresh token'); }

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }
    if (session.refreshTokenHash !== this.hash(refreshToken)) {
      await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token reuse detected; session revoked');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Account unavailable');
    const tokens = await this.issueTokens(user.id, user.email, user.role, session.id);
    await this.prisma.session.update({
      where: { id: session.id }, data: { refreshTokenHash: this.hash(tokens.refreshToken) },
    });
    return tokens;
  }

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  async logoutOthers(userId: number, currentSessionId: string) {
    const result = await this.prisma.session.updateMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revokedSessions: result.count };
  }

  async sessions(userId: number) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
