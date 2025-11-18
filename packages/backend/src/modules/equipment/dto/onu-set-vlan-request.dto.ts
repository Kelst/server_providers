import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsInt, Min, Max } from 'class-validator';
import { TelnetCredentialsDto } from './telnet-credentials.dto';

/**
 * Request DTO for setting VLAN on ONU
 */
export class OnuSetVlanRequestDto extends TelnetCredentialsDto {
  @ApiProperty({
    description: 'EPON interface (e.g., epon0/8:15)',
    example: 'epon0/8:15',
  })
  @IsString()
  @MinLength(1)
  interface: string;

  @ApiProperty({
    description: 'VLAN ID to configure (1-4094)',
    example: 815,
    minimum: 1,
    maximum: 4094,
  })
  @IsInt()
  @Min(1)
  @Max(4094)
  vlanId: number;
}
