import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('settings')
@ApiBearerAuth('JWT-auth')
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get admin settings',
    description: 'Retrieve settings for the authenticated admin user',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
  })
  async getSettings(@Request() req) {
    return this.settingsService.getSettings(req.user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update admin settings',
    description: 'Update settings for the authenticated admin user',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
  })
  async updateSettings(@Request() req, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(req.user.id, dto);
  }

  @Post('telegram/test')
  @ApiOperation({
    summary: 'Test Telegram bot connection',
    description:
      'Send a test message to verify Telegram bot configuration. Returns bot info and confirmation of message delivery.',
  })
  @ApiResponse({
    status: 200,
    description: 'Test completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        botInfo: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            firstName: { type: 'string' },
            id: { type: 'number' },
          },
        },
      },
    },
  })
  async testTelegram(@Request() req) {
    return this.settingsService.testTelegramConnection(req.user.id);
  }

  @Get('timeout/test')
  @ApiOperation({
    summary: 'Test request timeout',
    description:
      'Test endpoint that delays response by specified number of seconds. Useful for testing timeout configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Test completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        delaySeconds: { type: 'number' },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 408,
    description: 'Request timeout - the delay exceeded configured timeout',
  })
  async testTimeout(@Query('delay') delay: string = '5') {
    const delaySeconds = Math.min(Math.max(parseInt(delay, 10) || 5, 1), 60);
    return this.settingsService.testTimeout(delaySeconds);
  }
}
