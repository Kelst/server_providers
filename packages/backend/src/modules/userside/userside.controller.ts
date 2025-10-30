import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersideService } from './userside.service';
import { UsersideResponseDto } from './dto';
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
}
