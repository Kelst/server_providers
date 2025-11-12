import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { TelnetCredentialsDto } from './telnet-credentials.dto';

/**
 * ONU Details Request DTO
 */
export class OnuDetailsRequestDto extends TelnetCredentialsDto {
  @ApiProperty({
    description: 'EPON interface (e.g., "epon0/1:4" or "0/1:4")',
    example: 'epon0/1:4',
  })
  @IsString()
  @MinLength(1)
  interface: string;
}

/**
 * ONU Configuration (from show running-config)
 */
export class OnuConfigDto {
  @ApiProperty({ description: 'VLAN mode', example: 'tag', required: false })
  vlanMode?: string;

  @ApiProperty({ description: 'VLAN ID', example: 104, required: false })
  vlanId?: number;

  @ApiProperty({ description: 'VLAN priority', example: 0, required: false })
  priority?: number;

  @ApiProperty({
    description: 'Upstream SLA',
    required: false,
    example: { pir: 1000000, cir: 512 },
  })
  upstreamSla?: {
    pir?: number; // Peak Information Rate (kbps)
    cir?: number; // Committed Information Rate (kbps)
  };

  @ApiProperty({
    description: 'Downstream SLA',
    required: false,
    example: { pir: 1000000, cir: 512 },
  })
  downstreamSla?: {
    pir?: number;
    cir?: number;
  };
}

/**
 * MAC Address Table Entry
 */
export class MacAddressEntryDto {
  @ApiProperty({ description: 'MAC address', example: 'd847.321e.d80f' })
  macAddress: string;

  @ApiProperty({ description: 'VLAN ID', example: 104 })
  vlan: number;

  @ApiProperty({ description: 'Entry type', example: 'DYNAMIC', required: false })
  type?: string;
}

/**
 * ONU Port State
 */
export class PortStateDto {
  @ApiProperty({
    description: 'Hardware link state',
    example: 'Link-Up',
  })
  hardwareState: string;

  @ApiProperty({ description: 'Port speed', example: '100Mbps', required: false })
  speed?: string;

  @ApiProperty({ description: 'Duplex mode', example: 'Full-Duplex', required: false })
  duplex?: string;
}

/**
 * ONU Details Response DTO
 */
export class OnuDetailsResponseDto {
  @ApiProperty({
    description: 'ONU configuration',
    type: OnuConfigDto,
    required: false,
  })
  config?: OnuConfigDto;

  @ApiProperty({
    description: 'MAC addresses (1-3 entries)',
    type: [MacAddressEntryDto],
    required: false,
  })
  macAddresses?: MacAddressEntryDto[];

  @ApiProperty({
    description: 'Port state information',
    type: PortStateDto,
    required: false,
  })
  portState?: PortStateDto;
}
