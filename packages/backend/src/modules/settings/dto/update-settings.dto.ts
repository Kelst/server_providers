import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
}
