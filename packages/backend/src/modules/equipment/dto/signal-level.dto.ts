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
  @ApiProperty({
    description: 'Received power at OLT (dBm)',
    example: -16.2,
    required: false,
  })
  rxPower?: number;

  @ApiProperty({
    description: 'Transmitted power from ONU (dBm)',
    example: 1.5,
    required: false,
  })
  txPower?: number;

  @ApiProperty({
    description: 'Temperature (Celsius)',
    example: 22,
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
    example: 11.2,
    required: false,
  })
  biasCurrent?: number;
}
