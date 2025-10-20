import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { MySQLService } from './mysql.service';
import { BillingLoginResponseDto } from './dto/billing-auth.dto';

interface AbillsUser {
  id: string;
  gid: number;
  password: string;
  uid: number;
  company: string;
  status: number;
}

/**
 * Billing Service
 *
 * Handles authentication and operations with Abills MySQL database.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly mysqlService: MySQLService,
  ) {}

  /**
   * Validate billing user credentials against Abills MySQL database
   * Uses DECODE function to decrypt password from database
   */
  async validateCredentials(
    login: string,
    password: string,
  ): Promise<{ login: string; uid: number; company: string; status: number } | null> {
    try {
      const decodeKey = this.mysqlService.getDecodeKey();

      // Query Abills database with DECODE to get decrypted password
      // Join with config_gid to get company and status
      const sql = `SELECT u.id, u.gid, DECODE(u.password, '${decodeKey}') as password, u.uid,
                   COALESCE(c.company, '') as company, COALESCE(c.status, 0) as status
                   FROM users u
                   LEFT JOIN config_gid c ON u.gid = c.gid
                   WHERE u.id = ?`;

      const results = await this.mysqlService.query<AbillsUser[]>(sql, [login]);

      this.logger.log(`Raw MySQL results: ${JSON.stringify(results)}`);

      if (!results || results.length === 0) {
        this.logger.warn(`Login attempt failed: user not found - ${login}`);
        return null;
      }

      const user = results[0];
      this.logger.log(`User object: ${JSON.stringify(user)}`);

      // Debug logging
      this.logger.log(`DB password type: ${typeof user.password}, value: "${user.password}", length: ${user.password?.length}`);
      this.logger.log(`Input password type: ${typeof password}, value: "${password}", length: ${password.length}`);
      this.logger.log(`Password comparison: ${user.password} === ${password} = ${user.password === password}`);

      // Convert Buffer to string if needed
      const dbPassword = Buffer.isBuffer(user.password)
        ? user.password.toString('utf8')
        : String(user.password || '').trim();

      const inputPassword = String(password).trim();

      // Compare decrypted password with provided password
      if (dbPassword !== inputPassword) {
        this.logger.warn(`Login attempt failed: invalid password - ${login}. DB: "${dbPassword}", Input: "${inputPassword}"`);
        return null;
      }

      this.logger.log(`User successfully authenticated: ${login} (uid: ${user.uid})`);

      return {
        login: user.id,
        uid: user.uid,
        company: user.company,
        status: user.status,
      };
    } catch (error) {
      this.logger.error(`Error validating credentials for ${login}:`, error);
      throw error;
    }
  }

  /**
   * Login billing user (validate credentials and return user data with uid)
   */
  async login(login: string, password: string): Promise<BillingLoginResponseDto> {
    const userData = await this.validateCredentials(login, password);

    if (!userData) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return user data with uid (NO TOKEN!)
    // Client app manages its own session
    return {
      success: true,
      uid: userData.uid,
      login: userData.login,
      company: userData.company,
      status: userData.status,
      message: 'Successfully authenticated',
    };
  }
}
