import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('security')
@ApiBearerAuth('JWT-auth')
@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('suspicious-activity')
  @ApiOperation({ summary: 'Get suspicious activity (scanning, high error rates, etc.)' })
  @ApiResponse({ status: 200, description: 'Suspicious activity retrieved' })
  getSuspiciousActivity(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.securityService.getSuspiciousActivity(req.user.id, daysNum);
  }

  @Get('failed-attempts')
  @ApiOperation({ summary: 'Get failed authentication attempts' })
  @ApiResponse({ status: 200, description: 'Failed attempts retrieved' })
  getFailedAttempts(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.securityService.getFailedAttempts(req.user.id, daysNum);
  }

  @Post('block-ip')
  @ApiOperation({ summary: 'Block IP address at system level' })
  @ApiResponse({ status: 200, description: 'IP blocked successfully' })
  blockIP(
    @Body() body: { ipAddress: string; reason: string },
    @Request() req,
  ) {
    return this.securityService.blockIP(body.ipAddress, body.reason, req.user.id);
  }

  @Get('blocked-ips')
  @ApiOperation({ summary: 'Get list of blocked IP addresses' })
  @ApiResponse({ status: 200, description: 'Blocked IPs retrieved' })
  getBlockedIPs(@Request() req) {
    return this.securityService.getBlockedIPs(req.user.id);
  }
}
