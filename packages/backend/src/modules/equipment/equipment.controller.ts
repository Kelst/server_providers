import { Controller, Post, Body, UseGuards, HttpStatus, Request } from '@nestjs/common';
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
  TelnetExecuteDto,
  TelnetResponseDto,
  RawCommandResponseDto,
  OnuStatusRequestDto,
  OnuStatusResponseDto,
  SignalLevelRequestDto,
  SignalLevelResponseDto,
} from './dto';

/**
 * Equipment Controller
 * API endpoints for SNMP and Telnet monitoring of network equipment (OLT devices)
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
   * Execute raw telnet command (universal endpoint)
   */
  @Post('telnet/execute')
  @ApiOperation({
    summary: 'Execute raw telnet command on OLT device',
    description:
      'Execute any telnet command on OLT device. Useful for debugging and admin operations. Command output and execution details are automatically logged.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Telnet command executed successfully',
    type: TelnetResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or credentials',
  })
  @ApiResponse({
    status: HttpStatus.GATEWAY_TIMEOUT,
    description: 'Telnet connection timeout',
  })
  async executeTelnetCommand(
    @Body() dto: TelnetExecuteDto,
    @Request() req: any,
  ): Promise<TelnetResponseDto<RawCommandResponseDto>> {
    const tokenId = req.user?.tokenId;
    return this.equipmentService.executeTelnetCommand(dto, tokenId);
  }

  /**
   * Get ONU status (vendor-specific)
   */
  @Post('olt/onu-status')
  @ApiOperation({
    summary: 'Get ONU status information',
    description:
      'Retrieve status information for a specific ONU (online/offline, type, MAC, distance, etc.). Uses vendor-specific commands and parsers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ONU status retrieved successfully',
    type: TelnetResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters or unsupported vendor',
  })
  async getOnuStatus(
    @Body() dto: OnuStatusRequestDto,
    @Request() req: any,
  ): Promise<TelnetResponseDto<OnuStatusResponseDto>> {
    const tokenId = req.user?.tokenId;
    return this.equipmentService.getOnuStatus(dto, tokenId);
  }

  /**
   * Get ONU signal level (vendor-specific)
   */
  @Post('olt/signal-level')
  @ApiOperation({
    summary: 'Get ONU signal level (DDM)',
    description:
      'Retrieve ONU optical signal levels: RX/TX power, temperature, voltage, bias current. Uses vendor-specific DDM commands.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signal level retrieved successfully',
    type: TelnetResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters or unsupported vendor',
  })
  async getSignalLevel(
    @Body() dto: SignalLevelRequestDto,
    @Request() req: any,
  ): Promise<TelnetResponseDto<SignalLevelResponseDto>> {
    const tokenId = req.user?.tokenId;
    return this.equipmentService.getSignalLevel(dto, tokenId);
  }
}
