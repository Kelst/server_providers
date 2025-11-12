import { ApiProperty } from '@nestjs/swagger';
import { IsIP, IsString, IsNumber, IsOptional, IsEnum, MinLength } from 'class-validator';

/**
 * Telnet Credentials DTO
 *
 * Base DTO for telnet connection credentials.
 * Used in all telnet-related requests.
 */
export class TelnetCredentialsDto {
  @ApiProperty({
    description: 'IP address of the OLT device',
    example: '192.168.1.100',
  })
  @IsIP()
  ip: string;

  @ApiProperty({
    description: 'Telnet username',
    example: 'admin',
  })
  @IsString()
  @MinLength(1)
  username: string;

  @ApiProperty({
    description: 'Telnet password',
    example: 'password123',
  })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({
    description: 'Telnet port (default: 23)',
    example: 23,
    required: false,
    default: 23,
  })
  @IsNumber()
  @IsOptional()
  port?: number;

  @ApiProperty({
    description: 'OLT vendor type (bdcom, huawei, zte, or auto-detect)',
    example: 'bdcom',
    required: false,
    default: 'bdcom',
    enum: ['bdcom', 'huawei', 'zte', 'auto'],
  })
  @IsEnum(['bdcom', 'huawei', 'zte', 'auto'])
  @IsOptional()
  vendorType?: 'bdcom' | 'huawei' | 'zte' | 'auto';
}
