import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelnetConnectionPool, TelnetPoolConfig } from './telnet-pool';

/**
 * Telnet Credentials
 */
export interface TelnetCredentials {
  host: string;
  username: string;
  password: string;
  port?: number;
}

/**
 * Telnet Command Result
 */
export interface TelnetCommandResult {
  success: boolean;
  output: string;
  executionTime: number; // milliseconds
  error?: string;
}

/**
 * Telnet Service
 *
 * Provides telnet connectivity to network equipment (OLT devices).
 * Uses connection pooling for efficient resource usage.
 */
@Injectable()
export class TelnetService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelnetService.name);
  private pool: TelnetConnectionPool;
  private telnetConfig: any;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize telnet service and connection pool
   */
  async onModuleInit() {
    this.telnetConfig = this.configService.get('equipment.telnet');

    const poolConfig: TelnetPoolConfig = {
      maxConnections: this.telnetConfig.maxConnections,
      idleTimeout: this.telnetConfig.idleTimeout,
    };

    this.pool = new TelnetConnectionPool(poolConfig);

    this.logger.log('Telnet Service initialized with configuration:');
    this.logger.log(`- Timeout: ${this.telnetConfig.timeout}ms`);
    this.logger.log(`- Max Connections: ${this.telnetConfig.maxConnections}`);
    this.logger.log(`- Idle Timeout: ${this.telnetConfig.idleTimeout}ms`);
    this.logger.log(`- Default Port: ${this.telnetConfig.port}`);
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Shutting down Telnet Service...');
    await this.pool.closeAll();
  }

  /**
   * Execute a telnet command on a device
   *
   * @param credentials - Device credentials
   * @param command - Command to execute
   * @param timeout - Optional timeout override (ms)
   * @returns Command result
   */
  async executeCommand(
    credentials: TelnetCredentials,
    command: string,
    timeout?: number
  ): Promise<TelnetCommandResult> {
    const startTime = Date.now();
    let connection;

    try {
      // Validate command
      if (!command || command.trim() === '') {
        throw new Error('Command cannot be empty');
      }

      // Sanitize command (basic protection)
      const sanitizedCommand = this.sanitizeCommand(command);

      this.logger.debug(
        `Executing telnet command on ${credentials.host}: ${sanitizedCommand}`
      );

      // Get connection from pool
      const telnetParams = {
        port: credentials.port || this.telnetConfig.port,
        timeout: timeout || this.telnetConfig.timeout,
        // Use regex to match both user mode (>) and enable mode (#) prompts for BDCOM
        shellPrompt: /[>#]\s*$/,
        loginPrompt: /Username:|login:/i,
        passwordPrompt: /Password:/i,
        negotiationMandatory: false,
        irs: '\r\n',
        ors: '\n',
        echoLines: 0, // BDCOM doesn't echo commands consistently, keep at 0
      };

      connection = await this.pool.acquire(
        credentials.host,
        credentials.username,
        credentials.password,
        telnetParams
      );

      // Execute command
      const output = await connection.exec(sanitizedCommand, {
        timeout: timeout || this.telnetConfig.timeout,
      });

      const executionTime = Date.now() - startTime;

      this.logger.debug(
        `Command executed successfully in ${executionTime}ms on ${credentials.host}`
      );

      // Release connection back to pool
      this.pool.release(connection);

      // Truncate output if too large (max ~10KB)
      const MAX_OUTPUT_SIZE = 10 * 1024; // 10KB
      const truncatedOutput =
        output.length > MAX_OUTPUT_SIZE
          ? output.substring(0, MAX_OUTPUT_SIZE) + '\n... [output truncated]'
          : output;

      return {
        success: true,
        output: truncatedOutput,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `Telnet command failed on ${credentials.host}: ${error.message}`
      );

      // Release connection on error
      if (connection) {
        this.pool.release(connection);
      }

      return {
        success: false,
        output: '',
        executionTime,
        error: error.message,
      };
    }
  }

  /**
   * Test telnet connectivity to a device
   *
   * @param credentials - Device credentials
   * @returns True if connection successful
   */
  async testConnection(credentials: TelnetCredentials): Promise<boolean> {
    try {
      const result = await this.executeCommand(credentials, 'show version', 5000);
      return result.success;
    } catch (error) {
      this.logger.error(
        `Connection test failed for ${credentials.host}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return this.pool.getStats();
  }

  /**
   * Sanitize command to prevent injection attacks
   *
   * @param command - Raw command
   * @returns Sanitized command
   */
  private sanitizeCommand(command: string): string {
    // Remove dangerous characters/sequences
    // Allow alphanumeric, spaces, hyphens, slashes, dots, colons, underscores
    // This is a basic implementation - adjust based on your OLT command syntax

    // Trim whitespace
    let sanitized = command.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove control characters except newline and carriage return
    sanitized = sanitized.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    // Log if command was modified
    if (sanitized !== command.trim()) {
      this.logger.warn('Command was sanitized (control characters removed)');
    }

    return sanitized;
  }

  /**
   * Execute commands sequentially with optimized timing for BDCOM OLT
   *
   * Optimized flow:
   * 1. Login (no delay)
   * 2. Password (no delay)
   * 3. Prompt received
   * 4. Enable command (if enableMode=true, no delay)
   * 5. # prompt received
   * 6. Main command (no delay)
   * 7. Wait finalCommandDelay (default 0ms for max speed) for output
   * 8. Return parsed output
   *
   * @param credentials - Device credentials
   * @param command - Main command to execute (e.g., "show epon onu-information...")
   * @param options - Execution options
   * @returns Command result
   */
  async executeSequentialCommands(
    credentials: TelnetCredentials,
    command: string,
    options?: {
      enableMode?: boolean;      // Auto-execute 'enable' before main command (default: true)
      finalCommandDelay?: number; // Delay after final command in ms (default: 500)
      timeout?: number;           // Overall timeout in ms (default: from config)
    }
  ): Promise<TelnetCommandResult> {
    const startTime = Date.now();
    let connection;

    // Default options
    const enableMode = options?.enableMode !== false; // Default true
    const finalCommandDelay = options?.finalCommandDelay ?? 0; // 0ms default (no delay for maximum speed)
    const timeoutMs = options?.timeout || this.telnetConfig.timeout;

    try {
      // Validate command
      if (!command || command.trim() === '') {
        throw new Error('Command cannot be empty');
      }

      const sanitizedCommand = this.sanitizeCommand(command);

      this.logger.debug(
        `Executing sequential command on ${credentials.host}: ${sanitizedCommand} (enableMode=${enableMode})`
      );

      // Connection params optimized for BDCOM (aggressive timeouts for max speed)
      const telnetParams = {
        port: credentials.port || this.telnetConfig.port,
        timeout: 5000, // Login timeout (fixed 5s instead of variable)
        shellPrompt: /[a-zA-Z0-9_-]+[>#]\s*$/, // Match hostname + prompt
        loginPrompt: /Username:/i,
        passwordPrompt: /Password:/i,
        negotiationMandatory: false,
        irs: '\r\n',
        ors: '\r',
        echoLines: 0,
        execTimeout: 3000, // Command execution timeout (3s instead of 10s)
        sendTimeout: 1000, // Reduced from 3000ms
        pageBreak: '--More--',
        debug: false,
      };

      // Acquire connection from pool
      const acquireStart = Date.now();
      connection = await this.pool.acquire(
        credentials.host,
        credentials.username,
        credentials.password,
        telnetParams
      );
      const acquireTime = Date.now() - acquireStart;

      this.logger.debug(`Connection acquired in ${acquireTime}ms, executing commands...`);

      // Send Enter to "push through" the Welcome screen with many empty lines
      this.logger.debug('Sending Enter to clear Welcome screen...');
      try {
        await connection.send('\r');
        // No delay - let connection.exec handle the prompt detection
        this.logger.debug('Welcome screen cleared (1 Enter sent), ready for commands');
      } catch (error) {
        this.logger.warn(`Failed to send Enter: ${error.message}`);
      }

      let output = '';

      // Step 1: Execute enable command if needed
      if (enableMode) {
        const enableStart = Date.now();
        this.logger.debug('Executing enable command...');
        try {
          await connection.exec('enable', {
            timeout: 2000, // Fixed 2s timeout for enable command
            shellPrompt: /#\s*$/, // Wait for # prompt
            ors: '\r',
          });
          const enableTime = Date.now() - enableStart;
          this.logger.debug(`Enable mode activated (#) in ${enableTime}ms`);
        } catch (error) {
          this.logger.warn(`Enable command failed: ${error.message}`);
          // Continue anyway - might already be in enable mode
        }
      }

      // Step 2: Execute main command
      const commandStart = Date.now();
      this.logger.debug(`Executing main command: ${sanitizedCommand}`);

      try {
        output = await connection.exec(sanitizedCommand, {
          timeout: 3000, // Fixed 3s timeout for main command (aggressive for speed)
          shellPrompt: /[>#]\s*$/, // Accept both prompts
          ors: '\r',
        });
        const commandTime = Date.now() - commandStart;

        // Step 3: Wait additional time after command for output stabilization
        if (finalCommandDelay > 0) {
          this.logger.debug(`Waiting ${finalCommandDelay}ms for output to stabilize...`);
          await new Promise(resolve => setTimeout(resolve, finalCommandDelay));
        } else {
          this.logger.debug('Skipping final delay (finalCommandDelay = 0)');
        }

        this.logger.debug(`Command executed in ${commandTime}ms, output length: ${output.length} chars`);
        this.logger.debug(`Output preview: ${JSON.stringify(output.substring(0, 500))}`);
      } catch (error) {
        this.logger.error(`Main command execution failed: ${error.message}`);
        throw error;
      }

      const executionTime = Date.now() - startTime;

      // Release connection back to pool
      this.pool.release(connection);

      // Truncate output if too large
      const MAX_OUTPUT_SIZE = 10 * 1024;
      const truncatedOutput =
        output.length > MAX_OUTPUT_SIZE
          ? output.substring(0, MAX_OUTPUT_SIZE) + '\n... [output truncated]'
          : output;

      this.logger.debug(
        `Sequential command completed in ${executionTime}ms on ${credentials.host}`
      );

      return {
        success: true,
        output: truncatedOutput,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `Sequential command execution failed on ${credentials.host}: ${error.message}`
      );

      // Release connection on error
      if (connection) {
        this.pool.release(connection);
      }

      return {
        success: false,
        output: '',
        executionTime,
        error: error.message,
      };
    }
  }

  /**
   * Execute multiple commands in sequence using a single connection
   *
   * @param credentials - Device credentials
   * @param commands - Array of commands to execute
   * @param timeout - Optional timeout for each command
   * @returns Array of command results
   */
  async executeMultipleCommands(
    credentials: TelnetCredentials,
    commands: string[],
    timeout?: number
  ): Promise<TelnetCommandResult[]> {
    const startTime = Date.now();
    let connection;
    const results: TelnetCommandResult[] = [];

    try {
      this.logger.debug(
        `Executing ${commands.length} commands on ${credentials.host} using single connection`
      );

      // Get connection params
      const telnetParams = {
        port: credentials.port || this.telnetConfig.port,
        timeout: (timeout || this.telnetConfig.timeout) * 3, // Increase timeout for BDCOM login sequence
        // Use regex to match both user mode (>) and enable mode (#) prompts for BDCOM
        // Match hostname followed by > or # (e.g., "pon_office_5>" or "pon_office_5#")
        shellPrompt: /[a-zA-Z0-9_-]+[>#]\s*$/,
        loginPrompt: /Username:/i,
        passwordPrompt: /Password:/i,
        negotiationMandatory: false,
        irs: '\r\n',
        ors: '\n', // Changed back to \n for initial login
        echoLines: 0, // BDCOM doesn't echo commands consistently, keep at 0
        execTimeout: (timeout || this.telnetConfig.timeout) * 2, // Longer timeout for command execution
        sendTimeout: 5000, // Increased timeout for sending data
        pageBreak: '--More--', // Handle pag ination
        debug: false, // Disable debug to reduce logs
      };

      // Acquire connection
      connection = await this.pool.acquire(
        credentials.host,
        credentials.username,
        credentials.password,
        telnetParams
      );

      // Execute commands sequentially on the same connection
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const sanitizedCommand = this.sanitizeCommand(command);
        const cmdStartTime = Date.now();

        this.logger.debug(
          `Executing command ${i + 1}/${commands.length}: ${sanitizedCommand}`
        );

        try {
          // Special handling for 'enable' command - it doesn't return output, just changes prompt
          const isEnableCommand = sanitizedCommand.toLowerCase().trim() === 'enable';

          let output: string;

          if (isEnableCommand) {
            // For enable command, use exec to properly wait for prompt change
            this.logger.debug('Executing enable command with exec()');

            const execOptions: any = {
              timeout: (timeout || this.telnetConfig.timeout) * 2,
              shellPrompt: /#\s*$/, // Wait specifically for # prompt (enable mode)
              ors: '\r',
            };

            output = await connection.exec(sanitizedCommand, execOptions);

            const executionTime = Date.now() - cmdStartTime;
            this.logger.debug(`Enable command executed in ${executionTime}ms, now in # prompt mode`);
          } else {
            // For other commands, use exec
            const execOptions: any = {
              timeout: (timeout || this.telnetConfig.timeout) * 2,
              shellPrompt: /[>#]\s*$/, // Accept both prompts
              ors: '\r', // Use carriage return for better compatibility
            };

            output = await connection.exec(sanitizedCommand, execOptions);

            const executionTime = Date.now() - cmdStartTime;

            this.logger.debug(
              `Command ${i + 1} executed successfully in ${executionTime}ms (output length: ${output.length} chars)`
            );
          }

          // Truncate output if too large
          const MAX_OUTPUT_SIZE = 10 * 1024;
          const truncatedOutput =
            output.length > MAX_OUTPUT_SIZE
              ? output.substring(0, MAX_OUTPUT_SIZE) + '\n... [output truncated]'
              : output;

          results.push({
            success: true,
            output: truncatedOutput,
            executionTime: Date.now() - cmdStartTime,
          });
        } catch (error) {
          const executionTime = Date.now() - cmdStartTime;
          this.logger.error(`Command ${i + 1} failed: ${error.message}`);

          results.push({
            success: false,
            output: '',
            executionTime,
            error: error.message,
          });

          // Stop executing if command failed
          this.logger.warn(
            `Stopping command sequence due to failure at command ${i + 1}`
          );
          break;
        }
      }

      // Release connection back to pool
      this.pool.release(connection);

      return results;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Multi-command execution failed on ${credentials.host}: ${error.message}`
      );

      // Release connection on error
      if (connection) {
        this.pool.release(connection);
      }

      // If we haven't executed any commands yet, return a single error result
      if (results.length === 0) {
        return [
          {
            success: false,
            output: '',
            executionTime,
            error: error.message,
          },
        ];
      }

      return results;
    }
  }
}
