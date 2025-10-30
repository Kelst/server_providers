import { Module } from '@nestjs/common';
import { UsersideController } from './userside.controller';
import { UsersideService } from './userside.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Userside Module
 *
 * Provides proxy functionality to Userside API
 * Requires API token with 'userside' scope
 */
@Module({
  imports: [AuthModule], // Required for ApiTokenGuard
  controllers: [UsersideController],
  providers: [UsersideService],
  exports: [UsersideService], // Export service for potential use in other modules
})
export class UsersideModule {}
