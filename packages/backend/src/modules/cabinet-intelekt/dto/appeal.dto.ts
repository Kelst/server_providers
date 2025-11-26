import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating user appeal (subscriber request)
 * Sent to Telegram without saving to database
 */
export class CreateAppealDto {
  @ApiProperty({
    description: 'Номер телефону абонента',
    example: '+380501234567',
    pattern: '^(\\+380|380|0)\\d{9}$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Номер телефону є обов\'язковим' })
  @Matches(/^(\+380|380|0)\d{9}$/, {
    message: 'Невірний формат українського номера телефону (наприклад: +380501234567)',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Текст звернення абонента',
    example: 'Не працює інтернет з 10:00 ранку, прошу допомогти',
    minLength: 3,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Текст звернення є обов\'язковим' })
  @MinLength(3, { message: 'Текст звернення має бути не менше 3 символів' })
  @MaxLength(2000, { message: 'Текст звернення має бути не більше 2000 символів' })
  message: string;
}

/**
 * Response DTO for appeal submission
 */
export class AppealResponseDto {
  @ApiProperty({
    description: 'Статус відправки звернення',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Повідомлення про результат',
    example: 'Ваше звернення успішно відправлено. Ми зв\'яжемося з вами найближчим часом.',
  })
  message: string;
}
