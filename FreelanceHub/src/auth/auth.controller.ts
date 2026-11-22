import { Body, Controller, Headers, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a client or freelancer account' })
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login (limited to five attempts per minute per client)' })
  login(@Body() dto: LoginDto, @Headers('user-agent') agent: string, @Ip() ip: string) {
    return this.auth.login(dto, agent, ip);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logout(@CurrentUser() user: AuthUser) { return this.auth.logout(user.sid); }

  @Post('logout-others')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logoutOthers(@CurrentUser() user: AuthUser) { return this.auth.logoutOthers(user.id, user.sid); }
}
