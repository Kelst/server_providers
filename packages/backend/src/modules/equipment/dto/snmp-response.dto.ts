import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic SNMP Response DTO
 */
export class SnmpResponseDto {
  @ApiProperty({
    description: 'Queried OID',
    example: '1.3.6.1.2.1.1.1.0',
  })
  oid: string;

  @ApiProperty({
    description: 'SNMP value type',
    example: 'OctetString',
  })
  type: string;

  @ApiProperty({
    description: 'Value returned from SNMP query',
    example: 'BDCOM P3616-2TE OLT',
  })
  value: string | number;
}

/**
 * BDCOM System Information Response
 */
export class BdcomSystemInfoDto {
  @ApiProperty({
    description: 'System description',
    example: 'BDCOM P3616-2TE EPON OLT Software Version 3.1.2',
  })
  sysDescr: string;

  @ApiProperty({
    description: 'System name',
    example: 'BDCOM_OLT_Main',
  })
  sysName: string;

  @ApiProperty({
    description: 'System location',
    example: 'Data Center A, Rack 12',
  })
  sysLocation: string;

  @ApiProperty({
    description: 'System contact',
    example: 'admin@example.com',
  })
  sysContact: string;

  @ApiProperty({
    description: 'System uptime in seconds',
    example: 8640000,
  })
  sysUpTime: number;

  @ApiProperty({
    description: 'System Object ID',
    example: '1.3.6.1.4.1.3320',
  })
  sysObjectID: string;
}

/**
 * Response wrapper with metadata
 */
export class EquipmentResponseDto<T> {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response data',
  })
  data: T;

  @ApiProperty({
    description: 'Query timestamp',
    example: '2025-01-07T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Error message if failed',
    required: false,
  })
  error?: string;
}
