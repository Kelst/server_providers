import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SecurityModule } from './modules/security/security.module';
import { SharedApiModule } from './modules/shared-api/shared-api.module';
import { BillingModule } from './modules/billing/billing.module';
import { HealthModule } from './modules/health/health.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { CommonModule } from './common/common.module';
import { ApiLoggingInterceptor } from './interceptors/api-logging.interceptor';

import configuration from './config/configuration';
import validationSchema from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CommonModule,
    AuthModule,
    TokensModule,
    AnalyticsModule,
    SecurityModule,
    SharedApiModule,
    BillingModule,
    HealthModule,
    WebSocketModule,
    SettingsModule,
    AlertsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiLoggingInterceptor,
    },
  ],
})
export class AppModule {}
