import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from '../dto/review.dto';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { AdminOnly } from '../auth/admin.guard';
import { GetUser } from '../auth/get-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { rateLimit } from '../common/rate-limit';
import { clientIp } from '../common/client-ip';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  findPublic() {
    return this.reviews.findPublic();
  }

  @Get('all')
  @AdminOnly()
  findAll() {
    return this.reviews.findAll();
  }

  @Post()
  @UseGuards(OptionalJwtGuard)
  create(@Body() dto: CreateReviewDto, @GetUser() user: AuthUser | undefined, @Req() req: Request) {
    rateLimit(`review:${clientIp(req)}`, 10, 60 * 60_000);
    return this.reviews.create(dto, user);
  }

  @Patch(':id')
  @AdminOnly()
  update(@Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.reviews.setVisible(id, dto.visible);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id') id: string) {
    return this.reviews.remove(id);
  }
}
