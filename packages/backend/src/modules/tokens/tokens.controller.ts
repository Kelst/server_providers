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
    return this.tokensService.create(createTokenDto, req.user.id);
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
    return this.tokensService.update(id, updateTokenDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete API token' })
  @ApiResponse({ status: 200, description: 'Token deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.tokensService.remove(id, req.user.id);
  }
}
