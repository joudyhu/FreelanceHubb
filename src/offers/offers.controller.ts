import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Offers')
@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OffersController {
  constructor(private readonly service: OffersService) {}

  @Post()
  @Roles('FREELANCER')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOfferDto) { return this.service.create(user.id, dto); }

  @Get('mine')
  @Roles('FREELANCER')
  mine(@CurrentUser() user: AuthUser) { return this.service.mine(user.id); }

  @Get('project/:projectId')
  @Roles('CLIENT')
  forProject(@CurrentUser() user: AuthUser, @Param('projectId', ParseIntPipe) id: number) {
    return this.service.forProject(id, user.id);
  }

  @Post(':id/accept')
  @Roles('CLIENT')
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.service.accept(id, user.id); }

  @Post(':id/reject')
  @Roles('CLIENT')
  reject(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.service.reject(id, user.id); }
}
