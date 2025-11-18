import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for ONU VLAN configuration operation
 */
export class OnuSetVlanResponseDto {
  @ApiProperty({
    description: 'Whether ONU was online before configuring VLAN',
    example: true,
  })
  onuWasOnline: boolean;

  @ApiProperty({
    description: 'VLAN ID that was configured',
    example: 815,
  })
  vlanId: number;

  @ApiProperty({
    description: 'Raw output from all executed commands',
    type: [String],
    example: [
      'config...',
      'interface ePON 0/8:15...',
      'epon onu port 1 ctc vlan mode tag 815...',
      'exit...',
      'exit...',
    ],
  })
  commandOutputs: string[];

  @ApiProperty({
    description: 'Success message',
    example: 'VLAN configured successfully',
  })
  message: string;
}
