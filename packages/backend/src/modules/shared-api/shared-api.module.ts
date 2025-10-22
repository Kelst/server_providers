import { Module } from '@nestjs/common';
import { SharedApiController } from './shared-api.controller';

@Module({
  controllers: [SharedApiController],
})
export class SharedApiModule {}
