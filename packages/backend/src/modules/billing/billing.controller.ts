import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ApiTokenGuard } from '../auth/guards/api-token.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { ApiScope } from '../../common/constants/scopes.constants';
import { BillingService } from './billing.service';
import { UserDataService } from './user-data.service';
import { BillingLoginDto, BillingLoginResponseDto } from './dto/billing-auth.dto';
import {
  UserBasicInfoDto,
  InternetInfoDto,
  SessionInfoDto,
  TariffInfoDto,
  BillingInfoDto,
  FamilyAccountDto,
  AdditionalServicesDto,
  FullUserDataDto,
} from './dto/user-info.dto';
import { FeesResponseDto } from './dto/fees.dto';
import { PaymentsResponseDto } from './dto/payments.dto';
import { SessionHistoryResponseDto } from './dto/session-history.dto';
import { ReloadSessionResponseDto, ClearCidResponseDto } from './dto/session-reload.dto';
import { AddCreditResponseDto } from './dto/credit.dto';
import {
  RequestPhoneChangeDto,
  RequestPhoneChangeResponseDto,
  ConfirmPhoneChangeDto,
  ConfirmPhoneChangeResponseDto,
} from './dto/phone-change.dto';
import {
  PhoneLoginRequestDto,
  PhoneLoginRequestResponseDto,
  PhoneLoginVerifyDto,
  PhoneLoginVerifyResponseDto,
} from './dto/phone-login.dto';
import { AvailableTariffsResponseDto } from './dto/available-tariffs.dto';
import { ChangeTariffDto, ChangeTariffResponseDto } from './dto/change-tariff.dto';

@ApiTags('billing')
@ApiBearerAuth('API-token')
@Controller('billing')
@UseGuards(ApiTokenGuard, ScopeGuard)
@RequireScopes(ApiScope.BILLING)
export class BillingController {
  constructor(
    private billingService: BillingService,
    private userDataService: UserDataService,
  ) {}

  @Post('auth/login')
  @ApiOperation({
    summary: 'Login to Abills billing system',
    description:
      'Authenticate user against Abills MySQL database. Returns user data including uid (NO TOKEN). Client manages session. All subsequent billing API calls will require the uid parameter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: BillingLoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(
    @Body() loginDto: BillingLoginDto,
  ): Promise<BillingLoginResponseDto> {
    return this.billingService.login(loginDto.login, loginDto.password);
  }

  @Post('auth/phone/request')
  @ApiOperation({
    summary: 'Request phone login (send verification code)',
    description:
      'Initiates phone-based login. Finds user by phone number within the specified provider, sends 6-digit verification code via Telegram (with SMS fallback). Code is valid for 5 minutes. Rate limit: 3 attempts per 15 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent successfully or rate limit exceeded',
    type: PhoneLoginRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (user not found, invalid phone format, etc.)',
  })
  async requestPhoneLogin(
    @Body() dto: PhoneLoginRequestDto,
  ): Promise<PhoneLoginRequestResponseDto> {
    return this.billingService.requestPhoneLogin(dto.phoneNumber, dto.provider);
  }

  @Post('auth/phone/verify')
  @ApiOperation({
    summary: 'Verify phone login code',
    description:
      'Verifies the 6-digit code sent to user phone. Returns user data (uid, login, company, status) if code is valid. Code is deleted after successful verification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Code verified successfully or invalid/expired code',
    type: PhoneLoginVerifyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid code, expired, etc.)',
  })
  async verifyPhoneLogin(
    @Body() dto: PhoneLoginVerifyDto,
  ): Promise<PhoneLoginVerifyResponseDto> {
    return this.billingService.verifyPhoneLogin(dto.phoneNumber, dto.provider, dto.code);
  }

  // ==================== User Data Endpoints ====================

  @Get('users/:uid')
  @ApiOperation({
    summary: 'Get basic user information',
    description: 'Returns basic user info: name, phone, address, login, password, telegram',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({ status: 200, description: 'User basic info', type: UserBasicInfoDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserBasicInfo(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<UserBasicInfoDto> {
    return this.userDataService.getUserBasicInfo(uid);
  }

  @Get('users/:uid/internet')
  @ApiOperation({
    summary: 'Get internet connection information',
    description: 'Returns internet connection details: IP, status, CID',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({ status: 200, description: 'Internet info', type: InternetInfoDto })
  @ApiResponse({ status: 404, description: 'Internet connection not found' })
  async getInternetInfo(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<InternetInfoDto> {
    return this.userDataService.getInternetInfo(uid);
  }

  @Get('users/:uid/session')
  @ApiOperation({
    summary: 'Get current session information',
    description: 'Returns current online session: duration, traffic, guest IP',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({ status: 200, description: 'Session info', type: SessionInfoDto })
  async getSessionInfo(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<SessionInfoDto> {
    return this.userDataService.getSessionInfo(uid);
  }

  @Get('users/:uid/sessions/history')
  @ApiOperation({
    summary: 'Get session history',
    description:
      'Returns user session history from internet_log table: start time, tariff, duration, traffic sent/received, CID, guest IP. Returns up to 1000 most recent sessions ordered by start date (descending).',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'Session history with count and list of sessions',
    type: SessionHistoryResponseDto,
  })
  async getSessionHistory(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<SessionHistoryResponseDto> {
    return this.userDataService.getSessionHistory(uid);
  }

  @Get('users/:uid/tariff')
  @ApiOperation({
    summary: 'Get tariff information',
    description: 'Returns user tariff: name, monthly payment, speed',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({ status: 200, description: 'Tariff info', type: TariffInfoDto })
  @ApiResponse({ status: 404, description: 'Tariff not found' })
  async getTariffInfo(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<TariffInfoDto> {
    return this.userDataService.getTariffInfo(uid);
  }

  @Get('users/:uid/tariffs/available')
  @ApiOperation({
    summary: 'Get available tariffs for user',
    description:
      'Returns available tariff plans that user can switch to. Excludes current tariff. Only shows tariffs from the same gid group, with status=0 and module=Internet. Sorted by speed (descending).',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'List of available tariffs',
    type: AvailableTariffsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User does not have a tariff plan assigned' })
  async getAvailableTariffs(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<AvailableTariffsResponseDto> {
    return this.userDataService.getAvailableTariffs(uid);
  }

  @Get('users/:uid/billing')
  @ApiOperation({
    summary: 'Get billing information',
    description: 'Returns billing info: balance, deposit, discount, group',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({ status: 200, description: 'Billing info', type: BillingInfoDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getBillingInfo(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<BillingInfoDto> {
    return this.userDataService.getBillingInfo(uid);
  }

  @Get('users/:uid/family')
  @ApiOperation({
    summary: 'Get family accounts (sublogins)',
    description: 'Returns list of family members sharing the same phone number',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({ status: 200, description: 'Family accounts', type: [FamilyAccountDto] })
  async getFamilyAccounts(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<FamilyAccountDto[]> {
    const basicInfo = await this.userDataService.getUserBasicInfo(uid);
    return this.userDataService.getFamilyAccounts(uid, basicInfo.phone, basicInfo.company);
  }

  @Get('users/:uid/services')
  @ApiOperation({
    summary: 'Get additional services',
    description: 'Returns list of additional services (IPTV, subscriptions) and total price',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({ status: 200, description: 'Additional services', type: AdditionalServicesDto })
  async getAdditionalServices(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<AdditionalServicesDto> {
    return this.userDataService.getAdditionalServices(uid);
  }

  @Get('users/:uid/full')
  @ApiOperation({
    summary: 'Get full user data',
    description: 'Returns all user information aggregated in one response',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({ status: 200, description: 'Full user data', type: FullUserDataDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getFullUserData(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<FullUserDataDto> {
    return this.userDataService.getFullUserData(uid);
  }

  @Get('users/:uid/fees')
  @ApiOperation({
    summary: 'Get user fees history (outgoing funds)',
    description:
      'Returns user fees/charges history from fees table: count, total sum, and list of fees (up to 1000 most recent)',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'Fees data with statistics and payment history',
    type: FeesResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getFees(@Param('uid', ParseIntPipe) uid: number): Promise<FeesResponseDto> {
    return this.userDataService.getFees(uid);
  }

  @Get('users/:uid/payments')
  @ApiOperation({
    summary: 'Get user payments history (incoming funds)',
    description:
      'Returns user payments/deposits history from payments table: count, total sum, and list of payments (up to 1000 most recent)',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'Payments data with statistics and payment history',
    type: PaymentsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPayments(@Param('uid', ParseIntPipe) uid: number): Promise<PaymentsResponseDto> {
    return this.userDataService.getPayments(uid);
  }

  @Post('users/:uid/session/reload')
  @ApiOperation({
    summary: 'Reload user session (hangup)',
    description:
      'Schedules a session hangup for the user after 10 seconds. Also clears the user CID (MAC address) immediately. Protected from duplicate requests - only one reload job can be active at a time per user.',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'Session reload scheduled successfully or already in progress',
    type: ReloadSessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Active session not found' })
  async reloadSession(
    @Param('uid', ParseIntPipe) uid: number,
  ): Promise<ReloadSessionResponseDto> {
    return this.billingService.reloadSession(uid);
  }

  @Post('users/:uid/cid/clear')
  @ApiOperation({
    summary: 'Clear user CID (MAC address)',
    description:
      'Clears the user CID (MAC address) in internet_main table and logs the action. Does NOT reload the session.',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'CID cleared successfully',
    type: ClearCidResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async clearCid(@Param('uid', ParseIntPipe) uid: number): Promise<ClearCidResponseDto> {
    return this.billingService.clearCid(uid);
  }

  @Post('users/:uid/credit/add')
  @ApiOperation({
    summary: 'Add credit to user account',
    description:
      'Sets credit for user (once per month limit). Credit amount: 4444 by default, or abs(balance) + 4444 if balance is negative. Credit is valid for 5 days. Automatically reloads session after 10 seconds. Login is fetched automatically from database.',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'Credit added successfully or validation error',
    type: AddCreditResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request (user not found, already has credit, etc.)' })
  async addCredit(@Param('uid', ParseIntPipe) uid: number): Promise<AddCreditResponseDto> {
    return this.billingService.addCredit(uid);
  }

  @Post('users/:uid/phone/request')
  @ApiOperation({
    summary: 'Request phone number change',
    description:
      'Initiates phone number change process. Sends a 6-digit verification code via SMS to the new phone number. Code is valid for 5 minutes.',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent successfully',
    type: RequestPhoneChangeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request (user not found, invalid phone, etc.)' })
  async requestPhoneChange(
    @Param('uid', ParseIntPipe) uid: number,
    @Body() dto: RequestPhoneChangeDto,
  ): Promise<RequestPhoneChangeResponseDto> {
    return this.billingService.requestPhoneChange(uid, dto.newPhone);
  }

  @Post('users/:uid/phone/confirm')
  @ApiOperation({
    summary: 'Confirm phone number change',
    description:
      'Confirms phone number change by verifying the 6-digit code. Updates phone number in users_contacts table and logs the action to admin_actions.',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'Phone number updated successfully',
    type: ConfirmPhoneChangeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid code or code expired' })
  async confirmPhoneChange(
    @Param('uid', ParseIntPipe) uid: number,
    @Body() dto: ConfirmPhoneChangeDto,
  ): Promise<ConfirmPhoneChangeResponseDto> {
    return this.billingService.confirmPhoneChange(uid, dto.code);
  }

  @Post('users/:uid/tariff/change')
  @ApiOperation({
    summary: 'Change tariff plan',
    description:
      'Changes user tariff plan to a new one. Rate limited to 1 change per calendar month. Validates that new tariff is available (same gid group). Calls Abills API, logs to admin_actions, and saves to PostgreSQL history (only on API success).',
  })
  @ApiParam({ name: 'uid', description: 'User ID', example: 140278 })
  @ApiResponse({
    status: 200,
    description: 'Tariff changed successfully',
    type: ChangeTariffResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request (user not found, tariff unavailable, same tariff, monthly limit exceeded, etc.)',
  })
  async changeTariff(
    @Param('uid', ParseIntPipe) uid: number,
    @Body() dto: ChangeTariffDto,
  ): Promise<ChangeTariffResponseDto> {
    return this.billingService.changeTariff(uid, dto.tpId);
  }
}
