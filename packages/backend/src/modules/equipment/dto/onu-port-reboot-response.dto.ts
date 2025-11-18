import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for ONU port reboot operation
 */
export class OnuPortRebootResponseDto {
  @ApiProperty({
    description: 'Whether ONU was online before reboot',
    example: true,
  })
  onuWasOnline: boolean;

  @ApiProperty({
    description: 'Raw output from all executed commands',
    type: [String],
    example: [
      'configure terminal...',
      'interface ePON 0/8:15...',
      'epon onu port 1 ctc shutdown...',
      'no epon onu port 1 ctc shutdown...',
      'exit...',
      'exit...',
    ],
  })
  commandOutputs: string[];

  @ApiProperty({
    description: 'Success message',
    example: 'ONU port rebooted successfully',
  })
  message: string;
}
