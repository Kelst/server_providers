import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertRulesController } from './alert-rules.controller';
import { DatabaseModule } from '../database/database.module';
import { HealthModule } from '../health/health.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SettingsModule } from '../settings/settings.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AnalyticsModule,
    SettingsModule,
    WebSocketModule,
  ],
  controllers: [AlertsController, AlertRulesController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
