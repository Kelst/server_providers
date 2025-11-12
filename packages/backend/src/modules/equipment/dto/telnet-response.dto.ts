import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic Telnet Response DTO
 *
 * Wraps all telnet command responses with consistent structure.
 */
export class TelnetResponseDto<T = any> {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Response data', required: false })
  data?: T;

  @ApiProperty({
    description: 'Execution time in milliseconds',
    example: 1523,
  })
  executionTime: number;

  @ApiProperty({ description: 'ISO timestamp', example: '2025-11-10T12:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: 'Error message if failed', required: false })
  error?: string;
}

/**
 * Raw Command Response
 */
export class RawCommandResponseDto {
  @ApiProperty({ description: 'Raw command output from device' })
  output: string;

  @ApiProperty({ description: 'Command that was executed' })
  command: string;

  @ApiProperty({ description: 'Device IP address' })
  deviceIp: string;
}
