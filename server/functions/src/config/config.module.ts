import { Module } from '@nestjs/common';
import { PublicConfigController } from './config.controller';

@Module({
  controllers: [PublicConfigController],
})
export class PublicConfigModule {}
