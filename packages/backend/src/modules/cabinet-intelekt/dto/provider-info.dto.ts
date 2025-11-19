import { ApiProperty } from '@nestjs/swagger';
import {
  ProviderPhoneType,
  ProviderEmailType,
  ProviderSocialPlatform,
} from '@prisma/client';

// Response DTOs
export class ProviderPhoneDto {
  @ApiProperty({ description: 'Phone ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+380501234567',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Phone type',
    enum: ProviderPhoneType,
    example: ProviderPhoneType.MAIN,
  })
  type: ProviderPhoneType;

  @ApiProperty({
    description: 'Additional label',
    example: 'Головний офіс Київ',
    nullable: true,
  })
  label: string | null;

  @ApiProperty({
    description: 'Is primary phone',
    example: true,
  })
  isPrimary: boolean;
}

export class ProviderEmailDto {
  @ApiProperty({ description: 'Email ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({
    description: 'Email address',
    example: 'support@provider.com',
  })
  email: string;

  @ApiProperty({
    description: 'Email type',
    enum: ProviderEmailType,
    example: ProviderEmailType.SUPPORT,
  })
  type: ProviderEmailType;

  @ApiProperty({
    description: 'Additional label',
    example: 'Technical Support',
    nullable: true,
  })
  label: string | null;

  @ApiProperty({
    description: 'Is primary email',
    example: true,
  })
  isPrimary: boolean;
}

export class ProviderSocialMediaDto {
  @ApiProperty({ description: 'Social media ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({
    description: 'Social platform',
    enum: ProviderSocialPlatform,
    example: ProviderSocialPlatform.FACEBOOK,
  })
  platform: ProviderSocialPlatform;

  @ApiProperty({
    description: 'Profile URL',
    example: 'https://facebook.com/provider',
  })
  url: string;

  @ApiProperty({
    description: 'Additional label',
    example: 'Official Page',
    nullable: true,
  })
  label: string | null;
}

export class ProviderInfoResponseDto {
  @ApiProperty({ description: 'Provider ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Internet Provider LLC',
  })
  companyName: string;

  @ApiProperty({
    description: 'Company description',
    example: 'Leading internet provider in the region',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Logo URL',
    example: '/uploads/provider/logo.png',
    nullable: true,
  })
  logoUrl: string | null;

  @ApiProperty({
    description: 'Website URL',
    example: 'https://provider.com',
    nullable: true,
  })
  website: string | null;

  @ApiProperty({
    description: 'Telegram bot username or link',
    example: '@provider_bot',
    nullable: true,
  })
  telegramBot: string | null;

  @ApiProperty({
    description: 'Working hours',
    example: 'Mon-Fri: 9:00-18:00, Sat: 10:00-14:00',
    nullable: true,
  })
  workingHours: string | null;

  @ApiProperty({
    description: 'Office address - street',
    example: 'Main Street 123',
    nullable: true,
  })
  addressStreet: string | null;

  @ApiProperty({
    description: 'Office address - city',
    example: 'Kyiv',
    nullable: true,
  })
  addressCity: string | null;

  @ApiProperty({
    description: 'Office address - postal code',
    example: '01001',
    nullable: true,
  })
  addressPostal: string | null;

  @ApiProperty({
    description: 'Office address - country',
    example: 'Ukraine',
    nullable: true,
  })
  addressCountry: string | null;

  @ApiProperty({
    description: 'Phone numbers',
    type: [ProviderPhoneDto],
  })
  phones: ProviderPhoneDto[];

  @ApiProperty({
    description: 'Email addresses',
    type: [ProviderEmailDto],
  })
  emails: ProviderEmailDto[];

  @ApiProperty({
    description: 'Social media links',
    type: [ProviderSocialMediaDto],
  })
  socialMedia: ProviderSocialMediaDto[];

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at', example: '2024-01-01T00:00:00Z' })
  updatedAt: Date;
}
