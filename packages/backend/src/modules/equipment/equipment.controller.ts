import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { PppoeVlanService } from './pppoe-vlan.service';
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
  OnuDetailsRequestDto,
  OnuDetailsResponseDto,
  CreatePppoeVlanDto,
  UpdatePppoeVlanDto,
  PppoeVlanResponseDto,
  PppoeVlanQueryDto,
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
  constructor(
    private equipmentService: EquipmentService,
    private pppoeVlanService: PppoeVlanService,
  ) {}

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

  /**
   * Get ONU detailed configuration and state (vendor-specific)
   */
  @Post('olt/onu-details')
  @ApiOperation({
    summary: 'Get ONU detailed configuration and state',
    description:
      'Retrieve ONU configuration, MAC addresses, and port state using vendor-specific commands. Executes 3 sequential commands: running-config, mac address-table, and port state.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ONU details retrieved successfully',
    type: TelnetResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters or unsupported vendor',
  })
  async getOnuDetails(
    @Body() dto: OnuDetailsRequestDto,
    @Request() req: any,
  ): Promise<TelnetResponseDto<OnuDetailsResponseDto>> {
    const tokenId = req.user?.tokenId;
    return this.equipmentService.getOnuDetails(dto, tokenId);
  }

  // ==================== PPPoE VLAN Configuration Endpoints ====================

  /**
   * Get all PPPoE VLAN configurations (with optional filtering)
   */
  @Get('pppoe-vlans')
  @ApiOperation({
    summary: 'Get all PPPoE VLAN configurations',
    description: 'Retrieve all OLT IP to PPPoE VLAN mappings. Supports filtering by IP or VLAN ID.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of PPPoE VLAN configurations',
  })
  async findAllPppoeVlans(@Query() query: PppoeVlanQueryDto) {
    return this.pppoeVlanService.findAll(query);
  }

  /**
   * Get PPPoE VLAN configuration by ID
   */
  @Get('pppoe-vlans/:id')
  @ApiOperation({
    summary: 'Get PPPoE VLAN configuration by ID',
    description: 'Retrieve a single PPPoE VLAN configuration by its UUID.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PPPoE VLAN configuration found',
    type: PppoeVlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuration not found',
  })
  async findOnePppoeVlan(@Param('id') id: string) {
    return this.pppoeVlanService.findOne(id);
  }

  /**
   * Get VLAN by OLT IP address (fast lookup)
   */
  @Get('pppoe-vlans/by-ip/:ip')
  @ApiOperation({
    summary: 'Get VLAN by OLT IP address',
    description: 'Fast lookup to get PPPoE VLAN ID for a specific OLT IP address.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'VLAN configuration found',
    type: PppoeVlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuration not found for this IP',
  })
  async findPppoeVlanByIp(@Param('ip') ip: string) {
    return this.pppoeVlanService.findByIp(ip);
  }

  /**
   * Create new PPPoE VLAN configuration
   */
  @Post('pppoe-vlans')
  @ApiOperation({
    summary: 'Create PPPoE VLAN configuration',
    description: 'Map OLT IP address to PPPoE VLAN ID. IP must be unique.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Configuration created successfully',
    type: PppoeVlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Configuration for this IP already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid IP address or VLAN ID',
  })
  async createPppoeVlan(
    @Body() dto: CreatePppoeVlanDto,
    @Request() req: any,
  ) {
    const tokenId = req.user?.tokenId;
    return this.pppoeVlanService.create(dto, tokenId);
  }

  /**
   * Update existing PPPoE VLAN configuration
   */
  @Patch('pppoe-vlans/:id')
  @ApiOperation({
    summary: 'Update PPPoE VLAN configuration',
    description: 'Update OLT IP, VLAN ID, or description. IP must remain unique.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration updated successfully',
    type: PppoeVlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuration not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'New IP already exists',
  })
  async updatePppoeVlan(
    @Param('id') id: string,
    @Body() dto: UpdatePppoeVlanDto,
  ) {
    return this.pppoeVlanService.update(id, dto);
  }

  /**
   * Delete PPPoE VLAN configuration
   */
  @Delete('pppoe-vlans/:id')
  @ApiOperation({
    summary: 'Delete PPPoE VLAN configuration',
    description: 'Remove OLT IP to VLAN mapping.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuration not found',
  })
  async deletePppoeVlan(@Param('id') id: string) {
    return this.pppoeVlanService.delete(id);
  }
}
