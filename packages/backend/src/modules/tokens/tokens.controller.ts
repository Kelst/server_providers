import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';
import { CreateIpRuleDto } from './dto/create-ip-rule.dto';
import { RegenerateTokenDto } from './dto/regenerate-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tokens')
@ApiBearerAuth('JWT-auth')
@Controller('tokens')
@UseGuards(JwtAuthGuard)
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Post()
  @ApiOperation({ summary: 'Create new API token' })
  @ApiResponse({ status: 201, description: 'Token created successfully' })
  create(@Body() createTokenDto: CreateTokenDto, @Request() req) {
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    return this.tokensService.create(createTokenDto, req.user.id, ipAddress, userAgent);
  }

  @Get()
  @ApiOperation({ summary: 'Get all API tokens' })
  @ApiResponse({ status: 200, description: 'List of all tokens' })
  findAll(@Request() req) {
    return this.tokensService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get API token by ID' })
  @ApiResponse({ status: 200, description: 'Token details' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.tokensService.findOne(id, req.user.id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get token usage statistics' })
  @ApiResponse({ status: 200, description: 'Token statistics' })
  getStats(@Param('id') id: string, @Request() req) {
    return this.tokensService.getStats(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update API token' })
  @ApiResponse({ status: 200, description: 'Token updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateTokenDto: UpdateTokenDto,
    @Request() req,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    return this.tokensService.update(id, updateTokenDto, req.user.id, ipAddress, userAgent);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete API token' })
  @ApiResponse({ status: 200, description: 'Token deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    return this.tokensService.remove(id, req.user.id, ipAddress, userAgent);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate API token (create new token value, keep settings)' })
  @ApiResponse({ status: 200, description: 'Token regenerated successfully. New token value returned.' })
  regenerate(
    @Param('id') id: string,
    @Body() regenerateDto: RegenerateTokenDto,
    @Request() req,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    return this.tokensService.regenerate(id, regenerateDto, req.user.id, ipAddress, userAgent);
  }

  @Get(':id/rotation-history')
  @ApiOperation({ summary: 'Get token rotation history' })
  @ApiResponse({ status: 200, description: 'List of token regeneration events' })
  getRotationHistory(@Param('id') id: string, @Request() req) {
    return this.tokensService.getRotationHistory(id, req.user.id);
  }

  @Post(':id/ip-rules')
  @ApiOperation({ summary: 'Create IP rule for token (whitelist/blacklist)' })
  @ApiResponse({ status: 201, description: 'IP rule created successfully' })
  createIpRule(
    @Param('id') id: string,
    @Body() createIpRuleDto: CreateIpRuleDto,
    @Request() req,
  ) {
    return this.tokensService.createIpRule(id, createIpRuleDto, req.user.id);
  }

  @Get(':id/ip-rules')
  @ApiOperation({ summary: 'Get all IP rules for a token' })
  @ApiResponse({ status: 200, description: 'List of IP rules' })
  getIpRules(@Param('id') id: string, @Request() req) {
    return this.tokensService.getIpRules(id, req.user.id);
  }

  @Delete(':id/ip-rules/:ruleId')
  @ApiOperation({ summary: 'Delete IP rule' })
  @ApiResponse({ status: 200, description: 'IP rule deleted successfully' })
  deleteIpRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Request() req,
  ) {
    return this.tokensService.deleteIpRule(id, ruleId, req.user.id);
  }

  @Get(':id/security-log')
  @ApiOperation({ summary: 'Get security events for a token (blocked IPs, failed attempts)' })
  @ApiResponse({ status: 200, description: 'List of security events' })
  getSecurityLog(@Param('id') id: string, @Request() req) {
    return this.tokensService.getSecurityLog(id, req.user.id);
  }
}
