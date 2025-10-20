import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ApiTokenGuard } from '../auth/guards/api-token.guard';

@ApiTags('shared')
@ApiBearerAuth('API-token')
@Controller('shared')
@UseGuards(ApiTokenGuard)
export class SharedApiController {
  // Example endpoint that requires API token authentication
  @Get('example')
  @ApiOperation({ summary: 'Example shared API endpoint' })
  @ApiResponse({ status: 200, description: 'Example response' })
  @ApiResponse({ status: 401, description: 'Invalid API token' })
  getExample(@Request() req) {
    return {
      message: 'This is a shared API endpoint',
      tokenInfo: {
        projectName: req.user.projectName,
        tokenId: req.user.id,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Add your shared API endpoints here
  // All endpoints in this controller require API token authentication
}
