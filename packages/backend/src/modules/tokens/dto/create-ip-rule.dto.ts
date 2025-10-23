import { IsString, IsNotEmpty, IsOptional, IsEnum, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IpRuleType } from '@prisma/client';

export class CreateIpRuleDto {
  @ApiProperty({
    description: 'IP rule type',
    example: 'WHITELIST',
    enum: IpRuleType,
  })
  @IsEnum(IpRuleType)
  @IsNotEmpty()
  type: IpRuleType;

  @ApiProperty({
    description: 'IP address (supports IPv4 and IPv6)',
    example: '192.168.1.1',
  })
  @IsIP()
  @IsNotEmpty()
  ipAddress: string;

  @ApiPropertyOptional({
    description: 'Description of the IP rule',
    example: 'Office IP address',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
