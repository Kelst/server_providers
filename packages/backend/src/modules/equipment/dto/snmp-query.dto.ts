import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Generic SNMP Query DTO
 * For raw SNMP GET requests to any OID
 */
export class SnmpQueryDto {
  @ApiProperty({
    description: 'Device IP address',
    example: '172.16.3.25',
  })
  @IsString()
  host: string;

  @ApiProperty({
    description: 'SNMP OID to query',
    example: '1.3.6.1.2.1.1.1.0',
  })
  @IsString()
  oid: string;
}

/**
 * BDCOM Device Query DTO
 * For querying specific BDCOM OLT device
 */
export class BdcomDeviceQueryDto {
  @ApiProperty({
    description: 'Device IP address',
    example: '172.16.3.25',
  })
  @IsString()
  host: string;
}

