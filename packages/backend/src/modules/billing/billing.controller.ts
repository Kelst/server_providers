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
    summary: 'Get user fees/payments history',
    description:
      'Returns user payment history from fees table: count, total sum, and list of payments (up to 1000 most recent)',
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
}
