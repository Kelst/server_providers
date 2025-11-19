import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CabinetIntelektController } from './cabinet-intelekt.controller';
import { CabinetIntelektAdminController } from './cabinet-intelekt-admin.controller';
import { CabinetIntelektService } from './cabinet-intelekt.service';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), 'uploads', 'provider');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

@Module({
  imports: [
    AuthModule, // For ApiTokenGuard and JwtAuthGuard
    DatabaseModule, // For PrismaService
    MulterModule.register({
      dest: uploadsDir,
    }),
  ],
  controllers: [CabinetIntelektController, CabinetIntelektAdminController],
  providers: [CabinetIntelektService],
  exports: [CabinetIntelektService],
})
export class CabinetIntelektModule {}
