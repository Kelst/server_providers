import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PppoeVlanResponseDto {
  @ApiProperty({
    description: 'Configuration ID',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'OLT IP address',
    example: '172.16.30.13',
  })
  oltIp: string;

  @ApiProperty({
    description: 'VLAN ID',
    example: 1246,
  })
  vlanId: number;

  @ApiPropertyOptional({
    description: 'Configuration description',
    example: 'PPPoE VLAN for Building A',
  })
  description?: string;

  @ApiProperty({
    description: 'Created by token ID',
    example: 'token-uuid',
  })
  tokenId: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-13T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-11-13T12:00:00.000Z',
  })
  updatedAt: string;
}
