import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { MySQLService } from './mysql.service';
import { CompanyService } from './company.service';
import { UserDataService } from './user-data.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionReloadProcessor } from './processors/session-reload.processor';

@Module({
  imports: [
    AuthModule, // Import AuthModule for ApiTokenGuard
    NotificationsModule, // Import NotificationsModule for phone change SMS
    // Configure Bull Queue for session reload
    BullModule.registerQueueAsync({
      name: 'session-reload',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    MySQLService,
    CompanyService,
    UserDataService,
    SessionReloadProcessor, // Queue processor
  ],
  exports: [
    BillingService,
    MySQLService,
    CompanyService,
    UserDataService,
  ],
})
export class BillingModule {}
