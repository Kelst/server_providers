import { ApiProperty } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({ description: 'Audit log ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({
    description: 'Provider ID',
    example: 'uuid-here',
    nullable: true,
  })
  providerId: string | null;

  @ApiProperty({ description: 'Admin ID', example: 'uuid-here' })
  adminId: string;

  @ApiProperty({
    description: 'Action performed',
    example: 'updated',
    enum: [
      'created',
      'updated',
      'deleted',
      'logo_uploaded',
      'logo_deleted',
    ],
  })
  action: string;

  @ApiProperty({
    description: 'Entity type',
    example: 'info',
    enum: ['info', 'phone', 'email', 'social'],
  })
  entityType: string;

  @ApiProperty({
    description: 'Entity ID',
    example: 'uuid-here',
    nullable: true,
  })
  entityId: string | null;

  @ApiProperty({
    description: 'Changes made',
    example: { companyName: { old: 'Old Name', new: 'New Name' } },
    nullable: true,
  })
  changes: any;

  @ApiProperty({
    description: 'Admin details',
    example: {
      id: 'uuid-here',
      email: 'admin@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  })
  admin: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };

  @ApiProperty({
    description: 'IP address',
    example: '127.0.0.1',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'User agent',
    example: 'Mozilla/5.0...',
    nullable: true,
  })
  userAgent: string | null;

  @ApiProperty({ description: 'Created at', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;
}
