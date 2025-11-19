import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateProviderInfoDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Internet Provider LLC',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  companyName: string;

  @ApiProperty({
    description: 'Company description',
    example: 'Leading internet provider in the region',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Website URL',
    example: 'https://provider.com',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'Telegram bot username or link',
    example: '@provider_bot',
    required: false,
  })
  @IsString()
  @IsOptional()
  telegramBot?: string;

  @ApiProperty({
    description: 'Working hours',
    example: 'Mon-Fri: 9:00-18:00, Sat: 10:00-14:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  workingHours?: string;

  @ApiProperty({
    description: 'Office address - street',
    example: 'Main Street 123',
    required: false,
  })
  @IsString()
  @IsOptional()
  addressStreet?: string;

  @ApiProperty({
    description: 'Office address - city',
    example: 'Kyiv',
    required: false,
  })
  @IsString()
  @IsOptional()
  addressCity?: string;

  @ApiProperty({
    description: 'Office address - postal code',
    example: '01001',
    required: false,
  })
  @IsString()
  @IsOptional()
  addressPostal?: string;

  @ApiProperty({
    description: 'Office address - country',
    example: 'Ukraine',
    required: false,
  })
  @IsString()
  @IsOptional()
  addressCountry?: string;
}
