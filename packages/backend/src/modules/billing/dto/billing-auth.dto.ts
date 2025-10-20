import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO for billing user login request
 */
export class BillingLoginDto {
  @ApiProperty({
    description: 'Billing user login/username',
    example: 'vlad_b_1',
  })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({
    description: 'Billing user password',
    example: 'V1234567',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;
}

/**
 * DTO for billing user login response
 */
export class BillingLoginResponseDto {
  @ApiProperty({
    description: 'Login success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'User ID from Abills database',
    example: 140278,
  })
  uid: number;

  @ApiProperty({
    description: 'User login/username',
    example: 'vlad_b_1',
  })
  login: string;

  @ApiProperty({
    description: 'Company name from config_gid table',
    example: 'ACME Corp',
  })
  company: string;

  @ApiProperty({
    description: 'User status from config_gid table (0 or 1)',
    example: 1,
  })
  status: number;

  @ApiProperty({
    description: 'Success/error message',
    example: 'Successfully authenticated',
  })
  message: string;
}
