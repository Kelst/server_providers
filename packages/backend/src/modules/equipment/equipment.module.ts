import { Module } from '@nestjs/common';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { SnmpService } from './snmp.service';
import { TelnetService } from './telnet.service';
import { VendorFactory } from './vendors/vendor.factory';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';

/**
 * Equipment Module
 * Provides SNMP and Telnet monitoring capabilities for network equipment (OLT devices)
 */
@Module({
  imports: [
    AuthModule, // Required for ApiTokenGuard
    DatabaseModule, // Required for PrismaService (telnet command logging)
  ],
  controllers: [EquipmentController],
  providers: [
    EquipmentService,
    SnmpService,
    TelnetService,
    VendorFactory,
  ],
  exports: [
    EquipmentService,
    SnmpService,
    TelnetService,
    VendorFactory,
  ], // Export for potential use in other modules
})
export class EquipmentModule {}
