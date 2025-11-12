import { Injectable, Logger } from '@nestjs/common';
import { SnmpService } from './snmp.service';
import { TelnetService } from './telnet.service';
import { VendorFactory, OltVendorType } from './vendors/vendor.factory';
import { PrismaService } from '../database/prisma.service';
import {
  SnmpResponseDto,
  TelnetExecuteDto,
  TelnetResponseDto,
  RawCommandResponseDto,
  OnuStatusRequestDto,
  OnuStatusResponseDto,
  SignalLevelRequestDto,
  SignalLevelResponseDto,
} from './dto';

/**
 * Equipment Service
 * Business logic for querying network equipment via SNMP and Telnet
 */
@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    private snmpService: SnmpService,
    private telnetService: TelnetService,
    private vendorFactory: VendorFactory,
    private prisma: PrismaService
  ) {}

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
   * Execute raw telnet command
   *
   * @param dto - Telnet execute DTO
   * @param tokenId - API token ID for logging
   * @returns Command result
   */
  async executeTelnetCommand(
    dto: TelnetExecuteDto,
    tokenId: string
  ): Promise<TelnetResponseDto<RawCommandResponseDto>> {
    const startTime = Date.now();

    try {
      const result = await this.telnetService.executeCommand(
        {
          host: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
        },
        dto.command,
        dto.timeout
      );

      const executionTime = Date.now() - startTime;

      // Log command execution to database (don't await - fire and forget)
      this.logTelnetCommand(
        tokenId,
        dto.ip,
        dto.username,
        dto.command,
        result.output,
        result.success ? 'SUCCESS' : 'FAILED',
        result.error,
        executionTime
      ).catch((error) => {
        this.logger.error('Failed to log telnet command:', error);
      });

      return {
        success: result.success,
        data: result.success
          ? {
              output: result.output,
              command: dto.command,
              deviceIp: dto.ip,
            }
          : undefined,
        executionTime,
        timestamp: new Date().toISOString(),
        error: result.error,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log failed command
      this.logTelnetCommand(
        tokenId,
        dto.ip,
        dto.username,
        dto.command,
        '',
        'FAILED',
        error.message,
        executionTime
      ).catch((logError) => {
        this.logger.error('Failed to log telnet command:', logError);
      });

      return {
        success: false,
        executionTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Parse EPON interface string to port and ONU ID
   * Examples: "epon0/1:2" -> {port: "0/1", onuId: "2"}
   *           "0/1:2" -> {port: "0/1", onuId: "2"}
   */
  private parseEponInterface(interfaceStr: string): { port: string; onuId: string } {
    // Remove "epon" prefix if present (case-insensitive)
    const normalized = interfaceStr.replace(/^epon/i, '');

    // Split by colon
    const parts = normalized.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid EPON interface format: ${interfaceStr}. Expected format: "epon0/1:2" or "0/1:2"`);
    }

    return {
      port: parts[0].trim(),
      onuId: parts[1].trim(),
    };
  }

  /**
   * Get ONU status using vendor-specific commands
   *
   * Enhanced implementation with multi-command flow:
   * 1. Execute main command: show epon onu-information (basic ONU info)
   * 2. Based on status, execute secondary command:
   *    - Online: show epon active-onu (distance, OAM status, alive time)
   *    - Offline: show epon inactive-onu (last reg/dereg times, absent time)
   * 3. Merge all data and return comprehensive ONU status
   *
   * Uses connection pooling for efficient resource usage.
   */
  async getOnuStatus(
    dto: OnuStatusRequestDto,
    tokenId: string
  ): Promise<TelnetResponseDto<OnuStatusResponseDto>> {
    const startTime = Date.now();

    try {
      // Parse interface parameter
      const { port, onuId } = this.parseEponInterface(dto.interface);

      // Get vendor implementation
      const vendor = this.vendorFactory.getVendor(dto.vendorType || 'bdcom');

      // Get command for this vendor (returns full command, e.g., "show epon onu-information interface ePON 0/8 15")
      const fullCommand = vendor.getOnuStatusCommand(port, onuId);

      // Extract just the main command (remove "enable\n" prefix if present)
      const mainCommand = fullCommand.split('\n').filter(cmd => cmd.trim() && !cmd.trim().toLowerCase().startsWith('enable')).join('');

      this.logger.debug(`Executing ONU status command for ${dto.interface}: ${mainCommand}`);

      // Execute command using optimized sequential flow
      // This automatically handles: login → password → enable → command → wait 500ms
      const result = await this.telnetService.executeSequentialCommands(
        {
          host: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
        },
        mainCommand,
        {
          enableMode: true,           // Auto-execute enable before command
          finalCommandDelay: 0,       // No delay after command (optimized for speed)
        }
      );

      const executionTime = Date.now() - startTime;

      // Log command execution (fire and forget)
      this.logTelnetCommand(
        tokenId,
        dto.ip,
        dto.username,
        mainCommand,
        result.output,
        result.success ? 'SUCCESS' : 'FAILED',
        result.error,
        executionTime
      ).catch((error) => {
        this.logger.error('Failed to log telnet command:', error);
      });

      // Check if command execution failed
      if (!result.success) {
        return {
          success: false,
          executionTime,
          timestamp: new Date().toISOString(),
          error: result.error || 'Command execution failed',
        };
      }

      // Parse output using vendor parser
      const parsed = vendor.parseOnuStatus(result.output);

      // Debug: log parsed data
      this.logger.debug(`Parsed data keys: ${JSON.stringify(Object.keys(parsed))}`);
      this.logger.debug(`Parsed port=${parsed.port}, onuId=${parsed.onuId}, status=${parsed.status}`);

      // Check if parsing detected "ONU not found"
      if (parsed.error) {
        return {
          success: false,
          executionTime,
          timestamp: new Date().toISOString(),
          error: parsed.error,
        };
      }

      // Step 2: Execute secondary command based on status (active-onu or inactive-onu)
      // to get additional details like Distance, OAM Status, Last Reg/Dereg times, Alive time
      if (parsed.status === 'online' && vendor.getActiveOnuCommand) {
        this.logger.debug(`ONU is online, fetching active-onu details...`);
        try {
          const activeCommand = vendor.getActiveOnuCommand(port, onuId);
          const activeMainCommand = activeCommand.split('\n').filter(cmd => cmd.trim() && !cmd.trim().toLowerCase().startsWith('enable')).join('');

          const activeResult = await this.telnetService.executeSequentialCommands(
            {
              host: dto.ip,
              username: dto.username,
              password: dto.password,
              port: dto.port,
            },
            activeMainCommand,
            {
              enableMode: true,
              finalCommandDelay: 0,
            }
          );

          if (activeResult.success && vendor.parseActiveOnu) {
            const activeData = vendor.parseActiveOnu(activeResult.output);
            // Merge active-onu data into parsed data
            Object.assign(parsed, activeData);
            this.logger.debug(`Active ONU data merged: distance=${activeData.distance}, oamStatus=${activeData.oamStatus}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch active ONU details: ${error.message}`);
          // Don't fail the whole request, continue with basic data
        }
      } else if (parsed.status === 'offline' && vendor.getInactiveOnuCommand) {
        this.logger.debug(`ONU is offline, fetching inactive-onu details...`);
        try {
          const inactiveCommand = vendor.getInactiveOnuCommand(port, onuId);
          const inactiveMainCommand = inactiveCommand.split('\n').filter(cmd => cmd.trim() && !cmd.trim().toLowerCase().startsWith('enable')).join('');

          const inactiveResult = await this.telnetService.executeSequentialCommands(
            {
              host: dto.ip,
              username: dto.username,
              password: dto.password,
              port: dto.port,
            },
            inactiveMainCommand,
            {
              enableMode: true,
              finalCommandDelay: 0,
            }
          );

          if (inactiveResult.success && vendor.parseInactiveOnu) {
            const inactiveData = vendor.parseInactiveOnu(inactiveResult.output);
            // Merge inactive-onu data into parsed data
            Object.assign(parsed, inactiveData);
            this.logger.debug(`Inactive ONU data merged: aliveTime=${inactiveData.aliveTime}, lastDeregReason=${inactiveData.lastDeregReason}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch inactive ONU details: ${error.message}`);
          // Don't fail the whole request, continue with basic data
        }
      }

      const finalExecutionTime = Date.now() - startTime;

      const response = {
        success: true,
        data: parsed,  // parsed now contains all merged data
        executionTime: finalExecutionTime,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(`FINAL RESPONSE data.port=${response.data.port}, data.status=${response.data.status}`);
      this.logger.debug(`FINAL RESPONSE stringified: ${JSON.stringify(response).substring(0, 500)}`);

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(`Failed to get ONU status: ${error.message}`, error.stack);

      return {
        success: false,
        executionTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Get ONU signal level using vendor-specific commands
   */
  async getSignalLevel(
    dto: SignalLevelRequestDto,
    tokenId: string
  ): Promise<TelnetResponseDto<SignalLevelResponseDto>> {
    const startTime = Date.now();

    try {
      // Parse interface parameter
      const { port, onuId } = this.parseEponInterface(dto.interface);

      // Get vendor implementation
      const vendor = this.vendorFactory.getVendor(dto.vendorType || 'bdcom');

      // Get command for this vendor
      const fullCommand = vendor.getSignalLevelCommand(port, onuId);

      // Extract just the main command (remove "enable\n" prefix if present)
      const mainCommand = fullCommand.split('\n').filter(cmd => cmd.trim() && !cmd.trim().toLowerCase().startsWith('enable')).join('');

      this.logger.debug(`Executing signal level command for ${dto.interface}: ${mainCommand}`);

      // Execute command using sequential flow with enable mode
      const result = await this.telnetService.executeSequentialCommands(
        {
          host: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
        },
        mainCommand,
        {
          enableMode: true,           // Auto-execute enable before command
          finalCommandDelay: 500,     // Wait 500ms after command for output
        }
      );

      const executionTime = Date.now() - startTime;

      // Log command
      this.logTelnetCommand(
        tokenId,
        dto.ip,
        dto.username,
        mainCommand,
        result.output,
        result.success ? 'SUCCESS' : 'FAILED',
        result.error,
        executionTime
      ).catch((error) => {
        this.logger.error('Failed to log telnet command:', error);
      });

      // Check if command execution failed
      if (!result.success) {
        return {
          success: false,
          executionTime,
          timestamp: new Date().toISOString(),
          error: result.error || 'Command execution failed',
        };
      }

      // Parse output using vendor parser
      const parsed = vendor.parseSignalLevel(result.output);

      return {
        success: true,
        data: {
          port,
          onuId,
          ...parsed,
        },
        executionTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        executionTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Log telnet command to database
   *
   * @private
   */
  private async logTelnetCommand(
    tokenId: string,
    deviceIp: string,
    username: string,
    command: string,
    response: string,
    status: 'SUCCESS' | 'FAILED',
    errorMessage: string | undefined,
    executionTime: number
  ): Promise<void> {
    try {
      // Truncate response if too large (max ~10KB)
      const MAX_RESPONSE_SIZE = 10 * 1024;
      const truncatedResponse =
        response && response.length > MAX_RESPONSE_SIZE
          ? response.substring(0, MAX_RESPONSE_SIZE) + '\n... [truncated]'
          : response;

      await this.prisma.telnetCommandLog.create({
        data: {
          tokenId,
          deviceIp,
          username,
          command,
          response: truncatedResponse || null,
          status,
          errorMessage: errorMessage || null,
          executionTime,
        },
      });
    } catch (error) {
      // Don't throw - logging failure shouldn't break the main operation
      this.logger.error('Failed to write telnet log to database:', error);
    }
  }
}
