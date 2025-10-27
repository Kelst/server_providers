import { Module } from '@nestjs/common';
import { MetricsGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  providers: [MetricsGateway, WebSocketService],
  exports: [MetricsGateway, WebSocketService],
})
export class WebSocketModule {}
