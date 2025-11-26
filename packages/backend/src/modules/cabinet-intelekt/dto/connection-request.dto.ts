import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsDateString,
} from 'class-validator';

// Create Connection Request DTO (публічний API)
export class CreateConnectionRequestDto {
  @ApiProperty({
    description: 'Повне ім\'я абонента (ПІБ)',
    example: 'Іваненко Іван Іванович',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  @Matches(/^[а-яА-ЯіІїЇєЄґҐa-zA-Z\s'-]+$/, {
    message: 'ПІБ має містити тільки літери, пробіли та дефіси',
  })
  fullName: string;

  @ApiProperty({
    description: 'Номер телефону',
    example: '+380501234567',
    pattern: '^(\\+380|380|0)\\d{9}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+380|380|0)\d{9}$/, {
    message: 'Невірний формат українського номера телефону (наприклад: +380501234567)',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Додатковий коментар або побажання клієнта',
    example: 'Прошу передзвонити після 18:00',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Коментар не може перевищувати 1000 символів',
  })
  comment?: string;
}

// Update Connection Request DTO (admin API)
export class UpdateConnectionRequestDto {
  @ApiPropertyOptional({
    description: 'Примітки адміністратора',
    example: 'Зв\'язались з клієнтом, призначено візит',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// Connection Request Response DTO
export class ConnectionRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiPropertyOptional()
  comment?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  ipAddress: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiProperty()
  telegramSent: boolean;

  @ApiPropertyOptional()
  telegramSentAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Connection Request List Query DTO
export class ConnectionRequestListQueryDto {
  @ApiPropertyOptional({
    description: 'Пошук за ПІБ або номером телефону',
    example: 'Іваненко',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Дата початку (ISO формат)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Дата кінця (ISO формат)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Сторінка',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Кількість записів на сторінці',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Сортування',
    enum: ['createdAt', 'updatedAt', 'fullName'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Порядок сортування',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// Connection Request List Response DTO
export class ConnectionRequestListResponseDto {
  @ApiProperty({ type: [ConnectionRequestResponseDto] })
  data: ConnectionRequestResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// Telegram Settings DTO
export class TelegramSettingsDto {
  @ApiPropertyOptional({
    description: 'Токен Telegram бота',
    example: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  telegramBotToken?: string;

  @ApiPropertyOptional({
    description: 'Chat ID для сповіщень',
    example: '-1001234567890',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  telegramChatId?: string;

  @ApiPropertyOptional({
    description: 'Чи увімкнені Telegram сповіщення',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  telegramNotificationsEnabled?: boolean;
}

// Test Telegram Settings DTO
export class TestTelegramSettingsDto {
  @ApiProperty({
    description: 'Токен Telegram бота',
    example: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
  })
  @IsString()
  @IsNotEmpty()
  botToken: string;

  @ApiProperty({
    description: 'Chat ID для тестування',
    example: '-1001234567890',
  })
  @IsString()
  @IsNotEmpty()
  chatId: string;
}
