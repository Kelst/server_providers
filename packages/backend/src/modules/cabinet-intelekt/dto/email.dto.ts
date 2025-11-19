import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsEmail,
} from 'class-validator';
import { ProviderEmailType } from '@prisma/client';

export class CreateEmailDto {
  @ApiProperty({
    description: 'Email address',
    example: 'support@provider.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Email type',
    enum: ProviderEmailType,
    example: ProviderEmailType.SUPPORT,
  })
  @IsEnum(ProviderEmailType)
  type: ProviderEmailType;

  @ApiProperty({
    description: 'Additional label',
    example: 'Technical Support',
    required: false,
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({
    description: 'Is primary email',
    example: true,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateEmailDto {
  @ApiProperty({
    description: 'Email address',
    example: 'support@provider.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Email type',
    enum: ProviderEmailType,
    example: ProviderEmailType.SUPPORT,
    required: false,
  })
  @IsEnum(ProviderEmailType)
  @IsOptional()
  type?: ProviderEmailType;

  @ApiProperty({
    description: 'Additional label',
    example: 'Technical Support',
    required: false,
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({
    description: 'Is primary email',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
