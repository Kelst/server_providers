import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsIP } from 'class-validator';

export class CreatePppoeVlanDto {
  @ApiProperty({
    description: 'OLT IP address (IPv4)',
    example: '172.16.30.13',
  })
  @IsIP(4)
  @IsNotEmpty()
  oltIp: string;

  @ApiProperty({
    description: 'VLAN ID (1-4094)',
    example: 1246,
    minimum: 1,
    maximum: 4094,
  })
  @IsInt()
  @Min(1)
  @Max(4094)
  @IsNotEmpty()
  vlanId: number;

  @ApiPropertyOptional({
    description: 'Description of this configuration',
    example: 'PPPoE VLAN for Building A',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
