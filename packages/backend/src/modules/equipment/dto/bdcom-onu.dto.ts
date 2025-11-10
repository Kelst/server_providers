import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * BDCOM ONU Query DTO
 * For querying specific ONU on BDCOM OLT
 */
export class OnuQueryDto {
  @ApiProperty({
    description: 'OLT IP address',
    example: '172.16.3.25',
  })
  @IsString()
  host: string;

  @ApiProperty({
    description: 'PON port with ONU ID (format: EPON0/8:15)',
    example: 'EPON0/8:15',
  })
  @IsString()
  port: string;
}

/**
 * BDCOM ONU Status Response
 */
export class OnuStatusDto {
  @ApiProperty({
    description: 'PON port with ONU ID',
    example: 'EPON0/8:15',
  })
  port: string;

  @ApiProperty({
    description: 'ONU operational status',
    example: 'online',
    enum: ['online', 'offline', 'unknown'],
  })
  status: 'online' | 'offline' | 'unknown';

  @ApiProperty({
    description: 'Administrative status',
    example: 'up',
    enum: ['up', 'down'],
  })
  adminStatus: 'up' | 'down';

  @ApiProperty({
    description: 'ONU RX optical power in dBm (requires BDCOM enterprise MIB)',
    example: -23.45,
    nullable: true,
  })
  rxPower: number | null;

  @ApiProperty({
    description: 'ONU TX optical power in dBm (requires BDCOM enterprise MIB)',
    example: 2.67,
    nullable: true,
  })
  txPower: number | null;

  @ApiProperty({
    description: 'Interface description',
    example: 'EPON0/8:15',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'ONU MAC address',
    example: '90:9A:4A:95:5F:20',
    nullable: true,
  })
  macAddress: string | null;

  @ApiProperty({
    description: 'Interface speed in bps',
    example: 1000000000,
  })
  speed: number;

  @ApiProperty({
    description: 'Interface MTU',
    example: 1900,
  })
  mtu: number;

  @ApiProperty({
    description: 'Traffic statistics',
    type: 'object',
    properties: {
      rxBytes: { type: 'number', example: 3214435819 },
      txBytes: { type: 'number', example: 486817324 },
      rxErrors: { type: 'number', example: 0 },
      txErrors: { type: 'number', example: 0 },
    },
  })
  traffic: {
    rxBytes: number;
    txBytes: number;
    rxErrors: number;
    txErrors: number;
  };

  @ApiProperty({
    description: 'SNMP ifIndex used for query',
    example: 113,
    nullable: true,
  })
  ifIndex: number | null;
}
