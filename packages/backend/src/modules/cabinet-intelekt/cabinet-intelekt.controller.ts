import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CabinetIntelektService } from './cabinet-intelekt.service';
import { ProviderInfoResponseDto } from './dto';
import { ApiTokenGuard } from '../auth/guards/api-token.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { EndpointAccessGuard } from '../../common/guards/endpoint-access.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { ApiScope } from '../../common/constants/scopes.constants';

/**
 * Public Cabinet Intelekt Controller
 * For mobile apps with API Token authentication
 */
@ApiTags('cabinet_intelekt')
@ApiBearerAuth('API-token')
@Controller('cabinet-intelekt')
@UseGuards(ApiTokenGuard, RateLimitGuard, ScopeGuard, EndpointAccessGuard)
@RequireScopes(ApiScope.CABINET_INTELEKT)
export class CabinetIntelektController {
  constructor(private readonly service: CabinetIntelektService) {}

  @Get('info')
  @ApiOperation({
    summary: 'Get provider information',
    description:
      'Retrieve complete provider information including company details, contact information, and social media links. This endpoint is intended for mobile applications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider information retrieved successfully',
    type: ProviderInfoResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing required scope' })
  @ApiResponse({ status: 404, description: 'Provider information not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getProviderInfo(): Promise<ProviderInfoResponseDto> {
    return this.service.getProviderInfo();
  }
}
