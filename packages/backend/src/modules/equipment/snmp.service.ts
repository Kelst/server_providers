import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as snmp from 'net-snmp';

/**
 * SNMP Service
 * Wrapper around net-snmp library for executing SNMP queries
 */
@Injectable()
export class SnmpService {
  private readonly logger = new Logger(SnmpService.name);
  private readonly defaultTimeout: number;
  private readonly defaultRetries: number;

  constructor(private configService: ConfigService) {
    this.defaultTimeout = this.configService.get<number>('equipment.snmp.timeout', 5000);
    this.defaultRetries = this.configService.get<number>('equipment.snmp.retries', 3);
  }

  /**
   * Execute SNMP GET request
   * @param host - Target device IP/hostname
   * @param oid - OID to query
   * @param options - SNMP options (community, port, version, timeout, retries)
   * @returns Promise with SNMP result
   */
  async get(
    host: string,
    oid: string,
    options?: {
      community?: string;
      port?: number;
      version?: string;
      timeout?: number;
      retries?: number;
    },
  ): Promise<{ oid: string; type: string; value: any }> {
    const community = options?.community || 'public';
    const port = options?.port || 161;
    const version = options?.version || 'v2c';
    const timeout = options?.timeout || this.defaultTimeout;
    const retries = options?.retries || this.defaultRetries;

    this.logger.debug(`SNMP GET: ${host}:${port} (${community}) - ${oid}`);

    return new Promise((resolve, reject) => {
      try {
        // Create SNMP session
        const snmpVersion = version === 'v1' ? snmp.Version1 : snmp.Version2c;
        const session = snmp.createSession(host, community, {
          port,
          version: snmpVersion,
          timeout,
          retries,
        });

        // Execute GET
        session.get([oid], (error, varbinds) => {
          session.close();

          if (error) {
            this.logger.error(`SNMP GET error for ${host}:${oid}`, error);
            reject(new Error(`SNMP error: ${error.message}`));
            return;
          }

          if (varbinds.length === 0) {
            reject(new Error('No data returned from SNMP query'));
            return;
          }

          const varbind = varbinds[0];

          // Check if result is an error
          if (snmp.isVarbindError(varbind)) {
            this.logger.error(`SNMP varbind error for ${host}:${oid}`, snmp.varbindError(varbind));
            reject(new Error(`SNMP varbind error: ${snmp.varbindError(varbind)}`));
            return;
          }

          // Parse value based on type
          const result = {
            oid: varbind.oid,
            type: this.getTypeName(varbind.type),
            value: this.parseValue(varbind),
          };

          this.logger.debug(`SNMP GET result: ${JSON.stringify(result)}`);
          resolve(result);
        });
      } catch (error) {
        this.logger.error(`SNMP session error for ${host}`, error);
        reject(error);
      }
    });
  }

  /**
   * Execute SNMP WALK (get all OIDs under a base OID)
   * @param host - Target device IP/hostname
   * @param baseOid - Base OID to walk
   * @param options - SNMP options
   * @returns Promise with array of SNMP results
   */
  async walk(
    host: string,
    baseOid: string,
    options?: {
      community?: string;
      port?: number;
      version?: string;
      timeout?: number;
      retries?: number;
    },
  ): Promise<Array<{ oid: string; type: string; value: any }>> {
    const community = options?.community || 'public';
    const port = options?.port || 161;
    const version = options?.version || 'v2c';
    const timeout = options?.timeout || this.defaultTimeout;
    const retries = options?.retries || this.defaultRetries;

    this.logger.debug(`SNMP WALK: ${host}:${port} (${community}) - ${baseOid}`);

    return new Promise((resolve, reject) => {
      try {
        const results: Array<{ oid: string; type: string; value: any }> = [];
        const snmpVersion = version === 'v1' ? snmp.Version1 : snmp.Version2c;
        const session = snmp.createSession(host, community, {
          port,
          version: snmpVersion,
          timeout,
          retries,
        });

        // Execute WALK
        session.walk(
          baseOid,
          20, // maxRepetitions
          (varbinds) => {
            // Called for each batch of varbinds
            varbinds.forEach((varbind) => {
              if (!snmp.isVarbindError(varbind)) {
                results.push({
                  oid: varbind.oid,
                  type: this.getTypeName(varbind.type),
                  value: this.parseValue(varbind),
                });
              }
            });
          },
          (error) => {
            // Called when walk is complete or error occurs
            session.close();

            if (error) {
              this.logger.error(`SNMP WALK error for ${host}:${baseOid}`, error);
              reject(new Error(`SNMP walk error: ${error.message}`));
              return;
            }

            this.logger.debug(`SNMP WALK complete: ${results.length} results`);
            resolve(results);
          },
        );
      } catch (error) {
        this.logger.error(`SNMP session error for ${host}`, error);
        reject(error);
      }
    });
  }

  /**
   * Execute multiple SNMP GET requests in parallel
   * @param host - Target device IP/hostname
   * @param oids - Array of OIDs to query
   * @param options - SNMP options
   * @returns Promise with array of SNMP results
   */
  async getMultiple(
    host: string,
    oids: string[],
    options?: {
      community?: string;
      port?: number;
      version?: string;
      timeout?: number;
      retries?: number;
    },
  ): Promise<Array<{ oid: string; type: string; value: any }>> {
    const community = options?.community || 'public';
    const port = options?.port || 161;
    const version = options?.version || 'v2c';
    const timeout = options?.timeout || this.defaultTimeout;
    const retries = options?.retries || this.defaultRetries;

    this.logger.debug(`SNMP GET Multiple: ${host}:${port} (${community}) - ${oids.length} OIDs`);

    return new Promise((resolve, reject) => {
      try {
        const snmpVersion = version === 'v1' ? snmp.Version1 : snmp.Version2c;
        const session = snmp.createSession(host, community, {
          port,
          version: snmpVersion,
          timeout,
          retries,
        });

        session.get(oids, (error, varbinds) => {
          session.close();

          if (error) {
            this.logger.error(`SNMP GET Multiple error for ${host}`, error);
            reject(new Error(`SNMP error: ${error.message}`));
            return;
          }

          const results = varbinds
            .filter((varbind) => !snmp.isVarbindError(varbind))
            .map((varbind) => ({
              oid: varbind.oid,
              type: this.getTypeName(varbind.type),
              value: this.parseValue(varbind),
            }));

          this.logger.debug(`SNMP GET Multiple complete: ${results.length} results`);
          resolve(results);
        });
      } catch (error) {
        this.logger.error(`SNMP session error for ${host}`, error);
        reject(error);
      }
    });
  }

  /**
   * Get human-readable type name
   */
  private getTypeName(type: number): string {
    const types: Record<number, string> = {
      2: 'Integer',
      4: 'OctetString',
      5: 'Null',
      6: 'ObjectIdentifier',
      64: 'IpAddress',
      65: 'Counter',
      66: 'Gauge',
      67: 'TimeTicks',
      68: 'Opaque',
      70: 'Counter64',
    };
    return types[type] || `Unknown(${type})`;
  }

  /**
   * Parse SNMP value based on type
   */
  private parseValue(varbind: any): any {
    // OctetString - convert Buffer to string
    if (varbind.type === 4) {
      if (Buffer.isBuffer(varbind.value)) {
        return varbind.value.toString('utf8');
      }
      return varbind.value;
    }

    // TimeTicks - convert to seconds
    if (varbind.type === 67) {
      return Math.floor(varbind.value / 100); // TimeTicks are in 1/100th of a second
    }

    // IpAddress - convert to string
    if (varbind.type === 64) {
      if (Buffer.isBuffer(varbind.value)) {
        return Array.from(varbind.value).join('.');
      }
      return varbind.value;
    }

    // For all other types, return as-is
    return varbind.value;
  }
}
