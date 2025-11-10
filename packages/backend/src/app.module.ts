import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from './modules/database/database.module';
import { CacheModule } from './common/modules/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SecurityModule } from './modules/security/security.module';
import { SharedApiModule } from './modules/shared-api/shared-api.module';
import { BillingModule } from './modules/billing/billing.module';
import { UsersideModule } from './modules/userside/userside.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { HealthModule } from './modules/health/health.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { CommonModule } from './common/common.module';
import { ApiLoggingInterceptor } from './interceptors/api-logging.interceptor';
import { RequestTimeoutInterceptor } from './interceptors/request-timeout.interceptor';
import { ConfigurableThrottlerGuard } from './guards/configurable-throttler.guard';

import configuration from './config/configuration';
import validationSchema from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CacheModule, // Global cache service for Redis caching
    CommonModule,
    AuthModule,
    TokensModule,
    AnalyticsModule,
    SecurityModule,
    SharedApiModule,
    BillingModule,
    UsersideModule,
    EquipmentModule,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTimeoutInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ConfigurableThrottlerGuard,
    },
  ],
})
export class AppModule {}
