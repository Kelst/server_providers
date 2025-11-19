import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { ProviderSocialPlatform } from '@prisma/client';

export class CreateSocialMediaDto {
  @ApiProperty({
    description: 'Social platform',
    enum: ProviderSocialPlatform,
    example: ProviderSocialPlatform.FACEBOOK,
  })
  @IsEnum(ProviderSocialPlatform)
  platform: ProviderSocialPlatform;

  @ApiProperty({
    description: 'Profile URL',
    example: 'https://facebook.com/provider',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Additional label',
    example: 'Official Page',
    required: false,
  })
  @IsString()
  @IsOptional()
  label?: string;
}

export class UpdateSocialMediaDto {
  @ApiProperty({
    description: 'Social platform',
    enum: ProviderSocialPlatform,
    example: ProviderSocialPlatform.FACEBOOK,
    required: false,
  })
  @IsEnum(ProviderSocialPlatform)
  @IsOptional()
  platform?: ProviderSocialPlatform;

  @ApiProperty({
    description: 'Profile URL',
    example: 'https://facebook.com/provider',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiProperty({
    description: 'Additional label',
    example: 'Official Page',
    required: false,
  })
  @IsString()
  @IsOptional()
  label?: string;
}
