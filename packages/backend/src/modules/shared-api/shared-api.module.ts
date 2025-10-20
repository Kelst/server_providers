import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SharedApiController } from './shared-api.controller';
import { ApiLoggingInterceptor } from '../../interceptors/api-logging.interceptor';

@Module({
  controllers: [SharedApiController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiLoggingInterceptor,
    },
  ],
})
export class SharedApiModule {}
