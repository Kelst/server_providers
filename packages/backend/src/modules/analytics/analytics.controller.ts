import { Controller, Get, UseGuards, Request, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved' })
  getDashboardStats(@Request() req) {
    return this.analyticsService.getDashboardStats(req.user.id);
  }

  @Get('requests-over-time')
  @ApiOperation({ summary: 'Get requests over time' })
  @ApiResponse({ status: 200, description: 'Requests timeline retrieved' })
  getRequestsOverTime(
    @Request() req,
    @Query('period') period?: string,
    @Query('tokenId') tokenId?: string,
  ) {
    // Parse period to days: '24h' => 1, '7d' => 7, '30d' => 30
    let daysNum = 7; // default
    if (period === '24h') daysNum = 1;
    else if (period === '7d') daysNum = 7;
    else if (period === '30d') daysNum = 30;

    return this.analyticsService.getRequestsOverTime(
      req.user.id,
      daysNum,
      tokenId,
    );
  }

  @Get('top-endpoints')
  @ApiOperation({ summary: 'Get top endpoints by usage' })
  @ApiResponse({ status: 200, description: 'Top endpoints retrieved' })
  getTopEndpoints(@Request() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getTopEndpoints(req.user.id, limitNum);
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get error statistics' })
  @ApiResponse({ status: 200, description: 'Error stats retrieved' })
  getErrorStats(@Request() req) {
    return this.analyticsService.getErrorStats(req.user.id);
  }

  @Get('rate-limit-events')
  @ApiOperation({ summary: 'Get rate limit events' })
  @ApiResponse({ status: 200, description: 'Rate limit events retrieved' })
  getRateLimitEvents(
    @Request() req,
    @Query('tokenId') tokenId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.analyticsService.getRateLimitEvents(req.user.id, tokenId, limitNum);
  }

  @Get('rate-limit-stats')
  @ApiOperation({ summary: 'Get rate limit statistics' })
  @ApiResponse({ status: 200, description: 'Rate limit statistics retrieved' })
  getRateLimitStats(@Request() req) {
    return this.analyticsService.getRateLimitStats(req.user.id);
  }

  @Get('audit-log/:tokenId')
  @ApiOperation({ summary: 'Get audit log for token' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  getTokenAuditLog(@Param('tokenId') tokenId: string, @Request() req) {
    return this.analyticsService.getTokenAuditLog(tokenId, req.user.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get all audit logs with pagination' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  getAllAuditLogs(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tokenId') tokenId?: string,
    @Query('action') action?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 25;

    return this.analyticsService.getAllAuditLogs(
      req.user.id,
      pageNum,
      limitNum,
      tokenId,
      action,
    );
  }
}
