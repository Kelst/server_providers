import { ApiProperty } from '@nestjs/swagger';

/**
 * Response for session reload request
 */
export class ReloadSessionResponseDto {
  @ApiProperty({
    description: 'Whether the session reload request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Запит на скидання сесії заплановано',
  })
  message: string;

  @ApiProperty({
    description: 'Bull queue job ID for tracking',
    example: '1234567890',
    required: false,
  })
  jobId?: string;
}

/**
 * Interface for session data from database
 */
export interface SessionData {
  user_name: string;
  nas_port_id: string;
  acct_session_id: string;
  nas_id: string;
}

/**
 * Interface for billing API request
 */
export interface BillingApiRequest {
  acctSessionId: string;
  nasId: string;
  nasPortId: string;
  userName: string;
}

/**
 * Response for CID clear request
 */
export class ClearCidResponseDto {
  @ApiProperty({
    description: 'Whether the CID clear operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'CID успішно очищено',
  })
  message: string;
}
