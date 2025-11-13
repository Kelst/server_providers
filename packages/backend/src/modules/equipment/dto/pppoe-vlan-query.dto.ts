import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIP, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PppoeVlanQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by OLT IP address',
    example: '172.16.30.13',
  })
  @IsOptional()
  @IsIP(4)
  oltIp?: string;

  @ApiPropertyOptional({
    description: 'Filter by VLAN ID',
    example: 1246,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4094)
  @Type(() => Number)
  vlanId?: number;
}
