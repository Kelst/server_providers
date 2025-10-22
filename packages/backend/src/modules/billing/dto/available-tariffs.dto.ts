import { ApiProperty } from '@nestjs/swagger';

/**
 * Single available tariff DTO
 */
export class AvailableTariffDto {
  @ApiProperty({
    description: 'Tariff plan ID',
    example: 1000,
  })
  tp_id: number;

  @ApiProperty({
    description: 'Tariff name',
    example: 'Максимальний 100',
  })
  name: string;

  @ApiProperty({
    description: 'Monthly payment',
    example: 250.0,
  })
  month_fee: number;

  @ApiProperty({
    description: 'Tariff speed in Mbps (rounded: ≥950 → 1000)',
    example: 100,
  })
  tariffExtentionSpeed: number;
}

/**
 * Response DTO for available tariffs
 */
export class AvailableTariffsResponseDto {
  @ApiProperty({
    description: 'List of available tariffs (excluding current tariff)',
    type: [AvailableTariffDto],
    example: [
      {
        tp_id: 1001,
        name: 'Мега 200',
        month_fee: 350.0,
        tariffExtentionSpeed: 200,
      },
      {
        tp_id: 1002,
        name: 'Стандарт 50',
        month_fee: 150.0,
        tariffExtentionSpeed: 50,
      },
    ],
  })
  available: AvailableTariffDto[];

  @ApiProperty({
    description: 'Current tariff plan ID for reference',
    example: 1000,
  })
  currentTpId: number;
}
