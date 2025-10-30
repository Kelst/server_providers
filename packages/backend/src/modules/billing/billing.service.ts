import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MySQLService } from './mysql.service';
import { PrismaService } from '../database/prisma.service';
import { CompanyService } from './company.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationProvider } from '../notifications/enums/provider.enum';
import { BillingLoginResponseDto } from './dto/billing-auth.dto';
import { ReloadSessionResponseDto, SessionData, BillingApiRequest } from './dto/session-reload.dto';
import { AddCreditResponseDto } from './dto/credit.dto';
import {
  PhoneLoginRequestResponseDto,
  PhoneLoginVerifyResponseDto,
} from './dto/phone-login.dto';
import { ChangeTariffResponseDto } from './dto/change-tariff.dto';
import { PaymentLinkResponseDto } from './dto/payment-link.dto';
import { AvailablePaymentMethodsResponseDto, PaymentMethodDto } from './dto/available-payment-methods.dto';
import { generateVerificationCode } from './helpers/verification-code.helper';
import { normalizePhoneNumber, isValidUkrainianPhone } from './helpers/phone-normalize.helper';
import {
  PaymentMethod,
  PaymentProvider,
  PAYMENT_METHOD_SUPPORT_MATRIX,
  PAYMENT_METHOD_NAMES,
  PRIVAT24_BASE_URL,
  EASYPAY_URLS,
  PORTMONE_CONFIG,
  PORTMONE_PAYEE_ID_MAP,
} from './constants/payment.constants';

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
    private readonly companyService: CompanyService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue('session-reload') private readonly sessionQueue: Queue,
  ) {}

  /**
   * Validate billing user credentials against Abills MySQL database
   * Uses DECODE function to decrypt password from database
   * Includes rate limiting to prevent brute force attacks
   */
  async validateCredentials(
    login: string,
    password: string,
    ip?: string,
  ): Promise<{ login: string; uid: number; company: string; status: number } | null> {
    try {
      // Rate limiting: Check failed login attempts (5 failed attempts per login in 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const failedAttempts = await this.prismaService.loginAttempt.count({
        where: {
          login,
          success: false,
          createdAt: {
            gte: fifteenMinutesAgo,
          },
        },
      });

      if (failedAttempts >= 5) {
        this.logger.warn(`Login rate limit exceeded for ${login}. Failed attempts: ${failedAttempts}`);

        // Log this blocked attempt
        await this.prismaService.loginAttempt.create({
          data: {
            login,
            ip,
            success: false,
            failReason: 'Rate limit exceeded (5 failed attempts in 15 minutes)',
          },
        });

        throw new UnauthorizedException('Забагато невдалих спроб входу. Спробуйте знову через 15 хвилин');
      }

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

        // Log failed attempt
        await this.prismaService.loginAttempt.create({
          data: {
            login,
            ip,
            success: false,
            failReason: 'User not found',
          },
        });

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

        // Log failed attempt
        await this.prismaService.loginAttempt.create({
          data: {
            login,
            ip,
            success: false,
            failReason: 'Invalid password',
          },
        });

        return null;
      }

      // Check if user status is active (status = 1 in config_gid)
      if (user.status !== 1) {
        this.logger.warn(`Login attempt failed: user inactive (status=${user.status}) - ${login}`);

        // Log failed attempt
        await this.prismaService.loginAttempt.create({
          data: {
            login,
            ip,
            success: false,
            failReason: `User inactive (status=${user.status})`,
          },
        });

        return null;
      }

      this.logger.log(`User successfully authenticated: ${login} (uid: ${user.uid})`);

      // Log successful attempt
      await this.prismaService.loginAttempt.create({
        data: {
          login,
          ip,
          success: true,
          failReason: null,
        },
      });

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
  async login(login: string, password: string, ip?: string): Promise<BillingLoginResponseDto> {
    const userData = await this.validateCredentials(login, password, ip);

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

  /**
   * Request phone number change (send verification code via SMS)
   */
  async requestPhoneChange(uid: number, newPhone: string): Promise<{ success: boolean; message: string }> {
    try {
      // Normalize phone number to 380XXXXXXXXX format
      const normalizedNewPhone = normalizePhoneNumber(newPhone);

      this.logger.log(`Phone change requested for uid ${uid}: ${newPhone} -> ${normalizedNewPhone}`);

      // Validate phone number format
      if (!isValidUkrainianPhone(normalizedNewPhone)) {
        throw new BadRequestException(
          `Невірний формат номера телефону. Очікується український номер (наприклад: +380671234567 або 0671234567)`,
        );
      }

      // Rate limiting: Check recent phone change attempts (3 attempts per 15 minutes per UID)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const recentAttempts = await this.prismaService.phoneChangeVerification.count({
        where: {
          uid,
          createdAt: {
            gte: fifteenMinutesAgo,
          },
        },
      });

      if (recentAttempts >= 3) {
        this.logger.warn(`Phone change rate limit exceeded for uid ${uid}. Attempts: ${recentAttempts}`);
        throw new BadRequestException(
          'Ви перевищили ліміт спроб зміни номера телефону. Спробуйте знову через 15 хвилин',
        );
      }

      // 1. Get user data (login, oldPhone, company)
      const sqlUser = `
        SELECT u.id as login, c.company
        FROM users u
        LEFT JOIN config_gid c ON u.gid = c.gid
        WHERE u.uid = ?
      `;
      const userData = await this.mysqlService.query<any[]>(sqlUser, [uid]);

      if (!userData || userData.length === 0) {
        throw new BadRequestException('Користувача не знайдено');
      }

      const login = userData[0].login;
      const company = userData[0].company || '';

      this.logger.log(`User data: uid=${uid}, login=${login}, company="${company}"`);

      // 2. Get old phone from users_contacts (already normalized in DB)
      const sqlPhone = `SELECT value FROM users_contacts WHERE uid = ? AND priority = '0'`;
      const phoneData = await this.mysqlService.query<any[]>(sqlPhone, [uid]);
      const oldPhone = phoneData.length > 0 ? phoneData[0].value : '';

      // 3. Generate verification code
      const verificationCode = generateVerificationCode();

      // 4. Calculate expiration (5 minutes from now)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // 5. Save to PostgreSQL (use normalized phone)
      await this.prismaService.phoneChangeVerification.create({
        data: {
          uid,
          login,
          oldPhone,
          newPhone: normalizedNewPhone, // Store normalized phone
          verificationCode,
          provider: company,
          expiresAt,
        },
      });

      // 6. Get Telegram chatId if exists (by phone number, not uid)
      let chatId: string | null = null;
      if (company && oldPhone) {
        const telegramTableName = this.companyService.getTelegramTableName(company);
        // Process phone: 380951470082 -> 0951470082 (remove '38' prefix)
        const processedPhone = oldPhone.startsWith('38') ? oldPhone.substring(2) : oldPhone;
        const sqlChatId = `SELECT user_chat_id FROM ${telegramTableName} WHERE phone_number = ?`;

        try {
          const chatIdData = await this.mysqlService.query<any[]>(sqlChatId, [processedPhone]);
          if (chatIdData && chatIdData.length > 0 && chatIdData[0].user_chat_id) {
            chatId = String(chatIdData[0].user_chat_id);
            this.logger.log(`Found Telegram chatId for uid ${uid} (phone ${processedPhone}): ${chatId}`);
          } else {
            this.logger.log(`No Telegram chatId found for uid ${uid} (phone ${processedPhone}) in table ${telegramTableName}`);
          }
        } catch (error) {
          this.logger.warn(`Error fetching chatId from ${telegramTableName}:`, error.message);
        }
      }

      // 7. Send notification (try Telegram first if chatId exists, fallback to SMS)
      const providerName = this.companyService.getProviderByCompany(company);
      this.logger.log(`Company "${company}" mapped to provider "${providerName}"`);

      // Map provider name to enum (match by value, not key)
      let providerValue: NotificationProvider;
      switch (providerName) {
        case 'Opticom':
          providerValue = NotificationProvider.OPTICOM;
          break;
        case 'Veles':
          providerValue = NotificationProvider.VELES;
          break;
        case 'Opensvit':
          providerValue = NotificationProvider.OPENSVIT;
          break;
        case 'Intelekt':
        default:
          providerValue = NotificationProvider.INTELEKT;
          break;
      }

      this.logger.log(`Provider enum: ${providerValue} (from company: "${company}")`);

      const notificationMessage = `Код підтвердження зміни номера телефону: ${verificationCode}`;

      this.logger.log(
        `Sending notification to uid ${uid}: ${chatId ? 'Telegram chatId=' + chatId : 'No Telegram'}, SMS phone=${normalizedNewPhone}, provider=${providerName}`,
      );

      // Send notification (Telegram first if chatId exists, fallback to SMS)
      // NotificationsService will handle phone formatting for TurboSMS API
      await this.notificationsService.sendNotification({
        provider: providerValue,
        chatId: chatId || undefined, // Try Telegram first if chatId exists
        phoneNumber: normalizedNewPhone, // Fallback to SMS
        message: notificationMessage,
        uid,
        metadata: {
          action: 'phone_change_request',
          oldPhone,
          newPhone: normalizedNewPhone,
        },
      });

      return {
        success: true,
        message: 'Код підтвердження відправлено на новий номер телефону',
      };
    } catch (error) {
      this.logger.error(`Error requesting phone change for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Confirm phone number change (verify code and update phone)
   */
  async confirmPhoneChange(
    uid: number,
    code: string,
  ): Promise<{ success: boolean; message: string; newPhone?: string }> {
    try {
      this.logger.log(`Phone change confirmation for uid ${uid} with code ${code}`);

      // 1. Find verification record
      const codeRecord = await this.prismaService.phoneChangeVerification.findFirst({
        where: {
          uid,
          verificationCode: code,
          expiresAt: {
            gte: new Date(), // Not expired
          },
        },
        orderBy: {
          createdAt: 'desc', // Get most recent
        },
      });

      if (!codeRecord) {
        return {
          success: false,
          message: 'Невірний код або час дії коду закінчився',
        };
      }

      // 2. Update phone in users_contacts
      const updateSql = `
        UPDATE users_contacts
        SET value = ?
        WHERE uid = ? AND value = ?
      `;
      const updateResult = await this.mysqlService.query<any>(updateSql, [
        codeRecord.newPhone,
        uid,
        codeRecord.oldPhone,
      ]);

      if (updateResult.affectedRows === 0) {
        throw new Error('Помилка оновлення номера телефону в базі даних');
      }

      // 3. Log to admin_actions
      const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const ip = this.configService.get<string>('billing.adminActionIp');
      const aid = this.configService.get<string>('billing.adminActionAid');

      const logSql = `
        INSERT INTO admin_actions (actions, datetime, ip, uid, aid, module, action_type)
        VALUES (?, ?, ?, ?, ?, '', 2)
      `;
      const actionText = `Номер телефону змінено з особистого кабінету ${codeRecord.oldPhone} -> ${codeRecord.newPhone}`;

      await this.mysqlService.query(logSql, [actionText, currentDate, ip, uid, aid]);

      // 4. Delete used code
      await this.prismaService.phoneChangeVerification.delete({
        where: { id: codeRecord.id },
      });

      this.logger.log(`Phone changed successfully for uid ${uid}: ${codeRecord.oldPhone} -> ${codeRecord.newPhone}`);

      return {
        success: true,
        message: 'Код підтверджено, номер телефону оновлено',
        newPhone: codeRecord.newPhone,
      };
    } catch (error) {
      this.logger.error(`Error confirming phone change for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Request phone login (send verification code via SMS/Telegram)
   */
  async requestPhoneLogin(phoneNumber: string, provider: NotificationProvider): Promise<PhoneLoginRequestResponseDto> {
    try {
      // 1. Normalize phone number to 380XXXXXXXXX format
      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      this.logger.log(`Phone login requested: ${phoneNumber} -> ${normalizedPhone}, provider: ${provider}`);

      // 2. Validate phone number format
      if (!isValidUkrainianPhone(normalizedPhone)) {
        throw new BadRequestException(
          'Невірний формат номера телефону. Очікується український номер (наприклад: +380671234567 або 0671234567)',
        );
      }

      // 3. Rate limiting: Check recent attempts (3 attempts per 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const recentAttempts = await this.prismaService.phoneLoginVerification.findMany({
        where: {
          phoneNumber: normalizedPhone,
          provider: provider,
          lastAttemptAt: {
            gte: fifteenMinutesAgo,
          },
        },
        orderBy: {
          lastAttemptAt: 'desc',
        },
      });

      // Count total attempts in last 15 minutes
      const totalAttempts = recentAttempts.reduce((sum, record) => sum + record.attempts, 0);

      if (totalAttempts >= 3) {
        const oldestAttempt = recentAttempts[recentAttempts.length - 1];
        const canRetryAt = new Date(oldestAttempt.lastAttemptAt.getTime() + 15 * 60 * 1000);

        this.logger.warn(
          `Rate limit exceeded for phone ${normalizedPhone}. Total attempts: ${totalAttempts}. Can retry at: ${canRetryAt.toISOString()}`,
        );

        return {
          success: false,
          message: `Ви перевищили ліміт спроб. Спробуйте знову через ${Math.ceil((canRetryAt.getTime() - Date.now()) / 60000)} хвилин`,
          canRetryAt: canRetryAt.toISOString(),
        };
      }

      // 4. Get company name from provider
      const companyName = provider; // Provider enum values match company names

      // 5. Get GIDs for the provider via CompanyService
      const gids = await this.companyService.getGidsByCompany(companyName);

      if (gids.length === 0) {
        this.logger.warn(`No GIDs found for provider: ${provider}`);
        throw new BadRequestException('Користувача не знайдено');
      }

      // 6. Find user in MySQL (with provider isolation)
      const gidCondition = gids.map((gid) => `u.gid = ${gid}`).join(' OR ');

      const sqlFindUser = `
        SELECT u.uid, u.id as login, c.company, c.status
        FROM users_contacts uc
        JOIN users u ON u.uid = uc.uid
        LEFT JOIN config_gid c ON u.gid = c.gid
        WHERE uc.value = ?
          AND uc.priority = '0'
          AND (${gidCondition})
          AND c.status = 1
        LIMIT 1
      `;

      const userResult = await this.mysqlService.query<any[]>(sqlFindUser, [normalizedPhone]);

      if (!userResult || userResult.length === 0) {
        this.logger.warn(`User not found for phone ${normalizedPhone} and provider ${provider}`);
        throw new BadRequestException('Користувача не знайдено');
      }

      const user = userResult[0];
      this.logger.log(`User found: uid=${user.uid}, login=${user.login}, company=${user.company}`);

      // 7. Get Telegram chatId if exists
      let chatId: string | null = null;
      const telegramTableName = this.companyService.getTelegramTableName(companyName);
      // Process phone: 380951470082 -> 0951470082 (remove '38' prefix)
      const processedPhone = normalizedPhone.startsWith('38') ? normalizedPhone.substring(2) : normalizedPhone;
      const sqlChatId = `SELECT user_chat_id FROM ${telegramTableName} WHERE phone_number = ? AND state_notification = '1'`;

      try {
        const chatIdData = await this.mysqlService.query<any[]>(sqlChatId, [processedPhone]);
        if (chatIdData && chatIdData.length > 0 && chatIdData[0].user_chat_id) {
          chatId = String(chatIdData[0].user_chat_id);
          this.logger.log(`Found Telegram chatId for uid ${user.uid}: ${chatId}`);
        } else {
          this.logger.log(`No Telegram chatId found for uid ${user.uid} in table ${telegramTableName}`);
        }
      } catch (error) {
        this.logger.warn(`Error fetching chatId from ${telegramTableName}:`, error.message);
      }

      // 8. Generate verification code
      const verificationCode = generateVerificationCode();

      // 9. Calculate expiration (5 minutes from now)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // 10. Delete old verification records for this phone+provider
      await this.prismaService.phoneLoginVerification.deleteMany({
        where: {
          phoneNumber: normalizedPhone,
          provider: provider,
        },
      });

      // 11. Save to PostgreSQL
      await this.prismaService.phoneLoginVerification.create({
        data: {
          phoneNumber: normalizedPhone,
          provider: provider,
          verificationCode,
          uid: user.uid,
          chatId,
          attempts: 1,
          lastAttemptAt: new Date(),
          expiresAt,
        },
      });

      // 12. Send notification (Telegram first if chatId exists, fallback to SMS)
      const notificationMessage = `Код підтвердження для входу: ${verificationCode}`;

      this.logger.log(
        `Sending notification to uid ${user.uid}: ${chatId ? 'Telegram chatId=' + chatId : 'No Telegram'}, SMS phone=${normalizedPhone}, provider=${provider}`,
      );

      await this.notificationsService.sendNotification({
        provider: provider,
        chatId: chatId || undefined,
        phoneNumber: normalizedPhone,
        message: notificationMessage,
        uid: user.uid,
        metadata: {
          action: 'phone_login_request',
          provider: provider,
        },
      });

      return {
        success: true,
        message: 'Код підтвердження відправлено на ваш номер телефону',
      };
    } catch (error) {
      this.logger.error(`Error requesting phone login for ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Verify phone login code and return user data
   */
  async verifyPhoneLogin(
    phoneNumber: string,
    provider: NotificationProvider,
    code: string,
  ): Promise<PhoneLoginVerifyResponseDto> {
    try {
      // 1. Normalize phone number
      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      this.logger.log(`Phone login verification for ${normalizedPhone}, provider: ${provider}, code: ${code}`);

      // 2. Find verification record
      const codeRecord = await this.prismaService.phoneLoginVerification.findFirst({
        where: {
          phoneNumber: normalizedPhone,
          provider: provider,
          verificationCode: code,
          expiresAt: {
            gte: new Date(), // Not expired
          },
        },
        orderBy: {
          createdAt: 'desc', // Get most recent
        },
      });

      if (!codeRecord) {
        this.logger.warn(`Invalid or expired code for phone ${normalizedPhone}, provider ${provider}`);
        return {
          success: false,
          message: 'Невірний код або час дії коду закінчився',
        };
      }

      // 3. Get user data from MySQL
      const sqlGetUser = `
        SELECT u.uid, u.id as login, c.company, c.status
        FROM users u
        LEFT JOIN config_gid c ON u.gid = c.gid
        WHERE u.uid = ?
      `;

      const userResult = await this.mysqlService.query<any[]>(sqlGetUser, [codeRecord.uid]);

      if (!userResult || userResult.length === 0) {
        throw new BadRequestException('Користувача не знайдено');
      }

      const user = userResult[0];

      // 4. Delete used code
      await this.prismaService.phoneLoginVerification.delete({
        where: { id: codeRecord.id },
      });

      this.logger.log(`Phone login successful for uid ${user.uid} (${user.login})`);

      return {
        success: true,
        uid: user.uid,
        login: user.login,
        company: user.company,
        message: 'Успішно автентифіковано',
      };
    } catch (error) {
      this.logger.error(`Error verifying phone login for ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Change tariff plan for user
   *
   * Rate limiting: User can change tariff only once per calendar month
   * Validates that new tariff is available for user (same gid group)
   * Calls Abills API to perform tariff change
   * Logs to admin_actions and saves to PostgreSQL history (only on success)
   */
  async changeTariff(uid: number, newTpId: number): Promise<ChangeTariffResponseDto> {
    try {
      this.logger.log(`Starting tariff change for uid ${uid} to tp_id ${newTpId}`);

      // 1. Get current date for monthly rate limiting
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // 2. Check rate limiting: only 1 tariff change per calendar month
      const recentChange = await this.prismaService.tariffChangeHistory.findFirst({
        where: {
          uid,
          changedAt: {
            gte: firstDayOfMonth,
            lt: firstDayOfNextMonth,
          },
        },
        orderBy: {
          changedAt: 'desc',
        },
      });

      if (recentChange) {
        const nextAllowedDate = firstDayOfNextMonth;
        throw new BadRequestException(
          `Ви вже змінювали тарифний план цього місяця. Наступна зміна можлива з ${nextAllowedDate.toISOString().split('T')[0]}`,
        );
      }

      // 3. Get user basic info (login, company) from MySQL
      const sqlGetUser = `
        SELECT u.id as login, u.gid, c.company
        FROM users u
        LEFT JOIN config_gid c ON u.gid = c.gid
        WHERE u.uid = ?
      `;

      const userResult = await this.mysqlService.query<any[]>(sqlGetUser, [uid]);

      if (!userResult || userResult.length === 0) {
        throw new BadRequestException('Користувача не знайдено');
      }

      const user = userResult[0];
      const login = user.login;
      const gid = user.gid;

      // 4. Get current internet info (tp_id and internet_id)
      const sqlGetInternet = `
        SELECT im.id as internet_id, im.tp_id, tp.name as current_tariff_name
        FROM internet_main im
        LEFT JOIN tarif_plans tp ON im.tp_id = tp.tp_id
        WHERE im.uid = ?
      `;

      const internetResult = await this.mysqlService.query<any[]>(sqlGetInternet, [uid]);

      if (!internetResult || internetResult.length === 0) {
        throw new BadRequestException('Інтернет-підключення не знайдено');
      }

      const internet = internetResult[0];
      const currentTpId = internet.tp_id;
      const internetId = internet.internet_id;
      const currentTariffName = internet.current_tariff_name || 'Unknown';

      // 5. Check if trying to change to the same tariff
      if (currentTpId === newTpId) {
        throw new BadRequestException('Неможливо змінити тариф на той самий, що й зараз');
      }

      // 6. Get available tariffs (validate that newTpId is available)
      const sqlGetAvailable = `
        SELECT tp_id FROM tarif_plans
        WHERE gid IN (
          SELECT gid FROM tarif_plans
          WHERE tp_id = ?
        )
        AND status = '0'
        AND module = 'Internet'
      `;

      const availableTariffs = await this.mysqlService.query<any[]>(sqlGetAvailable, [currentTpId]);
      const availableTpIds = availableTariffs.map((t) => t.tp_id);

      if (!availableTpIds.includes(newTpId)) {
        throw new BadRequestException(
          'Обраний тарифний план недоступний для вашого підключення',
        );
      }

      // Get new tariff name
      const sqlGetNewTariff = `
        SELECT name FROM tarif_plans WHERE tp_id = ?
      `;

      const newTariffResult = await this.mysqlService.query<any[]>(sqlGetNewTariff, [newTpId]);

      if (!newTariffResult || newTariffResult.length === 0) {
        throw new BadRequestException('Тарифний план не знайдено');
      }

      const newTariffName = newTariffResult[0].name;

      // 7. Call Abills API to change tariff
      const billingApiUrl = this.configService.get<string>('billing.apiUrl');
      const billingApiKey = this.configService.get<string>('billing.apiKey');

      if (!billingApiUrl || !billingApiKey) {
        this.logger.error('Billing API credentials not configured');
        throw new BadRequestException('Помилка конфігурації сервера');
      }

      const apiUrl = `${billingApiUrl}/api.cgi/internet/${uid}/`;
      const requestData = {
        id: internetId,
        tpId: newTpId,
      };

      this.logger.log(`Calling Abills API: ${apiUrl} with data: ${JSON.stringify(requestData)}`);

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'KEY': billingApiKey,
        },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json();
      this.logger.log(`Abills API response status: ${response.status}, data: ${JSON.stringify(responseData)}`);

      if (!response.ok || responseData.result !== 'OK') {
        this.logger.error(`Abills API failed: ${response.status} - ${JSON.stringify(responseData)}`);
        throw new BadRequestException('Помилка при зміні тарифу в біллінгу');
      }

      // 8. Log to admin_actions in MySQL
      const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const adminActionIp = this.configService.get<string>('billing.adminActionIp');
      const adminActionAid = this.configService.get<string>('billing.adminActionAid');

      const sqlAdminAction = `
        INSERT INTO admin_actions (actions, datetime, ip, uid, aid, module, action_type)
        VALUES (?, ?, ?, ?, ?, '', 2)
      `;

      const actionText = `Тарифний план змінено з особистого кабінету ${currentTariffName} -> ${newTariffName}`;

      await this.mysqlService.query(sqlAdminAction, [actionText, currentDate, adminActionIp, uid, adminActionAid]);

      this.logger.log(`Admin action logged: ${actionText}`);

      // 9. Save to PostgreSQL tariff change history (only if API succeeded)
      const changeRecord = await this.prismaService.tariffChangeHistory.create({
        data: {
          uid,
          login,
          oldTpId: currentTpId,
          oldTariffName: currentTariffName,
          newTpId,
          newTariffName,
          internetId,
        },
      });

      this.logger.log(`Tariff change saved to history: ${changeRecord.id}`);

      return {
        success: true,
        message: 'Тариф успішно змінено',
        oldTpId: currentTpId,
        oldTariffName: currentTariffName,
        newTpId,
        newTariffName,
        changedAt: changeRecord.changedAt,
      };
    } catch (error) {
      this.logger.error(`Error changing tariff for uid ${uid}:`, error);
      throw error;
    }
  }

  // ==================== Payment Link Generation Methods ====================

  /**
   * Get login by uid
   */
  private async getLoginByUid(uid: number): Promise<string> {
    try {
      const sql = `SELECT id FROM users WHERE uid = ?`;
      const results = await this.mysqlService.query<any[]>(sql, [uid]);

      if (!results || results.length === 0) {
        throw new BadRequestException('Користувача не знайдено');
      }

      return results[0].id;
    } catch (error) {
      this.logger.error(`Error getting login for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get provider by uid
   */
  private async getProviderByUid(uid: number): Promise<string> {
    try {
      const sql = `
        SELECT c.company
        FROM users u
        LEFT JOIN config_gid c ON u.gid = c.gid
        WHERE u.uid = ?
      `;
      const results = await this.mysqlService.query<any[]>(sql, [uid]);

      if (!results || results.length === 0) {
        throw new BadRequestException('Користувача не знайдено');
      }

      const company = results[0].company || '';

      // Map company to provider using CompanyService
      return this.companyService.getProviderByCompany(company);
    } catch (error) {
      this.logger.error(`Error getting provider for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Check if payment method is supported for provider
   */
  private isPaymentMethodSupported(method: PaymentMethod, provider: string): boolean {
    const supportedProviders = PAYMENT_METHOD_SUPPORT_MATRIX[method];
    return supportedProviders.some(p => p === provider);
  }

  /**
   * Get available payment methods for user
   */
  async getAvailablePaymentMethods(uid: number): Promise<AvailablePaymentMethodsResponseDto> {
    try {
      const provider = await this.getProviderByUid(uid);

      const methods: PaymentMethodDto[] = Object.values(PaymentMethod).map(method => ({
        method,
        name: PAYMENT_METHOD_NAMES[method],
        available: this.isPaymentMethodSupported(method, provider),
      }));

      return {
        provider,
        methods,
      };
    } catch (error) {
      this.logger.error(`Error getting available payment methods for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Generate Privat24 payment link
   */
  async generatePrivat24Link(uid: number, amount: number): Promise<PaymentLinkResponseDto> {
    try {
      this.logger.log(`Generating Privat24 link for uid ${uid}, amount: ${amount}`);

      const [login, provider] = await Promise.all([
        this.getLoginByUid(uid),
        this.getProviderByUid(uid),
      ]);

      // Check if provider supports Privat24
      if (!this.isPaymentMethodSupported(PaymentMethod.PRIVAT24, provider)) {
        return {
          success: false,
          message: `Оплата через Приват24 недоступна для вашого провайдера (${provider})`,
        };
      }

      // Get static token based on provider (using process.env directly)
      let staticToken: string;
      let result = '';

      switch (provider) {
        case PaymentProvider.INTELEKT:
          staticToken = process.env.STATICTOKEN_PRIVAT24;
          break;
        case PaymentProvider.VELES:
          staticToken = process.env.STATICTOKEN_PRIVAT24_VELES;
          break;
        case PaymentProvider.OPENSVIT:
          staticToken = process.env.STATICTOKEN_PRIVAT24_OPENSVIT;
          break;
        case PaymentProvider.OPTICOM:
          // Opticom does not support Privat24
          return {
            success: false,
            message: `Оплата через Приват24 недоступна для провайдера Opticom`,
          };
        default:
          throw new BadRequestException(`Невідомий провайдер: ${provider}`);
      }

      if (!staticToken) {
        this.logger.error(`Privat24 static token not configured for provider: ${provider}`);
        throw new BadRequestException('Помилка конфігурації платіжної системи');
      }

      const formattedAmount = parseFloat(amount.toString()).toFixed(2);
      result = `${PRIVAT24_BASE_URL}?staticToken=${staticToken}&acc=${login}&amount=${formattedAmount}`;

      this.logger.log(`Privat24 link generated for uid ${uid}, provider: ${provider}`);

      return {
        success: true,
        message: 'Посилання на оплату успішно згенеровано',
        link: result,
      };
    } catch (error) {
      this.logger.error(`Error generating Privat24 link for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Generate EasyPay payment link
   */
  async generateEasyPayLink(uid: number, amount: number): Promise<PaymentLinkResponseDto> {
    try {
      this.logger.log(`Generating EasyPay link for uid ${uid}, amount: ${amount}`);

      const [login, provider] = await Promise.all([
        this.getLoginByUid(uid),
        this.getProviderByUid(uid),
      ]);

      // Check if provider supports EasyPay
      if (!this.isPaymentMethodSupported(PaymentMethod.EASYPAY, provider)) {
        return {
          success: false,
          message: `Оплата через EasyPay недоступна для вашого провайдера (${provider})`,
        };
      }

      // Get base URL for provider
      const baseUrl = EASYPAY_URLS[provider as PaymentProvider];
      if (!baseUrl) {
        throw new BadRequestException(`URL EasyPay не налаштовано для провайдера: ${provider}`);
      }

      // Create hash parameter
      const param = `account=${login}&amount=${amount}&readonly=account`;
      const encodedData = Buffer.from(param).toString('base64');

      const link = `${baseUrl}?hash=${encodedData}`;

      this.logger.log(`EasyPay link generated for uid ${uid}: ${link}`);

      return {
        success: true,
        message: 'Посилання на оплату успішно згенеровано',
        link,
      };
    } catch (error) {
      this.logger.error(`Error generating EasyPay link for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Generate Portmone payment link
   */
  async generatePortmoneLink(uid: number, amount: number): Promise<PaymentLinkResponseDto> {
    try {
      this.logger.log(`Generating Portmone link for uid ${uid}, amount: ${amount}`);

      const [login, provider] = await Promise.all([
        this.getLoginByUid(uid),
        this.getProviderByUid(uid),
      ]);

      // Check if provider supports Portmone
      if (!this.isPaymentMethodSupported(PaymentMethod.PORTMONE, provider)) {
        return {
          success: false,
          message: `Оплата через Portmone недоступна для вашого провайдера (${provider})`,
        };
      }

      // Get payeeId from database
      const sqlGetPayeeId = `
        SELECT p_m_p.value as payeeId
        FROM users as u
        INNER JOIN paysys_merchant_to_groups_settings as p_m_t_g_s ON (u.gid=p_m_t_g_s.gid)
        INNER JOIN paysys_merchant_params as p_m_p ON (p_m_t_g_s.merch_id=p_m_p.merchant_id)
        WHERE u.uid = ? AND p_m_t_g_s.paysys_id = '15' AND p_m_p.param = 'PAYSYS_PORTMONE_PAYEE_ID'
      `;

      const payeeIdResults = await this.mysqlService.query<any[]>(sqlGetPayeeId, [uid]);

      if (!payeeIdResults || payeeIdResults.length === 0) {
        throw new BadRequestException('PayeeId не знайдено в базі даних');
      }

      const dbPayeeId = payeeIdResults[0].payeeId;

      // Map payeeId
      const payeeId = PORTMONE_PAYEE_ID_MAP[dbPayeeId];
      if (!payeeId) {
        throw new BadRequestException(`PayeeId ${dbPayeeId} не знайдено в конфігурації`);
      }

      // Create Portmone API request
      const requestData = {
        method: 'createLinkPayment',
        paymentTypes: {
          masterpass: 'Y',
          visacheckout: 'Y',
          createtokenonly: 'N',
          token: 'N',
          privat: 'N',
          gpay: 'Y',
          card: 'Y',
          applepay: 'Y',
        },
        priorityPaymentTypes: {
          token: '7',
          gpay: '2',
          masterpass: '4',
          applepay: '3',
          visacheckout: '5',
          privat: '6',
          card: '1',
        },
        payee: {
          payeeId: payeeId,
          login: 'INTELEKT',
          dt: '',
          signature: '',
          shopSiteId: '',
        },
        order: {
          description: login,
          shopOrderNumber: '',
          billAmount: amount,
          attribute1: '',
          attribute2: '',
          attribute3: '',
          attribute4: '',
          attribute5: '',
          successUrl: '',
          failureUrl: '',
          preauthFlag: 'N',
          billCurrency: 'UAH',
          encoding: '',
        },
        token: {
          tokenFlag: 'N',
          returnToken: 'Y',
          token: '',
          cardMask: '',
          otherPaymentMethods: '',
        },
        payer: {
          lang: 'uk',
          emailAddress: '',
          showEmail: 'N',
        },
      };

      // Make request to Portmone API
      const axios = (await import('axios')).default;
      const response = await axios.post(PORTMONE_CONFIG.PAYMENT_URL, requestData, {
        headers: PORTMONE_CONFIG.DEFAULT_HEADERS,
      });

      if (!response.data.linkPayment) {
        this.logger.error(`Portmone API failed: ${JSON.stringify(response.data)}`);
        throw new BadRequestException('Помилка при генерації посилання Portmone');
      }

      const link = response.data.linkPayment;

      this.logger.log(`Portmone link generated for uid ${uid}: ${link}`);

      return {
        success: true,
        message: 'Посилання на оплату успішно згенеровано',
        link,
      };
    } catch (error) {
      this.logger.error(`Error generating Portmone link for uid ${uid}:`, error);
      throw error;
    }
  }
}
