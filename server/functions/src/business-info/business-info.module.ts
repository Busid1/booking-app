import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessInfoController } from './business-info.controller';
import { BusinessInfoService } from './business-info.service';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessInfoController],
  providers: [BusinessInfoService],
})
export class BusinessInfoModule {}