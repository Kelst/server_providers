import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * Search type enum
 */
export enum NeighborSearchType {
  BUILDING = 'building',
  STREET = 'street',
}

/**
 * Query DTO for neighbors search
 */
export class GetNeighborsQueryDto {
  @ApiProperty({
    description: 'Search type: building (same building) or street (all buildings on street)',
    enum: NeighborSearchType,
    example: NeighborSearchType.BUILDING,
  })
  @IsEnum(NeighborSearchType)
  @IsNotEmpty()
  type: NeighborSearchType;
}

/**
 * Neighbor info DTO
 */
export class NeighborInfoDto {
  @ApiProperty({
    description: 'District/city name',
    example: 'Чернівці',
  })
  district_city: string;

  @ApiProperty({
    description: 'Street name',
    example: 'проспект Незалежності',
  })
  street_name: string;

  @ApiProperty({
    description: 'Building number',
    example: '106',
  })
  building_number: string;

  @ApiProperty({
    description: 'Full address',
    example: 'Чернівці, вул. проспект Незалежності, буд. 106',
  })
  full_address: string;

  @ApiProperty({
    description: 'Number of subscribers in this location',
    example: 5,
  })
  subscribers_count: number;

  @ApiProperty({
    description: 'Comma-separated list of subscriber logins',
    example: 'user1, user2, user3',
  })
  subscriber_login: string;

  @ApiProperty({
    description: 'Comma-separated list of subscriber UIDs',
    example: '140279, 140280, 140281',
  })
  subscriber_uid: string;

  @ApiProperty({
    description: 'Is this the user building? (1=yes, 0=no, only for type=street)',
    example: 1,
    required: false,
  })
  is_user_building?: number;
}

/**
 * Response DTO for neighbors search
 */
export class NeighborsResponseDto {
  @ApiProperty({
    description: 'Search type used',
    enum: NeighborSearchType,
    example: NeighborSearchType.BUILDING,
  })
  type: NeighborSearchType;

  @ApiProperty({
    description: 'List of neighbor locations. For building type: 1 result. For street type: multiple results (one per building)',
    type: [NeighborInfoDto],
  })
  neighbors: NeighborInfoDto[];
}
