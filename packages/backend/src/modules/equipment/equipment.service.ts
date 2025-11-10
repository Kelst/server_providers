import { Injectable, Logger } from '@nestjs/common';
import { SnmpService } from './snmp.service';
import { SnmpResponseDto } from './dto';

/**
 * Equipment Service
 * Business logic for querying network equipment via SNMP
 */
@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(private snmpService: SnmpService) {}

  /**
   * Execute raw SNMP GET query
   */
  async querySnmp(host: string, oid: string): Promise<SnmpResponseDto> {
    try {
      const result = await this.snmpService.get(host, oid);
      return result;
    } catch (error) {
      this.logger.error(`Failed to query SNMP ${host}:${oid}`, error);
      throw error;
    }
  }
}
