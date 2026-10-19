import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PushService } from './push.service';
import { PushSubscribeDto, PushUnsubscribeDto } from '../dto/push.dto';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { GetUser } from '../auth/get-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { rateLimit } from '../common/rate-limit';
import { clientIp } from '../common/client-ip';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('subscribe')
  @UseGuards(OptionalJwtGuard)
  subscribe(@Body() dto: PushSubscribeDto, @GetUser() user: AuthUser | undefined, @Req() req: Request) {
    rateLimit(`push:${clientIp(req)}`, 30, 60 * 60_000);
    return this.push.subscribe(dto, user?.id);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() dto: PushUnsubscribeDto) {
    return this.push.unsubscribe(dto.endpoint);
  }
}
