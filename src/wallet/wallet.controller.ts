import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TopUpDto } from './dto/top-up.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly service: WalletService) {}
  @Get() get(@CurrentUser() user: AuthUser) { return this.service.get(user.id); }
  @Post('top-up')
  @UseGuards(RolesGuard)
  @Roles('CLIENT')
  topUp(@CurrentUser() user: AuthUser, @Body() dto: TopUpDto) { return this.service.topUp(user.id, dto); }
  @Get('transactions')
  history(@CurrentUser() user: AuthUser, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.history(user.id, Math.max(1, Number(page)), Math.min(100, Math.max(1, Number(limit))));
  }
}
