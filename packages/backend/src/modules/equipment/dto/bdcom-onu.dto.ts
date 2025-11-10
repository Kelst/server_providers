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
    description: 'ONU status',
    example: 'online',
    enum: ['online', 'offline', 'unknown'],
  })
  status: 'online' | 'offline' | 'unknown';

  @ApiProperty({
    description: 'ONU RX optical power in dBm',
    example: -23.45,
    nullable: true,
  })
  rxPower: number | null;

  @ApiProperty({
    description: 'ONU TX optical power in dBm',
    example: 2.67,
    nullable: true,
  })
  txPower: number | null;

  @ApiProperty({
    description: 'ONU description/model',
    example: 'BDCOM ONU',
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
    description: 'SNMP ifIndex used for query',
    example: 113,
    nullable: true,
  })
  ifIndex: number | null;
}
