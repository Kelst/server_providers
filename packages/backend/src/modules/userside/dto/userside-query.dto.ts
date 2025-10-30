import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for Userside API query parameters
 */
export class UsersideQueryDto {
  @ApiProperty({
    description: 'Category',
    example: 'customer',
  })
  @IsString()
  @IsNotEmpty()
  cat: string;

  @ApiProperty({
    description: 'Subcategory',
    example: 'get_abon_id',
  })
  @IsString()
  @IsNotEmpty()
  subcat: string;

  @ApiProperty({
    description: 'Data type',
    example: 'billing_uid',
    required: false,
  })
  @IsString()
  @IsOptional()
  data_typer?: string;

  @ApiProperty({
    description: 'Data value',
    example: '140278',
    required: false,
  })
  @IsString()
  @IsOptional()
  data_value?: string;

  // Additional dynamic parameters can be passed
  [key: string]: any;
}

/**
 * Response DTO from Userside API
 */
export class UsersideResponseDto {
  @ApiProperty({
    description: 'Response data from Userside API',
    example: { success: true, data: {} },
  })
  data: any;

  @ApiProperty({
    description: 'HTTP status code from Userside API',
    example: 200,
  })
  status: number;
}
