import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiTokenStrategy extends PassportStrategy(Strategy, 'api-token') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(token: string) {
    const apiToken = await this.authService.validateApiToken(token);

    if (!apiToken) {
      throw new UnauthorizedException('Invalid or expired API token');
    }

    // Return apiToken with tokenId for easier access in controllers
    return {
      ...apiToken,
      tokenId: apiToken.id, // Add tokenId field for convenience
    };
  }
}
