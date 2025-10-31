import { ApiProperty } from '@nestjs/swagger';

/**
 * Customer basic information from Userside get_data API
 */
export class CustomerInfoDto {
  @ApiProperty({
    description: 'Last activity timestamp from billing',
    example: '2025-10-31 10:51:14',
    nullable: true,
  })
  dateActivity: string | null;

  @ApiProperty({
    description: 'Last internet activity timestamp',
    example: '2025-10-31 10:51:14',
    nullable: true,
  })
  dateActivityInet: string | null;

  @ApiProperty({
    description: 'Customer comment/notes',
    example: 'адмін\\r<br>70a5.6add.7e1d \\r<br>14:4d:67:05:04:e9\\tпроспект',
    nullable: true,
  })
  comment: string | null;

  @ApiProperty({
    description: 'Corporate flag: 0 = regular customer, 1 = corporate',
    example: 0,
    nullable: true,
  })
  flagCorporate: number | null;

  @ApiProperty({
    description: 'Account creation date',
    example: '2020-11-03 13:42:49',
    nullable: true,
  })
  dateCreate: string | null;

  @ApiProperty({
    description: 'Connection date',
    example: '2020-11-03',
    nullable: true,
  })
  dateConnect: string | null;

  @ApiProperty({
    description: 'Date of positive balance',
    example: '2025-10-31',
    nullable: true,
  })
  datePositiveBalance: string | null;
}

/**
 * MAC address location information from find_mac API
 */
export class MacInfoDto {
  @ApiProperty({
    description: 'Device ID where MAC was found',
    example: 120401,
    nullable: true,
  })
  deviceId: number | null;

  @ApiProperty({
    description: 'MAC address (normalized)',
    example: '909A4A955F20',
    nullable: true,
  })
  mac: string | null;

  @ApiProperty({
    description: 'Port on device',
    example: 'EPON0/8:15',
    nullable: true,
  })
  port: string | null;

  @ApiProperty({
    description: 'VLAN ID',
    example: 815,
    nullable: true,
  })
  vlanId: number | null;

  @ApiProperty({
    description: 'First seen date',
    example: '2025-05-20 07:58:23',
    nullable: true,
  })
  dateFirst: string | null;

  @ApiProperty({
    description: 'Last seen date',
    example: '2025-10-31 01:22:25',
    nullable: true,
  })
  dateLast: string | null;
}

/**
 * Device (OLT) information from device get_data API
 */
export class DeviceInfoDto {
  @ApiProperty({
    description: 'Device name',
    example: 'BDCOM OLT P3616-2TE_before_71984',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'Device IP address (numeric format)',
    example: '2886730521',
    nullable: true,
  })
  ip: string | null;

  @ApiProperty({
    description: 'Device hostname/IP (readable format)',
    example: '172.16.3.25',
    nullable: true,
  })
  host: string | null;

  @ApiProperty({
    description: 'Device comment/notes',
    example: 'pon_formarket_19',
    nullable: true,
  })
  comment: string | null;

  @ApiProperty({
    description: 'Device physical location',
    example: 'Чернівці, Небесної сотні, 19В (Формаркет) #322',
    nullable: true,
  })
  location: string | null;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2025-10-31 11:42:25',
    nullable: true,
  })
  activityTime: string | null;

  @ApiProperty({
    description: 'Device online status: 1 = online, 0 = offline',
    example: 1,
    nullable: true,
  })
  isOnline: number | null;

  @ApiProperty({
    description: 'SNMP protocol version',
    example: 2,
    nullable: true,
  })
  snmpProto: number | null;

  @ApiProperty({
    description: 'SNMP read-only community string',
    example: 'public',
    nullable: true,
  })
  snmpCommunityRo: string | null;

  @ApiProperty({
    description: 'SNMP read-write community string',
    example: 'public',
    nullable: true,
  })
  snmpCommunityRw: string | null;

  @ApiProperty({
    description: 'SNMP port',
    example: 161,
    nullable: true,
  })
  snmpPort: number | null;

  @ApiProperty({
    description: 'Telnet login',
    example: 'admin',
    nullable: true,
  })
  telnetLogin: string | null;

  @ApiProperty({
    description: 'Telnet password',
    example: 'AdmiN12345',
    nullable: true,
  })
  telnetPass: string | null;

  @ApiProperty({
    description: 'VLAN for PPPoE Opensvit',
    example: '883',
    nullable: true,
  })
  vlanPppoeOpensvit: string | null;

  @ApiProperty({
    description: 'VLAN for PPPoE Veles',
    example: '1562',
    nullable: true,
  })
  vlanPppoeVeles: string | null;
}

/**
 * Complete customer data response with all aggregated information
 */
export class CustomerDataResponseDto {
  @ApiProperty({
    description: 'Customer basic information',
    type: CustomerInfoDto,
  })
  customerInfo: CustomerInfoDto;

  @ApiProperty({
    description: 'MAC address location information (all records within 10 hours of the freshest record)',
    type: [MacInfoDto],
    nullable: true,
  })
  macInfo: MacInfoDto[] | null;

  @ApiProperty({
    description: 'Device information',
    type: DeviceInfoDto,
    nullable: true,
  })
  deviceInfo: DeviceInfoDto | null;

  @ApiProperty({
    description: 'Warnings about failed API calls or missing data',
    type: [String],
    example: ['MAC address not found on any device'],
    nullable: true,
  })
  warnings: string[] | null;
}

/**
 * Abon ID response for get_abon_id API
 */
export class AbonIdResponseDto {
  @ApiProperty({
    description: 'Customer ID from Userside',
    example: 96754,
  })
  customerId: number;

  @ApiProperty({
    description: 'Billing UID that was queried',
    example: '140278',
  })
  uid: string;
}

/**
 * Customer details response
 */
export class CustomerDetailsResponseDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 96754,
  })
  customerId: number;

  @ApiProperty({
    description: 'Customer information',
    type: CustomerInfoDto,
  })
  customerInfo: CustomerInfoDto;
}

/**
 * MAC location response
 */
export class MacLocationResponseDto {
  @ApiProperty({
    description: 'Normalized MAC address',
    example: '909a4a955f20',
  })
  mac: string;

  @ApiProperty({
    description: 'MAC location records (all records within 10 hours of the freshest)',
    type: [MacInfoDto],
  })
  locations: MacInfoDto[];
}

/**
 * Device data response
 */
export class DeviceDataResponseDto {
  @ApiProperty({
    description: 'Device ID',
    example: 125646,
  })
  deviceId: string;

  @ApiProperty({
    description: 'Device information',
    type: DeviceInfoDto,
  })
  deviceInfo: DeviceInfoDto;
}
