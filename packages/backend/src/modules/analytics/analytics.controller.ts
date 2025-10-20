import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
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
    @Query('days') days?: string,
    @Query('tokenId') tokenId?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
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
}
