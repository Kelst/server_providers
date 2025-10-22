import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * Request DTO for changing tariff plan
 */
export class ChangeTariffDto {
  @ApiProperty({
    description: 'New tariff plan ID (tp_id from tarif_plans)',
    example: 1001,
  })
  @IsInt()
  @Min(1)
  tpId: number;
}

/**
 * Response DTO for successful tariff change
 */
export class ChangeTariffResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Status message',
    example: 'Тариф успішно змінено',
  })
  message: string;

  @ApiProperty({
    description: 'Old tariff plan ID',
    example: 1000,
  })
  oldTpId: number;

  @ApiProperty({
    description: 'Old tariff name',
    example: 'Максимальний 100',
  })
  oldTariffName: string;

  @ApiProperty({
    description: 'New tariff plan ID',
    example: 1001,
  })
  newTpId: number;

  @ApiProperty({
    description: 'New tariff name',
    example: 'Мега 200',
  })
  newTariffName: string;

  @ApiProperty({
    description: 'When the change was applied',
    example: '2025-10-21T15:42:00.000Z',
  })
  changedAt: Date;
}
