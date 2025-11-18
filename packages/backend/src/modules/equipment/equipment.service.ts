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
  OnuDetailsRequestDto,
  OnuDetailsResponseDto,
  OnuPortRebootRequestDto,
  OnuPortRebootResponseDto,
  OnuSetVlanRequestDto,
  OnuSetVlanResponseDto,
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
          temperature: parsed.temperature,
          voltage: parsed.voltage,
          biasCurrent: parsed.biasCurrent,
          txPower: parsed.txPower,
          rxPower: parsed.rxPower,
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
   * Get ONU detailed configuration and state
   */
  async getOnuDetails(
    dto: OnuDetailsRequestDto,
    tokenId: string
  ): Promise<TelnetResponseDto<OnuDetailsResponseDto>> {
    const startTime = Date.now();

    try {
      // Parse interface parameter
      const { port, onuId } = this.parseEponInterface(dto.interface);

      // Get vendor implementation
      const vendor = this.vendorFactory.getVendor(dto.vendorType || 'bdcom');

      // Check if vendor supports ONU details commands
      if (!vendor.getOnuConfigCommand || !vendor.getOnuMacTableCommand || !vendor.getOnuPortStateCommand) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: 'Vendor does not support ONU details commands',
        };
      }

      // Get all 3 commands
      const configCommand = vendor.getOnuConfigCommand(port, onuId);
      const macTableCommand = vendor.getOnuMacTableCommand(port, onuId);
      const portStateCommand = vendor.getOnuPortStateCommand(port, onuId);

      this.logger.debug(`Executing ONU details commands for ${dto.interface}`);

      // Execute all 3 commands sequentially
      const configResult = await this.telnetService.executeSequentialCommands(
        {
          host: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
        },
        configCommand,
        {
          enableMode: true,
          finalCommandDelay: 500,
        }
      );

      const macTableResult = await this.telnetService.executeSequentialCommands(
        {
          host: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
        },
        macTableCommand,
        {
          enableMode: true,
          finalCommandDelay: 500,
        }
      );

      const portStateResult = await this.telnetService.executeSequentialCommands(
        {
          host: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
        },
        portStateCommand,
        {
          enableMode: true,
          finalCommandDelay: 500,
        }
      );

      const executionTime = Date.now() - startTime;

      // Check if all commands returned empty (ONU offline)
      const allEmpty =
        (!configResult.output || configResult.output.trim().length < 10) &&
        (!macTableResult.output || macTableResult.output.trim().length < 10) &&
        (!portStateResult.output || portStateResult.output.trim().length < 10);

      if (allEmpty) {
        // Log the attempt
        this.logTelnetCommand(
          tokenId,
          dto.ip,
          dto.username,
          `${configCommand}; ${macTableCommand}; ${portStateCommand}`,
          '',
          'FAILED',
          'ONU offline - all commands returned empty',
          executionTime
        ).catch((error) => {
          this.logger.error('Failed to log telnet command:', error);
        });

        return {
          success: false,
          executionTime,
          timestamp: new Date().toISOString(),
          error: 'ONU offline - all commands returned empty',
        };
      }

      // Parse all outputs
      const config = vendor.parseOnuConfig ? vendor.parseOnuConfig(configResult.output) : undefined;
      const macAddresses = vendor.parseOnuMacTable ? vendor.parseOnuMacTable(macTableResult.output) : undefined;
      const portState = vendor.parseOnuPortState ? vendor.parseOnuPortState(portStateResult.output) : undefined;

      // Log successful execution
      this.logTelnetCommand(
        tokenId,
        dto.ip,
        dto.username,
        `${configCommand}; ${macTableCommand}; ${portStateCommand}`,
        `Config: ${configResult.output.length} bytes, MAC: ${macTableResult.output.length} bytes, State: ${portStateResult.output.length} bytes`,
        'SUCCESS',
        undefined,
        executionTime
      ).catch((error) => {
        this.logger.error('Failed to log telnet command:', error);
      });

      return {
        success: true,
        data: {
          config,
          macAddresses,
          portState,
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
   * Reboot ONU port (shutdown/no shutdown)
   *
   * This method reboots an ONU port by executing a shutdown followed by no shutdown command.
   * The sequence is:
   * 1. Check if ONU is online (cannot reboot offline ONU)
   * 2. Enter config mode
   * 3. Execute shutdown on port 1
   * 4. Wait 1 second (for port to stabilize)
   * 5. Execute no shutdown on port 1
   * 6. Exit config mode
   *
   * @param dto - ONU port reboot request DTO
   * @param tokenId - API token ID for logging
   * @returns Telnet response with reboot result
   */
  async rebootOnuPort(
    dto: OnuPortRebootRequestDto,
    tokenId: string
  ): Promise<TelnetResponseDto<OnuPortRebootResponseDto>> {
    const startTime = Date.now();

    try {
      // Parse interface parameter
      const { port, onuId } = this.parseEponInterface(dto.interface);

      this.logger.debug(`Rebooting ONU port for ${dto.interface} (port=${port}, onuId=${onuId})`);

      // Step 1: Check ONU status first (must be online to reboot)
      this.logger.debug('Checking ONU status before reboot...');
      const statusResult = await this.getOnuStatus(
        {
          interface: dto.interface,
          ip: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
          vendorType: dto.vendorType,
        },
        tokenId
      );

      // Check if status check failed
      if (!statusResult.success) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: `Failed to check ONU status: ${statusResult.error}`,
        };
      }

      // Check if ONU is online
      const isOnline = statusResult.data?.status === 'online';
      if (!isOnline) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: `ONU is ${statusResult.data?.status || 'offline'}. Cannot reboot offline ONU.`,
        };
      }

      this.logger.debug('ONU is online, proceeding with reboot...');

      // Step 2: Get vendor implementation
      const vendor = this.vendorFactory.getVendor(dto.vendorType || 'bdcom');

      // Check if vendor supports port reboot
      if (!vendor.getOnuPortRebootCommands) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: `Vendor ${dto.vendorType || 'bdcom'} does not support ONU port reboot`,
        };
      }

      // Step 3: Generate reboot commands
      const commands = vendor.getOnuPortRebootCommands(port, onuId);

      this.logger.debug(`Executing ${commands.length} reboot commands with 1000ms (1s) inter-command delay`);

      // Step 4: Execute config commands with 1 second delay
      const result = await this.telnetService.executeConfigCommands(
        {
          host: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
        },
        commands,
        {
          interCommandDelay: 1000, // 1000ms (1 second) delay between commands for port to stabilize
        }
      );

      const executionTime = Date.now() - startTime;

      // Step 5: Log command execution (fire and forget)
      this.logTelnetCommand(
        tokenId,
        dto.ip,
        dto.username,
        commands.join(' -> '),
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

      // Step 6: Return success with detailed outputs
      return {
        success: true,
        data: {
          onuWasOnline: true,
          commandOutputs: result.commandOutputs || [],
          message: 'ONU port rebooted successfully',
        },
        executionTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Failed to reboot ONU port: ${error.message}`, error.stack);

      return {
        success: false,
        executionTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Set VLAN on ONU port
   *
   * This method configures VLAN on ONU port.
   * The sequence is:
   * 1. Check if ONU is online (cannot configure offline ONU)
   * 2. Enter config mode
   * 3. Execute VLAN configuration command
   * 4. Exit config mode
   *
   * @param dto - ONU set VLAN request DTO
   * @param tokenId - API token ID for logging
   * @returns Telnet response with configuration result
   */
  async setOnuVlan(
    dto: OnuSetVlanRequestDto,
    tokenId: string
  ): Promise<TelnetResponseDto<OnuSetVlanResponseDto>> {
    const startTime = Date.now();

    try {
      // Parse interface parameter
      const { port, onuId } = this.parseEponInterface(dto.interface);

      this.logger.debug(`Setting VLAN ${dto.vlanId} for ONU ${dto.interface} (port=${port}, onuId=${onuId})`);

      // Step 1: Check ONU status first (must be online to configure VLAN)
      this.logger.debug('Checking ONU status before VLAN configuration...');
      const statusResult = await this.getOnuStatus(
        {
          interface: dto.interface,
          ip: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
          vendorType: dto.vendorType,
        },
        tokenId
      );

      // Check if status check failed
      if (!statusResult.success) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: `Failed to check ONU status: ${statusResult.error}`,
        };
      }

      // Check if ONU is online
      const isOnline = statusResult.data?.status === 'online';
      if (!isOnline) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: `ONU is ${statusResult.data?.status || 'offline'}. Cannot configure VLAN on offline ONU.`,
        };
      }

      this.logger.debug('ONU is online, proceeding with VLAN configuration...');

      // Step 2: Get vendor implementation
      const vendor = this.vendorFactory.getVendor(dto.vendorType || 'bdcom');

      // Check if vendor supports VLAN configuration
      if (!vendor.getOnuSetVlanCommands) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: `Vendor ${dto.vendorType || 'bdcom'} does not support ONU VLAN configuration`,
        };
      }

      // Step 3: Generate VLAN configuration commands
      const commands = vendor.getOnuSetVlanCommands(port, onuId, dto.vlanId);

      this.logger.debug(`Executing ${commands.length} VLAN configuration commands`);

      // Step 4: Execute config commands (no delay needed for VLAN configuration)
      const result = await this.telnetService.executeConfigCommands(
        {
          host: dto.ip,
          username: dto.username,
          password: dto.password,
          port: dto.port,
        },
        commands
      );

      const executionTime = Date.now() - startTime;

      // Step 5: Log command execution (fire and forget)
      this.logTelnetCommand(
        tokenId,
        dto.ip,
        dto.username,
        `Set VLAN ${dto.vlanId} on ${dto.interface}`,
        result.commandOutputs?.join('\n') || '',
        result.success ? 'SUCCESS' : 'FAILED',
        result.error,
        executionTime
      ).catch((error) => {
        this.logger.error(`Failed to log telnet command: ${error.message}`);
      });

      this.logger.debug(`VLAN configuration completed in ${executionTime}ms`);

      return {
        success: true,
        data: {
          onuWasOnline: true,
          vlanId: dto.vlanId,
          commandOutputs: result.commandOutputs || [],
          message: 'VLAN configured successfully',
        },
        executionTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Failed to set VLAN: ${error.message}`);

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
