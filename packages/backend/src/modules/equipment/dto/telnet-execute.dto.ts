import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MinLength } from 'class-validator';
import { TelnetCredentialsDto } from './telnet-credentials.dto';

/**
 * Telnet Execute Command DTO
 *
 * Used for executing raw telnet commands on OLT devices.
 * Extends TelnetCredentialsDto with command field.
 */
export class TelnetExecuteDto extends TelnetCredentialsDto {
  @ApiProperty({
    description: 'Telnet command to execute',
    example: 'show epon onu-information epon0/1:1',
  })
  @IsString()
  @MinLength(1)
  command: string;

  @ApiProperty({
    description: 'Command timeout in milliseconds (default: 10000)',
    example: 10000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  timeout?: number;
}
