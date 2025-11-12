import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { TelnetCredentialsDto } from './telnet-credentials.dto';

/**
 * Signal Level Request DTO
 */
export class SignalLevelRequestDto extends TelnetCredentialsDto {
  @ApiProperty({
    description: 'EPON interface (e.g., "epon0/1:2" or "0/1:2")',
    example: 'epon0/1:2',
  })
  @IsString()
  @MinLength(1)
  interface: string;
}

/**
 * Signal Level Response DTO
 */
export class SignalLevelResponseDto {
  @ApiProperty({ description: 'PON port', example: '0/1' })
  port: string;

  @ApiProperty({ description: 'ONU ID', example: '1' })
  onuId: string;

  @ApiProperty({
    description: 'Received power at OLT (dBm)',
    example: -25.5,
    required: false,
  })
  rxPower?: number;

  @ApiProperty({
    description: 'Transmitted power from ONU (dBm)',
    example: 2.3,
    required: false,
  })
  txPower?: number;

  @ApiProperty({
    description: 'Temperature (Celsius)',
    example: 45,
    required: false,
  })
  temperature?: number;

  @ApiProperty({
    description: 'Voltage (Volts)',
    example: 3.3,
    required: false,
  })
  voltage?: number;

  @ApiProperty({
    description: 'Bias current (mA)',
    example: 25.5,
    required: false,
  })
  biasCurrent?: number;

  @ApiProperty({ description: 'Additional vendor-specific data', required: false })
  rawData?: any;
}
