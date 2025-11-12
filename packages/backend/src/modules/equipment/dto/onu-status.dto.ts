import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { TelnetCredentialsDto } from './telnet-credentials.dto';

/**
 * ONU Status Request DTO
 */
export class OnuStatusRequestDto extends TelnetCredentialsDto {
  @ApiProperty({
    description: 'EPON interface (e.g., "epon0/1:2" or "0/1:2")',
    example: 'epon0/1:2',
  })
  @IsString()
  @MinLength(1)
  interface: string;
}

/**
 * ONU Status Response DTO
 *
 * Simplified response containing only fields from 'show epon onu-information' command.
 * No longer includes data from secondary commands (active-onu/inactive-onu).
 */
export class OnuStatusResponseDto {
  @ApiProperty({ description: 'PON port', example: '0/8' })
  @IsString()
  port: string;

  @ApiProperty({ description: 'ONU ID', example: '15' })
  @IsString()
  onuId: string;

  @ApiProperty({
    description: 'ONU status',
    example: 'offline',
    enum: ['online', 'offline', 'unknown'],
  })
  @IsEnum(['online', 'offline', 'unknown'])
  status: 'online' | 'offline' | 'unknown';

  @ApiProperty({ description: 'ONU status from OLT', example: 'auto-configured', required: false })
  @IsOptional()
  @IsString()
  onuStatus?: string;

  @ApiProperty({ description: 'Vendor ID', example: 'PICO', required: false })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiProperty({ description: 'Model ID', example: 'E910', required: false })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiProperty({ description: 'ONU type/model', example: 'PICO E910', required: false })
  @IsOptional()
  @IsString()
  onuType?: string;

  @ApiProperty({ description: 'MAC address', example: '70:a5:6a:dd:7e:1d', required: false })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiProperty({ description: 'ONU description', example: 'N/A', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Bind type (static/dynamic)', example: 'static', required: false })
  @IsOptional()
  @IsString()
  bindType?: string;

  @ApiProperty({ description: 'Last deregistration reason', example: 'power-off', required: false })
  @IsOptional()
  @IsString()
  lastDeregReason?: string;

  @ApiProperty({ description: 'Distance to ONU in meters', example: 1180, required: false })
  @IsOptional()
  @IsNumber()
  distance?: number;

  @ApiProperty({ description: 'OAM status', example: 'ctc-oam-oper', required: false })
  @IsOptional()
  @IsString()
  oamStatus?: string;

  @ApiProperty({ description: 'Alive time (online) or Absent time (offline)', example: '0  .01:15:39', required: false })
  @IsOptional()
  @IsString()
  aliveTime?: string;

  @ApiProperty({ description: 'Additional vendor-specific data', required: false })
  @IsOptional()
  rawData?: any;
}
