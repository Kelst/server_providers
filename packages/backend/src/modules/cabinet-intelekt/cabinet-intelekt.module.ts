import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CabinetIntelektController } from './cabinet-intelekt.controller';
import { CabinetIntelektAdminController } from './cabinet-intelekt-admin.controller';
import { CabinetIntelektService } from './cabinet-intelekt.service';
import { TelegramService } from './services/telegram.service';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure uploads directories exist
const uploadsDir = join(process.cwd(), 'uploads', 'provider');
const videosDir = join(process.cwd(), 'uploads', 'videos');
const thumbnailsDir = join(process.cwd(), 'uploads', 'videos', 'thumbnails');
const newsDir = join(process.cwd(), 'uploads', 'news');

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}
if (!existsSync(videosDir)) {
  mkdirSync(videosDir, { recursive: true });
}
if (!existsSync(thumbnailsDir)) {
  mkdirSync(thumbnailsDir, { recursive: true });
}
if (!existsSync(newsDir)) {
  mkdirSync(newsDir, { recursive: true });
}

@Module({
  imports: [
    AuthModule, // For ApiTokenGuard and JwtAuthGuard
    DatabaseModule, // For PrismaService
    MulterModule.register({
      dest: uploadsDir,
    }),
  ],
  controllers: [
    CabinetIntelektController,
    CabinetIntelektAdminController,
  ],
  providers: [CabinetIntelektService, TelegramService],
  exports: [CabinetIntelektService],
})
export class CabinetIntelektModule {}
