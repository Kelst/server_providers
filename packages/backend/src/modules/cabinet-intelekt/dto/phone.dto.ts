import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ProviderPhoneType } from '@prisma/client';

export class CreatePhoneDto {
  @ApiProperty({
    description: 'Phone number',
    example: '+380501234567',
  })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: 'Phone type',
    enum: ProviderPhoneType,
    example: ProviderPhoneType.MAIN,
  })
  @IsEnum(ProviderPhoneType)
  type: ProviderPhoneType;

  @ApiProperty({
    description: 'Additional label',
    example: 'Головний офіс Київ',
    required: false,
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({
    description: 'Is primary phone',
    example: true,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdatePhoneDto {
  @ApiProperty({
    description: 'Phone number',
    example: '+380501234567',
    required: false,
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Phone type',
    enum: ProviderPhoneType,
    example: ProviderPhoneType.MAIN,
    required: false,
  })
  @IsEnum(ProviderPhoneType)
  @IsOptional()
  type?: ProviderPhoneType;

  @ApiProperty({
    description: 'Additional label',
    example: 'Головний офіс Київ',
    required: false,
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({
    description: 'Is primary phone',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
