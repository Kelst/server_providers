import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // В production змінити на конкретний origin
    credentials: true,
  },
  namespace: '/metrics',
})
export class MetricsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MetricsGateway.name);
  private connectedClients = new Map<string, Socket>();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    this.logger.log(`Client connected: ${client.id}`);
    this.logger.log(`Total clients: ${this.connectedClients.size}`);

    // Send welcome message
    client.emit('connected', {
      message: 'Connected to metrics stream',
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
    this.logger.log(`Total clients: ${this.connectedClients.size}`);
  }

  /**
   * Broadcast metrics to all connected clients
   */
  broadcastMetrics(metrics: any) {
    this.server.emit('metrics', metrics);
  }

  /**
   * Broadcast alert to all connected clients
   */
  broadcastAlert(alert: any) {
    this.server.emit('alert', alert);
    this.logger.log(`Alert broadcasted to ${this.connectedClients.size} clients`);
  }

  /**
   * Broadcast health status update
   */
  broadcastHealthUpdate(health: any) {
    this.server.emit('health', health);
  }

  /**
   * Broadcast anomaly detection
   */
  broadcastAnomaly(anomaly: any) {
    this.server.emit('anomaly', anomaly);
    this.logger.warn(`Anomaly detected and broadcasted: ${anomaly.type}`);
  }

  /**
   * Get number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
