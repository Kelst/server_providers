import { ApiProperty } from '@nestjs/swagger';

/**
 * Single session history item
 */
export class SessionHistoryItemDto {
  @ApiProperty({
    description: 'Session start date and time',
    example: '2023-04-11 15:21:39',
  })
  start: string;

  @ApiProperty({
    description: 'Tariff plan ID',
    example: 728,
  })
  tpId: number;

  @ApiProperty({
    description: 'Session duration (formatted as "D HH:MM:SS")',
    example: '116 19:21:35',
  })
  duration: string;

  @ApiProperty({
    description: 'Data sent in MB',
    example: 4188.16,
  })
  sendData: number;

  @ApiProperty({
    description: 'Data received in MB',
    example: 978.59,
  })
  getData: number;

  @ApiProperty({
    description: 'IP address',
    example: '192.168.1.100',
  })
  ip: string;

  @ApiProperty({
    description: 'CID (MAC address)',
    example: '909a.4a95.5f20',
  })
  cid: string;

  @ApiProperty({
    description: 'Guest flag (0 or 1)',
    example: 0,
  })
  guest: number;

  @ApiProperty({
    description: 'NAS name from nas table',
    example: 'Juniper_BRAS1',
    required: false,
    nullable: true,
  })
  nasName: string | null;

  @ApiProperty({
    description: 'Session type (ipoe or pppoe)',
    example: 'ipoe',
    required: false,
    nullable: true,
    enum: ['ipoe', 'pppoe'],
  })
  sessionType: string | null;

  @ApiProperty({
    description: 'Session provider/company',
    example: 'intelekt',
    required: false,
    nullable: true,
    enum: ['intelekt', 'opensvit', 'veles'],
  })
  sessionProvider: string | null;
}

/**
 * Session history response with summary and detailed list
 */
export class SessionHistoryResponseDto {
  @ApiProperty({
    description: 'Total number of session records',
    example: 156,
  })
  count: number;

  @ApiProperty({
    description: 'List of session history items (up to 1000 most recent)',
    type: [SessionHistoryItemDto],
  })
  sessions: SessionHistoryItemDto[];
}
