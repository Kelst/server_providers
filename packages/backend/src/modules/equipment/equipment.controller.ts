import { Controller, Post, Body, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { ApiTokenGuard } from '../auth/guards/api-token.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { ApiScope } from '../../common/constants/scopes.constants';
import {
  SnmpQueryDto,
  SnmpResponseDto,
  EquipmentResponseDto,
} from './dto';

/**
 * Equipment Controller
 * API endpoints for SNMP monitoring of network equipment
 */
@ApiTags('equipment')
@ApiBearerAuth('API-token')
@Controller('equipment')
@UseGuards(ApiTokenGuard, ScopeGuard)
@RequireScopes(ApiScope.EQUIPMENT)
export class EquipmentController {
  constructor(private equipmentService: EquipmentService) {}

  /**
   * Execute raw SNMP query
   */
  @Post('snmp/query')
  @ApiOperation({
    summary: 'Execute raw SNMP GET query',
    description: 'Query any SNMP OID from a device. Useful for testing and debugging.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SNMP query successful',
    type: EquipmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.GATEWAY_TIMEOUT,
    description: 'SNMP timeout - device not responding',
  })
  async querySnmp(
    @Body() queryDto: SnmpQueryDto,
  ): Promise<EquipmentResponseDto<SnmpResponseDto>> {
    try {
      const data = await this.equipmentService.querySnmp(queryDto.host, queryDto.oid);

      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: null as any,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}
