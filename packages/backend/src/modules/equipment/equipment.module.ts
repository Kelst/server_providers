import { Module } from '@nestjs/common';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { SnmpService } from './snmp.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Equipment Module
 * Provides SNMP monitoring capabilities for network equipment
 */
@Module({
  imports: [AuthModule], // Required for ApiTokenGuard
  controllers: [EquipmentController],
  providers: [EquipmentService, SnmpService],
  exports: [EquipmentService, SnmpService], // Export for potential use in other modules
})
export class EquipmentModule {}
