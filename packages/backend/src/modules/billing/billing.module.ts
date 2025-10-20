import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { MySQLService } from './mysql.service';
import { CompanyService } from './company.service';
import { UserDataService } from './user-data.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Import AuthModule for ApiTokenGuard
  controllers: [BillingController],
  providers: [
    BillingService,
    MySQLService,
    CompanyService,
    UserDataService,
  ],
  exports: [
    BillingService,
    MySQLService,
    CompanyService,
    UserDataService,
  ],
})
export class BillingModule {}
