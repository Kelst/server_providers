import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UsersideService } from './userside.service';
import {
  UsersideResponseDto,
  CustomerDataResponseDto,
  AbonIdResponseDto,
  CustomerDetailsResponseDto,
  MacLocationResponseDto,
  DeviceDataResponseDto,
  CustomerTasksResponseDto,
} from './dto';
import { ApiTokenGuard } from '../auth/guards/api-token.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { EndpointAccessGuard } from '../../common/guards/endpoint-access.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { ApiScope } from '../../common/constants/scopes.constants';

/**
 * Userside Controller
 *
 * Proxies requests to Userside API with API token authentication
 * Requires 'userside' scope on API token
 */
@ApiTags('userside')
@ApiBearerAuth('API-token')
@Controller('userside')
@UseGuards(ApiTokenGuard, RateLimitGuard, ScopeGuard, EndpointAccessGuard)
@RequireScopes(ApiScope.USERSIDE)
export class UsersideController {
  constructor(private readonly usersideService: UsersideService) {}

  @Get('query')
  @ApiOperation({
    summary: 'Proxy request to Userside API',
    description:
      'Forwards query parameters to Userside API (https://us.intelekt.cv.ua/api.php). API key is automatically injected from environment.',
  })
  @ApiQuery({
    name: 'cat',
    required: true,
    description: 'Category parameter',
    example: 'customer',
  })
  @ApiQuery({
    name: 'subcat',
    required: true,
    description: 'Subcategory parameter',
    example: 'get_abon_id',
  })
  @ApiQuery({
    name: 'data_typer',
    required: false,
    description: 'Data type parameter',
    example: 'billing_uid',
  })
  @ApiQuery({
    name: 'data_value',
    required: false,
    description: 'Data value parameter',
    example: '140278',
  })
  @ApiResponse({
    status: 200,
    description: 'Response from Userside API',
    type: UsersideResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing userside scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Userside API error' })
  async query(@Query() params: Record<string, any>): Promise<UsersideResponseDto> {
    return this.usersideService.query(params);
  }

  @Get('customer/:uid')
  @ApiOperation({
    summary: 'Get complete customer data with device information',
    description:
      'Retrieves comprehensive customer data from Userside by billing UID. Implements pipeline: uid → customer_id → customer_data → MAC lookup → device_info. Returns partial data with warnings if some API calls fail. Response is cached for 30-60 seconds.',
  })
  @ApiParam({
    name: 'uid',
    description: 'Billing UID (billing_uid from Abills)',
    example: '140278',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer data with device information',
    type: CustomerDataResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found by UID',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing userside scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getCustomerData(
    @Param('uid') uid: string,
  ): Promise<CustomerDataResponseDto> {
    return this.usersideService.getCustomerData(uid);
  }

  @Get('abon-id/:uid')
  @ApiOperation({
    summary: 'Get customer ID from billing UID',
    description:
      'Converts billing UID to Userside customer ID. Response is cached for 30 seconds.',
  })
  @ApiParam({
    name: 'uid',
    description: 'Billing UID (billing_uid from Abills)',
    example: '140278',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer ID retrieved successfully',
    type: AbonIdResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found by UID',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing userside scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getAbonId(@Param('uid') uid: string): Promise<AbonIdResponseDto> {
    return this.usersideService.getAbonIdResponse(uid);
  }

  @Get('customer-details/:customerId')
  @ApiOperation({
    summary: 'Get customer details by customer ID',
    description:
      'Retrieves customer information from Userside by customer ID. Response is cached for 30 seconds.',
  })
  @ApiParam({
    name: 'customerId',
    description: 'Customer ID from Userside',
    example: 96754,
  })
  @ApiResponse({
    status: 200,
    description: 'Customer details retrieved successfully',
    type: CustomerDetailsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Customer details not found',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing userside scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getCustomerDetails(
    @Param('customerId') customerId: string,
  ): Promise<CustomerDetailsResponseDto> {
    return this.usersideService.getCustomerDetailsResponse(+customerId);
  }

  @Get('mac-location/:mac')
  @ApiOperation({
    summary: 'Find MAC address on devices',
    description:
      'Locates MAC address on network devices. Returns all records within 10 hours of the freshest record. Accepts MAC in any format (with/without separators). Response is cached for 30 seconds.',
  })
  @ApiParam({
    name: 'mac',
    description: 'MAC address (any format: 90:9A:4A:95:5F:20, 909a4a955f20, etc.)',
    example: '90:9A:4A:95:5F:20',
  })
  @ApiResponse({
    status: 200,
    description: 'MAC location records retrieved successfully',
    type: MacLocationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid MAC address format',
  })
  @ApiResponse({
    status: 404,
    description: 'MAC address not found on any device',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing userside scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getMacLocation(
    @Param('mac') mac: string,
  ): Promise<MacLocationResponseDto> {
    return this.usersideService.getMacLocationResponse(mac);
  }

  @Get('device/:deviceId')
  @ApiOperation({
    summary: 'Get device data by device ID',
    description:
      'Retrieves device information from Userside by device ID. Includes SNMP credentials, VLAN configuration, and device status. Response is cached for 30 seconds.',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID from Userside',
    example: 125646,
  })
  @ApiResponse({
    status: 200,
    description: 'Device data retrieved successfully',
    type: DeviceDataResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing userside scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getDeviceData(
    @Param('deviceId') deviceId: string,
  ): Promise<DeviceDataResponseDto> {
    return this.usersideService.getDeviceDataResponse(deviceId);
  }

  @Get('customer-tasks/:customerId')
  @ApiOperation({
    summary: 'Get customer tasks with full analytics',
    description:
      'Retrieves all tasks for a customer with comprehensive analytics. Includes execution time calculations, time between tasks, average completion time, and statistics. Response is cached for 30 seconds.',
  })
  @ApiParam({
    name: 'customerId',
    description: 'Customer ID from Userside',
    example: 138343,
  })
  @ApiResponse({
    status: 200,
    description: 'Customer tasks with analytics retrieved successfully',
    type: CustomerTasksResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No tasks found for customer',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing userside scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve tasks' })
  async getCustomerTasks(
    @Param('customerId') customerId: string,
  ): Promise<CustomerTasksResponseDto> {
    return this.usersideService.getCustomerTasks(+customerId);
  }
}
