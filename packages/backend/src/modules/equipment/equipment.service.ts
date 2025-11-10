import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SnmpService } from './snmp.service';
import { SYSTEM_OIDS, BDCOM_PON_OIDS, ONU_STATUS } from './constants/bdcom-oids.constants';
import { BdcomSystemInfoDto, SnmpResponseDto, OnuStatusDto } from './dto';

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

  /**
   * Get BDCOM OLT system information
   */
  async getBdcomSystemInfo(host: string): Promise<BdcomSystemInfoDto> {
    try {
      this.logger.log(`Getting system info for BDCOM OLT: ${host}`);

      // Query all system OIDs in parallel
      const oids = [
        SYSTEM_OIDS.sysDescr,
        SYSTEM_OIDS.sysName,
        SYSTEM_OIDS.sysLocation,
        SYSTEM_OIDS.sysContact,
        SYSTEM_OIDS.sysUpTime,
        SYSTEM_OIDS.sysObjectID,
      ];

      const results = await this.snmpService.getMultiple(host, oids);

      // Map results to DTO
      const systemInfo: BdcomSystemInfoDto = {
        sysDescr: this.findValue(results, SYSTEM_OIDS.sysDescr, ''),
        sysName: this.findValue(results, SYSTEM_OIDS.sysName, ''),
        sysLocation: this.findValue(results, SYSTEM_OIDS.sysLocation, ''),
        sysContact: this.findValue(results, SYSTEM_OIDS.sysContact, ''),
        sysUpTime: this.findValue(results, SYSTEM_OIDS.sysUpTime, 0),
        sysObjectID: this.findValue(results, SYSTEM_OIDS.sysObjectID, ''),
      };

      return systemInfo;
    } catch (error) {
      this.logger.error(`Failed to get BDCOM system info for ${host}`, error);
      throw error;
    }
  }

  /**
   * Get BDCOM ONU status and optical power
   */
  async getBdcomOnuStatus(host: string, port: string): Promise<OnuStatusDto> {
    try {
      this.logger.log(`Getting ONU status for ${host} port ${port}`);

      // Parse port format: EPON0/8:15 -> slot=0, pon=8, onu=15
      const parsed = this.parsePonPort(port);
      if (!parsed) {
        throw new Error(`Invalid port format: ${port}. Expected format: EPON0/8:15`);
      }

      const { slot, pon, onu } = parsed;
      this.logger.log(`Parsed port: slot=${slot}, pon=${pon}, onu=${onu}`);

      // Find ONU ifIndex via SNMP WALK
      // Strategy: Walk the ONU table and find matching entry by logical port
      const ifIndex = await this.findOnuIfIndex(host, slot, pon, onu);

      if (!ifIndex) {
        throw new NotFoundException(
          `ONU not found on port ${port}. Device may be offline or port is invalid.`
        );
      }

      this.logger.log(`Found ONU ifIndex: ${ifIndex}`);

      // Query ONU data using ifIndex
      const oids = [
        `${BDCOM_PON_OIDS.onuStatus}.${ifIndex}`,
        `${BDCOM_PON_OIDS.onuRxPower}.${ifIndex}`,
        `${BDCOM_PON_OIDS.onuTxPower}.${ifIndex}`,
        `${BDCOM_PON_OIDS.onuDescription}.${ifIndex}`,
        `${BDCOM_PON_OIDS.onuMacAddress}.${ifIndex}`,
      ];

      const results = await this.snmpService.getMultiple(host, oids);

      // Parse results
      const statusValue = this.findValue<number>(results, `${BDCOM_PON_OIDS.onuStatus}.${ifIndex}`, 0);
      const rxPowerRaw = this.findValue<number | null>(results, `${BDCOM_PON_OIDS.onuRxPower}.${ifIndex}`, null);
      const txPowerRaw = this.findValue<number | null>(results, `${BDCOM_PON_OIDS.onuTxPower}.${ifIndex}`, null);
      const description = this.findValue<string>(results, `${BDCOM_PON_OIDS.onuDescription}.${ifIndex}`, '');
      const macRaw = this.findValue<any>(results, `${BDCOM_PON_OIDS.onuMacAddress}.${ifIndex}`, null);

      // Convert status to string
      let status: 'online' | 'offline' | 'unknown' = 'unknown';
      if (statusValue === ONU_STATUS.ONLINE) {
        status = 'online';
      } else if (statusValue === ONU_STATUS.OFFLINE) {
        status = 'offline';
      }

      // Convert optical power (dBm * 100 -> dBm)
      const rxPower = rxPowerRaw !== null ? Number(rxPowerRaw) / 100 : null;
      const txPower = txPowerRaw !== null ? Number(txPowerRaw) / 100 : null;

      // Format MAC address if present
      const macAddress = macRaw ? this.formatMacAddress(macRaw) : null;

      const onuStatus: OnuStatusDto = {
        port,
        status,
        rxPower,
        txPower,
        description: description || null,
        macAddress,
        ifIndex,
      };

      return onuStatus;
    } catch (error) {
      this.logger.error(`Failed to get ONU status for ${host} port ${port}`, error);
      throw error;
    }
  }

  /**
   * Parse PON port string (e.g., "EPON0/8:15")
   * Returns { slot, pon, onu } or null if invalid
   */
  private parsePonPort(port: string): { slot: number; pon: number; onu: number } | null {
    // Format: EPON{slot}/{pon}:{onu}
    // Example: EPON0/8:15
    const match = port.match(/^EPON(\d+)\/(\d+):(\d+)$/i);
    if (!match) {
      return null;
    }

    return {
      slot: parseInt(match[1], 10),
      pon: parseInt(match[2], 10),
      onu: parseInt(match[3], 10),
    };
  }

  /**
   * Find ONU ifIndex by searching interface description table
   * BDCOM OLT assigns sequential ifIndex numbers, so we search the IF-MIB ifName table
   * Strategy: Walk interface names and find matching port string
   */
  private async findOnuIfIndex(
    host: string,
    slot: number,
    pon: number,
    onu: number,
  ): Promise<number | null> {
    try {
      const targetPort = `EPON${slot}/${pon}:${onu}`;
      this.logger.log(`Searching for ifIndex of port: ${targetPort}`);

      // Strategy 1: Try to find base ifIndex for ONU #1 on this PON port
      // Then calculate target as: base + (onu - 1)
      const basePort = `EPON${slot}/${pon}:1`;
      const baseIfIndex = await this.findIfIndexByName(host, basePort);

      if (baseIfIndex) {
        const calculatedIfIndex = baseIfIndex + (onu - 1);
        this.logger.log(`Found base ifIndex ${baseIfIndex} for ${basePort}, calculated target: ${calculatedIfIndex}`);

        // Verify the calculated ifIndex works
        const testOid = `${BDCOM_PON_OIDS.onuStatus}.${calculatedIfIndex}`;
        try {
          const result = await this.snmpService.get(host, testOid);
          if (result && result.value !== null && result.value !== undefined) {
            this.logger.log(`Verified ifIndex ${calculatedIfIndex} for ${targetPort}`);
            return calculatedIfIndex;
          }
        } catch (error) {
          this.logger.debug(`Calculated ifIndex ${calculatedIfIndex} verification failed`);
        }
      }

      // Strategy 2: Direct search for target port if base calculation failed
      this.logger.log(`Attempting direct search for ${targetPort}`);
      const directIfIndex = await this.findIfIndexByName(host, targetPort);

      if (directIfIndex) {
        this.logger.log(`Found ifIndex ${directIfIndex} for ${targetPort} via direct search`);
        return directIfIndex;
      }

      this.logger.warn(`Could not find ifIndex for ${targetPort}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to find ONU ifIndex`, error);
      return null;
    }
  }

  /**
   * Find ifIndex by searching the ifName table using targeted range queries
   * Searches for the base ONU (#1) in narrow ranges, then tests adjacent indices
   */
  private async findIfIndexByName(
    host: string,
    portName: string,
  ): Promise<number | null> {
    try {
      // IF-MIB::ifName OID - contains interface names like "EPON0/8:15"
      const ifNameOid = '1.3.6.1.2.1.31.1.1.1.1';

      this.logger.debug(`Searching ifIndex for port: ${portName}`);

      // BDCOM assigns sequential ifIndex for ONUs on the same PON port
      // Strategy: Search narrow ranges where base ONU (#1) is likely located
      const searchRanges = [
        { start: 240, end: 280 },  // Most common range (includes 258 for EPON0/8:1)
        { start: 200, end: 240 },  // Lower range
        { start: 280, end: 350 },  // Higher range
        { start: 100, end: 200 },  // Extended lower
        { start: 350, end: 500 },  // Extended higher
      ];

      for (const range of searchRanges) {
        this.logger.debug(`Testing ifIndex range ${range.start}-${range.end} for ${portName}`);

        for (let ifIndex = range.start; ifIndex <= range.end; ifIndex++) {
          try {
            const oid = `${ifNameOid}.${ifIndex}`;
            const result = await this.snmpService.get(host, oid);

            if (result && result.value === portName) {
              this.logger.log(`Found ${portName} at ifIndex ${ifIndex}`);
              return ifIndex;
            }
          } catch (error) {
            // NoSuchInstance is expected - continue to next index
            continue;
          }
        }
      }

      this.logger.debug(`Port ${portName} not found in tested ranges`);
      return null;
    } catch (error) {
      this.logger.warn(`Failed to search ifName for ${portName}:`, error.message);
      return null;
    }
  }

  /**
   * Format MAC address from SNMP response
   */
  private formatMacAddress(raw: any): string | null {
    try {
      if (typeof raw === 'string') {
        // Already formatted
        if (raw.includes(':') || raw.includes('-')) {
          return raw;
        }
        // Raw hex string
        if (raw.length === 12) {
          return raw.match(/.{1,2}/g)?.join(':').toUpperCase() || null;
        }
      }

      // Buffer or array of bytes
      if (Buffer.isBuffer(raw) || Array.isArray(raw)) {
        const bytes = Buffer.isBuffer(raw) ? Array.from(raw) : raw;
        return bytes
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(':')
          .toUpperCase();
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to format MAC address:`, error);
      return null;
    }
  }

  /**
   * Helper: Find value in SNMP results by OID
   */
  private findValue<T>(
    results: Array<{ oid: string; value: any }>,
    oid: string,
    defaultValue: T,
  ): T {
    const result = results.find((r) => r.oid === oid);
    return result ? (result.value as T) : defaultValue;
  }
}
