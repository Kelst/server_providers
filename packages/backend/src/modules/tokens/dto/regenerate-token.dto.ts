import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RegenerateTokenDto {
  @ApiPropertyOptional({
    description: 'Reason for token regeneration',
    example: 'Token compromised, rotating for security',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
