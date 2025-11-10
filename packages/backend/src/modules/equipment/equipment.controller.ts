import { Controller, Post, Body, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { ApiTokenGuard } from '../auth/guards/api-token.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { ApiScope } from '../../common/constants/scopes.constants';
import {
  SnmpQueryDto,
  BdcomDeviceQueryDto,
  SnmpResponseDto,
  BdcomSystemInfoDto,
  EquipmentResponseDto,
  OnuQueryDto,
  OnuStatusDto,
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

  /**
   * Get BDCOM OLT system information
   */
  @Post('bdcom/system-info')
  @ApiOperation({
    summary: 'Get BDCOM OLT system information',
    description:
      'Retrieve system information from BDCOM OLT including description, uptime, location, etc.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System information retrieved successfully',
    type: EquipmentResponseDto,
  })
  async getBdcomSystemInfo(
    @Body() queryDto: BdcomDeviceQueryDto,
  ): Promise<EquipmentResponseDto<BdcomSystemInfoDto>> {
    try {
      const data = await this.equipmentService.getBdcomSystemInfo(queryDto.host);

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

  /**
   * Get BDCOM ONU status and optical power
   */
  @Post('bdcom/onu-status')
  @ApiOperation({
    summary: 'Get BDCOM ONU status and optical power',
    description:
      'Retrieve ONU status, RX/TX optical power, and details for a specific ONU on BDCOM OLT',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ONU status retrieved successfully',
    type: EquipmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ONU not found - device may be offline or port is invalid',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid port format - expected format: EPON0/8:15',
  })
  async getBdcomOnuStatus(
    @Body() queryDto: OnuQueryDto,
  ): Promise<EquipmentResponseDto<OnuStatusDto>> {
    try {
      const data = await this.equipmentService.getBdcomOnuStatus(
        queryDto.host,
        queryDto.port,
      );

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
