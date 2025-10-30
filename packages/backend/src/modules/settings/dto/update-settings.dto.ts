import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Telegram Bot Token',
    example: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
  })
  @IsOptional()
  @IsString()
  telegramBotToken?: string;

  @ApiPropertyOptional({
    description: 'Telegram Chat ID',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @ApiPropertyOptional({
    description: 'Enable/disable alerts',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable email notifications',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'API request timeout in milliseconds (min: 1000, max: 300000)',
    example: 30000,
    minimum: 1000,
    maximum: 300000,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(300000)
  apiRequestTimeout?: number;

  @ApiPropertyOptional({
    description: 'Database query timeout in milliseconds (min: 1000, max: 300000)',
    example: 10000,
    minimum: 1000,
    maximum: 300000,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(300000)
  databaseQueryTimeout?: number;
}
