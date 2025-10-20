import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MySQLService } from './mysql.service';
import { PrismaService } from '../database/prisma.service';
import { BillingLoginResponseDto } from './dto/billing-auth.dto';
import { ReloadSessionResponseDto, SessionData, BillingApiRequest } from './dto/session-reload.dto';
import { AddCreditResponseDto } from './dto/credit.dto';

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
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    @InjectQueue('session-reload') private readonly sessionQueue: Queue,
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

  /**
   * Check if there's already an active reload job for this user
   */
  private async checkExistingReloadJob(uid: number): Promise<boolean> {
    try {
      // Get all active, waiting, and delayed jobs from the queue
      const jobs = await this.sessionQueue.getJobs(['waiting', 'delayed', 'active']);

      // Check if any job exists for this uid
      const existingJob = jobs.find((job) => job.data.uid === uid);

      if (existingJob) {
        this.logger.warn(`Active reload job already exists for uid ${uid}, job ID: ${existingJob.id}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error checking existing reload job for uid ${uid}:`, error);
      return false; // Don't block if check fails
    }
  }

  /**
   * Reload user session (schedule session hangup via Bull Queue)
   */
  async reloadSession(uid: number): Promise<ReloadSessionResponseDto> {
    try {
      // Check if there's already an active reload job for this user
      const hasActiveJob = await this.checkExistingReloadJob(uid);
      if (hasActiveJob) {
        return {
          success: false,
          message: 'Запит на скидання сесії вже виконується. Зачекайте декілька секунд.',
        };
      }

      // Get session info from database
      const sql = `
        SELECT user_name, nas_port_id, acct_session_id, nas_id
        FROM internet_online
        WHERE uid = ?
      `;
      const sessionInfo = await this.mysqlService.query<SessionData[]>(sql, [uid]);

      if (!sessionInfo || sessionInfo.length === 0) {
        return {
          success: false,
          message: 'Активну сесію не знайдено',
        };
      }

      const session = sessionInfo[0];

      // Prepare billing API request data
      const jobData: BillingApiRequest & { uid: number } = {
        acctSessionId: session.acct_session_id,
        nasId: session.nas_id,
        nasPortId: session.nas_port_id,
        userName: session.user_name,
        uid, // For logging in processor
      };

      // Add job to Bull queue with 10 second delay
      const job = await this.sessionQueue.add('hangup', jobData, {
        delay: 10000, // 10 seconds
        attempts: 3, // Retry up to 3 times if fails
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5s delay between retries
        },
      });

      this.logger.log(`Session reload scheduled for uid ${uid}, job ID: ${job.id}`);

      // Clear CID (MAC address) immediately
      await this.clearCid(uid);

      return {
        success: true,
        message: 'Запит на скидання сесії заплановано',
        jobId: String(job.id),
      };
    } catch (error) {
      this.logger.error(`Error scheduling session reload for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Clear user CID (MAC address) and log action
   */
  async clearCid(uid: number): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Clearing CID for uid ${uid}`);

      // Get current CID
      const sqlGetCid = `SELECT cid FROM internet_main WHERE uid = ?`;
      const cidResult = await this.mysqlService.query<any[]>(sqlGetCid, [uid]);

      if (!cidResult || cidResult.length === 0) {
        return { success: false, message: 'Користувача не знайдено' };
      }

      const oldCid = cidResult[0].cid;

      // Update CID to empty string
      const sqlUpdateCid = `UPDATE internet_main SET cid = '' WHERE uid = ?`;
      const updateResult = await this.mysqlService.query<any>(sqlUpdateCid, [uid]);

      if (updateResult.affectedRows === 1) {
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const ip = this.configService.get<string>('billing.adminActionIp');
        const aid = this.configService.get<string>('billing.adminActionAid');

        // Log action to admin_actions table
        const logSql = `
          INSERT INTO admin_actions (actions, datetime, ip, uid, aid, module, action_type)
          VALUES (?, ?, ?, ?, ?, 'Internet', 2)
        `;
        const actionText = `cid очищено з особистого кабінету\nID:${uid} CID: ${oldCid}->${currentDate}`;

        await this.mysqlService.query(logSql, [actionText, currentDate, ip, uid, aid]);

        this.logger.log(`CID cleared successfully for uid ${uid}`);
        return { success: true, message: 'CID успішно очищено' };
      } else {
        return { success: false, message: 'Не вдалося оновити CID' };
      }
    } catch (error) {
      this.logger.error(`Error clearing CID for uid ${uid}:`, error);
      return { success: false, message: 'Виникла помилка при очищенні CID' };
    }
  }

  /**
   * Add credit to user account (once per month limit)
   */
  async addCredit(uid: number): Promise<AddCreditResponseDto> {
    const DEFAULT_CREDIT = 4444;

    try {
      this.logger.log(`Adding credit for uid ${uid}`);

      // 1. Get user billing info (balance, existing credit, login)
      const billingInfoSQL = `
        SELECT u.id as login, u.credit, u.credit_date, b.deposit as balance
        FROM users u
        LEFT JOIN bills b ON u.uid = b.uid
        WHERE u.uid = ?
      `;
      const billingInfo = await this.mysqlService.query<any[]>(billingInfoSQL, [uid]);

      if (!billingInfo || billingInfo.length === 0) {
        throw new BadRequestException('Користувача не знайдено');
      }

      const { login, balance, credit_date } = billingInfo[0];

      // 2. Check if balance is positive
      if (balance > 0) {
        return {
          success: false,
          message: 'Баланс додатній, кредит не потрібен',
        };
      }

      // 3. Check if credit is already active
      // MySQL може повертати '0000-00-00' або '0000-00-00 00:00:00' як невалідну дату
      const invalidDates = ['0000-00-00', '0000-00-00 00:00:00', null];
      const creditDateStr = credit_date ? String(credit_date).trim() : null;

      if (creditDateStr && !invalidDates.includes(creditDateStr)) {
        try {
          const endDate = new Date(creditDateStr);
          if (!isNaN(endDate.getTime())) {
            const endDateStr = endDate.toISOString().split('T')[0];
            return {
              success: false,
              message: `Кредит вже активний до ${endDateStr}`,
            };
          }
        } catch (error) {
          this.logger.warn(`Invalid credit_date format: ${creditDateStr}`);
        }
      }

      // 4. Check if credit was already used this month (PostgreSQL)
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      const existingCredit = await this.prismaService.creditHistory.findFirst({
        where: {
          uid,
          usedAt: {
            gte: firstDayOfMonth,
          },
        },
      });

      if (existingCredit) {
        return {
          success: false,
          message: 'Ви вже використали кредит цього місяця',
        };
      }

      // 5. Calculate credit amount
      let creditSum = DEFAULT_CREDIT;
      if (balance < 0) {
        creditSum = Math.abs(balance) + DEFAULT_CREDIT;
        this.logger.log(`Negative balance detected: ${balance}, credit adjusted to: ${creditSum}`);
      }

      // 6. Set credit in Abills database
      const updateCreditSQL = `
        UPDATE users
        SET credit = ?, credit_date = DATE_ADD(CURRENT_DATE(), INTERVAL 5 DAY)
        WHERE uid = ?
      `;
      const updateResult = await this.mysqlService.query<any>(updateCreditSQL, [creditSum, uid]);

      if (updateResult.affectedRows !== 1) {
        throw new Error('Failed to update credit in database');
      }

      // 7. Log action to admin_actions
      const currentDateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const ip = this.configService.get<string>('billing.adminActionIp');
      const aid = this.configService.get<string>('billing.adminActionAid');

      const logSQL = `
        INSERT INTO admin_actions (actions, datetime, ip, uid, aid, module, action_type)
        VALUES (?, ?, ?, ?, ?, '', 5)
      `;
      await this.mysqlService.query(logSQL, [
        'Встановлено кредит з особистого кабінету',
        currentDateStr,
        ip,
        uid,
        aid,
      ]);

      // 8. Save to PostgreSQL credit history
      await this.prismaService.creditHistory.create({
        data: {
          uid,
          login,
          creditSum,
        },
      });

      // 9. Check if user has active session and schedule reload
      const hasActiveJob = await this.checkExistingReloadJob(uid);
      if (!hasActiveJob) {
        const sessionSQL = `
          SELECT user_name, nas_port_id, acct_session_id, nas_id
          FROM internet_online
          WHERE uid = ?
        `;
        const sessionInfo = await this.mysqlService.query<SessionData[]>(sessionSQL, [uid]);

        if (sessionInfo && sessionInfo.length > 0) {
          const session = sessionInfo[0];

          // Schedule session hangup via Bull Queue
          const jobData: BillingApiRequest & { uid: number } = {
            acctSessionId: session.acct_session_id,
            nasId: session.nas_id,
            nasPortId: session.nas_port_id,
            userName: session.user_name,
            uid,
          };

          await this.sessionQueue.add('hangup', jobData, {
            delay: 10000, // 10 seconds
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          });

          this.logger.log(`Session reload scheduled for uid ${uid} after credit set`);
        }
      }

      // 10. Calculate credit end date
      const creditEndDate = new Date();
      creditEndDate.setDate(creditEndDate.getDate() + 5);
      const creditEndDateStr = creditEndDate.toISOString().split('T')[0];

      this.logger.log(`Credit successfully set for uid ${uid}, amount: ${creditSum}`);

      return {
        success: true,
        message: 'Кредит встановлено на 5 днів, будь ласка перезавантажте обладнання',
        creditSum,
        creditEndDate: creditEndDateStr,
      };
    } catch (error) {
      this.logger.error(`Error adding credit for uid ${uid}:`, error);
      throw error;
    }
  }
}
