import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { TelnetCredentialsDto } from './telnet-credentials.dto';

/**
 * Request DTO for ONU port reboot (shutdown/no shutdown)
 */
export class OnuPortRebootRequestDto extends TelnetCredentialsDto {
  @ApiProperty({
    description: 'EPON interface (e.g., epon0/8:15)',
    example: 'epon0/8:15',
  })
  @IsString()
  @MinLength(1)
  interface: string;
}
