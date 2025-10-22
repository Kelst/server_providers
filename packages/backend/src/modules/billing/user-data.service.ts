import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MySQLService } from './mysql.service';
import { CompanyService } from './company.service';
import {
  UserBasicInfoDto,
  InternetInfoDto,
  SessionInfoDto,
  TariffInfoDto,
  BillingInfoDto,
  FamilyAccountDto,
  AdditionalServicesDto,
  FullUserDataDto,
} from './dto/user-info.dto';
import { FeesResponseDto, FeeItemDto } from './dto/fees.dto';
import { PaymentsResponseDto, PaymentItemDto } from './dto/payments.dto';
import { AvailableTariffsResponseDto, AvailableTariffDto } from './dto/available-tariffs.dto';
import { SessionHistoryResponseDto, SessionHistoryItemDto } from './dto/session-history.dto';
import { intToIp } from './helpers/ip.helper';
import { convertDataToMB, formatTime, getDifference } from './helpers/data.helper';
import { processPhoneNumber, getLowestPriorityValue } from './helpers/phone.helper';
import { checkUserAccess, getGroupIdFromAccess } from './helpers/access.helper';

/**
 * User Data Service
 *
 * Handles retrieving user information from Abills MySQL database.
 * Provides methods for getting different types of user data.
 */
@Injectable()
export class UserDataService {
  private readonly logger = new Logger(UserDataService.name);

  constructor(
    private readonly mysqlService: MySQLService,
    private readonly companyService: CompanyService,
  ) {}

  /**
   * Get basic user information
   */
  async getUserBasicInfo(uid: number): Promise<UserBasicInfoDto> {
    try {
      // Get name
      const sqlName = `SELECT fio, fio2, fio3 FROM users_pi WHERE uid = ?`;
      const nameData = await this.mysqlService.query<any[]>(sqlName, [uid]);

      if (!nameData || nameData.length === 0) {
        throw new NotFoundException(`User with uid ${uid} not found`);
      }

      const row = nameData[0];
      const name = row.fio2 || row.fio3
        ? row.fio + (row.fio2 ? ' ' + row.fio2 : '') + (row.fio3 ? ' ' + row.fio3 : '')
        : row.fio;

      // Get login and password
      const sqlLogin = `
        SELECT u.id as login, DECODE(u.password, ?) as password, c.company, c.status
        FROM users u
        LEFT JOIN config_gid c ON u.gid = c.gid
        WHERE u.uid = ?
      `;
      const loginData = await this.mysqlService.query<any[]>(sqlLogin, [
        this.mysqlService.getDecodeKey(),
        uid,
      ]);

      const login = loginData[0]?.login || '';
      const password = Buffer.isBuffer(loginData[0]?.password)
        ? new TextDecoder('utf-8').decode(loginData[0].password)
        : String(loginData[0]?.password || '');
      const company = loginData[0]?.company || '';
      const status = loginData[0]?.status || 0;

      // Get phone
      const sqlPhone = `SELECT * FROM users_contacts WHERE uid = ?`;
      const phoneData = await this.mysqlService.query<any[]>(sqlPhone, [uid]);
      const phone = getLowestPriorityValue(phoneData);

      // Get address
      const sqlAddress = `
        SELECT d.name AS district_name, s.name AS street_name, b.number AS build_number
        FROM users u
        JOIN users_pi up ON u.uid = up.uid
        JOIN builds b ON up.location_id = b.id
        JOIN streets s ON b.street_id = s.id
        JOIN districts d ON s.district_id = d.id
        WHERE u.uid = ?
      `;
      const addressData = await this.mysqlService.query<any[]>(sqlAddress, [uid]);
      const address = addressData.length > 0
        ? `${addressData[0].district_name} ${addressData[0].street_name} ${addressData[0].build_number}`
        : '';

      // Get Telegram ID
      let telegramId = '';
      if (phone && phone !== '') {
        const telegramTable = this.companyService.getTelegramTableName(company);
        const processedPhone = processPhoneNumber(phone);

        const sqlTelegram = `SELECT user_chat_id FROM ${telegramTable} WHERE phone_number = ?`;
        const telegramData = await this.mysqlService.query<any[]>(sqlTelegram, [
          processedPhone,
        ]);

        telegramId = telegramData.length > 0 ? String(telegramData[0].user_chat_id) : '';
      }

      return {
        uid,
        name,
        phone,
        address,
        login,
        password,
        telegramId,
        company,
        status,
      };
    } catch (error) {
      this.logger.error(`Error getting basic info for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get internet connection information
   */
  async getInternetInfo(uid: number): Promise<InternetInfoDto> {
    try {
      const sql = `SELECT id, ip, cid, disable FROM internet_main WHERE uid = ?`;
      const data = await this.mysqlService.query<any[]>(sql, [uid]);

      if (!data || data.length === 0) {
        throw new NotFoundException(`Internet connection for uid ${uid} not found`);
      }

      const row = data[0];
      const ip = intToIp(row.ip);

      // Check if user is online (has active session)
      const sqlOnline = `SELECT uid FROM internet_online WHERE uid = ?`;
      const onlineData = await this.mysqlService.query<any[]>(sqlOnline, [uid]);
      const statusInternet = onlineData.length > 0;

      return {
        internetId: String(row.id),
        ip,
        isStaticIp: !ip.startsWith('100'),
        status: row.disable === 0,
        cid: String(row.cid || ''),
        statusInternet,
      };
    } catch (error) {
      this.logger.error(`Error getting internet info for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get current session information
   */
  async getSessionInfo(uid: number): Promise<SessionInfoDto> {
    try {
      const sql = `
        SELECT framed_ip_address, started, acct_session_time,
               acct_input_octets, cid, acct_output_octets,
               acct_input_gigawords, acct_output_gigawords
        FROM internet_online
        WHERE uid = ?
      `;
      const data = await this.mysqlService.query<any[]>(sql, [uid]);

      if (!data || data.length === 0) {
        return {
          guestIp: '',
          duration: '0',
          sendData: 0,
          getData: 0,
          cid:'',
          statusInternet: false,
        };
      }

      const row = data[0];
      const duration =
        row.acct_session_time === 0
          ? getDifference(row.started)
          : formatTime(row.acct_session_time);

      return {
        guestIp: intToIp(row.framed_ip_address),
        duration,
        sendData: convertDataToMB(row.acct_output_octets, row.acct_output_gigawords),
        getData: convertDataToMB(row.acct_input_octets, row.acct_input_gigawords),
        cid: row.cid,
        statusInternet: true,
      };
    } catch (error) {
      this.logger.error(`Error getting session info for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get tariff information
   */
  async getTariffInfo(uid: number): Promise<TariffInfoDto> {
    try {
      const sql = `
        SELECT t.name, t.month_fee, tt.in_speed
        FROM tarif_plans t
        JOIN trafic_tarifs tt ON t.tp_id = tt.tp_id
        WHERE t.tp_id = (
          SELECT tp_id FROM internet_main WHERE uid = ?
        )
      `;
      const data = await this.mysqlService.query<any[]>(sql, [uid]);

      if (!data || data.length === 0) {
        throw new NotFoundException(`Tariff for uid ${uid} not found`);
      }

      const row = data[0];
      const speedInMbps = row.in_speed / 1024;
      const tariffSpeed = speedInMbps >= 950 ? 1000 : speedInMbps;

      return {
        tariff: row.name,
        monthlyPayment: row.month_fee,
        tariffExtentionSpeed: tariffSpeed,
      };
    } catch (error) {
      this.logger.error(`Error getting tariff info for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get billing information
   */
  async getBillingInfo(uid: number): Promise<BillingInfoDto> {
    try {
      // Get user data
      const sqlUser = `
        SELECT id, reduction, credit, credit_date, company_id
        FROM users
        WHERE uid = ?
      `;
      const userData = await this.mysqlService.query<any[]>(sqlUser, [uid]);

      if (!userData || userData.length === 0) {
        throw new NotFoundException(`User ${uid} not found`);
      }

      const user = userData[0];

      // Get balance and bill_id
      let sqlBalance = `SELECT id, deposit FROM bills WHERE uid = ?`;
      let balanceParams = [uid];

      if (user.company_id != 0) {
        sqlBalance = `SELECT id, deposit FROM bills WHERE company_id = ?`;
        balanceParams = [user.company_id];
      }

      const balanceData = await this.mysqlService.query<any[]>(sqlBalance, balanceParams);
      const balance = balanceData.length > 0 ? balanceData[0].deposit : 0;
      const billId = balanceData.length > 0 ? balanceData[0].id : uid;

      // Get gid and check access
      const sqlGid = `SELECT u.gid, up._date_connect
                      FROM users u
                      LEFT JOIN users_pi up ON u.uid = up.uid
                      WHERE u.uid = ?`;
      const gidData = await this.mysqlService.query<any[]>(sqlGid, [uid]);
      const hasAccess = gidData.length > 0
        ? checkUserAccess(gidData[0].gid, gidData[0]._date_connect)
        : true;

      return {
        balance,
        deposit: user.credit || 0,
        reduction: user.reduction || 0,
        dateOfEndCredits: user.credit_date,
        billId: billId,
        companyId: user.company_id || 0,
        groupId: getGroupIdFromAccess(hasAccess),
      };
    } catch (error) {
      this.logger.error(`Error getting billing info for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get family accounts (sublogins)
   */
  async getFamilyAccounts(uid: number, phone: string, company: string): Promise<FamilyAccountDto[]> {
    try {
      if (!phone || phone === '') {
        return [];
      }

      // Find family members by phone
      const sqlFamily = `
        SELECT uid FROM users_contacts
        WHERE value = ? AND value != '' AND priority = '0' AND uid != ?
      `;
      const familyData = await this.mysqlService.query<any[]>(sqlFamily, [phone, uid]);

      if (familyData.length === 0) {
        return [];
      }

      // Get company GIDs
      const gids = await this.companyService.getGidsByCompany(company);
      const gidCondition = gids.length > 0 ? ` AND gid IN (${gids.join(', ')})` : '';

      // Process each family member
      const promises = familyData.map(async (member) => {
        try {
          const memberUid = String(member.uid).replace(/[^0-9]/g, '');

          const sqlLogin = `SELECT id FROM users WHERE uid = ?${gidCondition}`;
          const loginData = await this.mysqlService.query<any[]>(sqlLogin, [memberUid]);

          if (!loginData || loginData.length === 0) {
            return null;
          }

          const login = loginData[0].id;

          // Skip TV accounts
          if (login.toLowerCase().startsWith('tv')) {
            return null;
          }

          // Get tariff
          const sqlTariff = `
            SELECT t.month_fee
            FROM tarif_plans t
            JOIN internet_main im ON t.tp_id = im.tp_id
            WHERE im.uid = ?
          `;
          const tariffData = await this.mysqlService.query<any[]>(sqlTariff, [memberUid]);

          // Get balance
          const sqlBalance = `SELECT deposit FROM bills WHERE uid = ?`;
          const balanceData = await this.mysqlService.query<any[]>(sqlBalance, [memberUid]);

          // Get password
          const sqlPassword = `
            SELECT DECODE(password, ?) as password
            FROM users
            WHERE uid = ?
          `;
          const passwordData = await this.mysqlService.query<any[]>(sqlPassword, [
            this.mysqlService.getDecodeKey(),
            memberUid,
          ]);

          const password = Buffer.isBuffer(passwordData[0]?.password)
            ? new TextDecoder('utf-8').decode(passwordData[0].password)
            : String(passwordData[0]?.password || '');

          if (tariffData.length > 0 && balanceData.length > 0) {
            return {
              uid: memberUid,
              login,
              monthlyPayment: tariffData[0].month_fee,
              balance: balanceData[0].deposit,
              password,
            };
          }

          return null;
        } catch (error) {
          this.logger.error(`Error processing family member ${member.uid}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((item) => item !== null) as FamilyAccountDto[];
    } catch (error) {
      this.logger.error(`Error getting family accounts for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get additional services (IPTV, subscriptions)
   */
  async getAdditionalServices(uid: number): Promise<AdditionalServicesDto> {
    try {
      // Get user login first
      const sqlUserId = `SELECT id FROM users WHERE uid = ?`;
      const userIdData = await this.mysqlService.query<any[]>(sqlUserId, [uid]);

      if (!userIdData || userIdData.length === 0) {
        return { services: [], totalPrice: 0 };
      }

      const userId = userIdData[0].id;

      // Combined query for both abon and IPTV services
      const sql = `
        SELECT t.name, t.price
        FROM abon_user_list ul
        JOIN abon_tariffs t ON ul.tp_id = t.id
        WHERE ul.uid = ?

        UNION ALL

        SELECT t_p.name as name, t_p.month_fee as price
        FROM iptv_main as i_t
        INNER JOIN users as u ON (u.uid = i_t.uid)
        INNER JOIN tarif_plans as t_p ON (i_t.tp_id = t_p.tp_id)
        WHERE u.id = ? AND i_t.service_id = '11' AND i_t.disable = '0'
      `;

      const results = await this.mysqlService.query<any[]>(sql, [uid, userId]);
      const totalPrice = results.reduce((sum, item) => sum + item.price, 0);

      return {
        services: results.map((item) => ({
          name: item.name,
          price: item.price,
        })),
        totalPrice,
      };
    } catch (error) {
      this.logger.error(`Error getting additional services for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get user fees/payments history (outgoing funds - списання)
   */
  async getFees(uid: number): Promise<FeesResponseDto> {
    try {
      // Query for statistics (count and total sum)
      const statsSQL = `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(sum), 0) as total_sum
        FROM fees
        WHERE uid = ?
      `;

      // Query for detailed fee records
      const detailsSQL = `
        SELECT
          DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as date,
          dsc as description,
          sum,
          last_deposit as deposit
        FROM fees
        WHERE uid = ?
        ORDER BY date DESC
        LIMIT 1000
      `;

      // Execute both queries in parallel
      const [statsResult, detailsResult] = await Promise.all([
        this.mysqlService.query<any[]>(statsSQL, [uid]),
        this.mysqlService.query<any[]>(detailsSQL, [uid]),
      ]);

      // Build response
      const count = statsResult[0]?.count ? parseInt(statsResult[0].count, 10) : 0;
      const sum = statsResult[0]?.total_sum ? parseFloat(statsResult[0].total_sum) : 0;

      const paidData: FeeItemDto[] = detailsResult.map((row) => ({
        date: row.date,
        description: row.description || '',
        sum: parseFloat(row.sum) || 0,
        deposit: parseFloat(row.deposit) || 0,
      }));

      return {
        count,
        sum,
        paidData,
      };
    } catch (error) {
      this.logger.error(`Error getting fees for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get user payments history (incoming funds - поповнення)
   */
  async getPayments(uid: number): Promise<PaymentsResponseDto> {
    try {
      // Query for statistics (count and total sum)
      const statsSQL = `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(sum), 0) as total_sum
        FROM payments
        WHERE uid = ?
      `;

      // Query for detailed payment records
      const detailsSQL = `
        SELECT
          DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as date,
          dsc as description,
          sum,
          last_deposit as deposit
        FROM payments
        WHERE uid = ?
        ORDER BY date DESC
        LIMIT 1000
      `;

      // Execute both queries in parallel
      const [statsResult, detailsResult] = await Promise.all([
        this.mysqlService.query<any[]>(statsSQL, [uid]),
        this.mysqlService.query<any[]>(detailsSQL, [uid]),
      ]);

      // Build response
      const count = statsResult[0]?.count ? parseInt(statsResult[0].count, 10) : 0;
      const sum = statsResult[0]?.total_sum ? parseFloat(statsResult[0].total_sum) : 0;

      const paidData: PaymentItemDto[] = detailsResult.map((row) => ({
        date: row.date,
        description: row.description || '',
        sum: parseFloat(row.sum) || 0,
        deposit: parseFloat(row.deposit) || 0,
      }));

      return {
        count,
        sum,
        paidData,
      };
    } catch (error) {
      this.logger.error(`Error getting payments for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get full user data (aggregates all methods)
   */
  async getFullUserData(uid: number): Promise<FullUserDataDto> {
    try {
      // Fetch all data in parallel where possible
      const [basicInfo, internetInfo, sessionInfo, tariffInfo, billingInfo] =
        await Promise.all([
          this.getUserBasicInfo(uid),
          this.getInternetInfo(uid),
          this.getSessionInfo(uid),
          this.getTariffInfo(uid),
          this.getBillingInfo(uid),
        ]);

      // Family accounts and services depend on basic info
      const [familyAccounts, additionalServices] = await Promise.all([
        this.getFamilyAccounts(uid, basicInfo.phone, basicInfo.company),
        this.getAdditionalServices(uid),
      ]);

      // Calculate total payment
      const totalServices = tariffInfo.monthlyPayment + additionalServices.totalPrice;
      const payAll = totalServices * (1 - billingInfo.reduction / 100);

      return {
        // Basic Info
        uid: basicInfo.uid,
        name: basicInfo.name,
        phone: basicInfo.phone,
        address: basicInfo.address,
        login: basicInfo.login,
        password: basicInfo.password,
        telegramId: basicInfo.telegramId,
        company: basicInfo.company,
        userStatus: basicInfo.status,

        // Internet Info
        internetId: internetInfo.internetId,
        ip: internetInfo.ip,
        isStaticIp: internetInfo.isStaticIp,
        status: internetInfo.status,
        cid: internetInfo.cid,

        // Session Info
        guestIp: sessionInfo.guestIp,
        duration: sessionInfo.duration,
        sendData: sessionInfo.sendData,
        getData: sessionInfo.getData,
        statusInternet: sessionInfo.statusInternet,

        // Tariff Info
        tariff: tariffInfo.tariff,
        monthlyPayment: tariffInfo.monthlyPayment,
        tariffExtentionSpeed: tariffInfo.tariffExtentionSpeed,

        // Billing Info
        balance: billingInfo.balance,
        deposit: billingInfo.deposit,
        reduction: billingInfo.reduction,
        dateOfEndCredits: billingInfo.dateOfEndCredits,
        billId: billingInfo.billId,
        companyId: billingInfo.companyId,
        groupId: billingInfo.groupId,

        // Additional
        addServicePrice: additionalServices,
        payAll,
        subLogin: familyAccounts,
      };
    } catch (error) {
      this.logger.error(`Error getting full user data for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get available tariffs for user (excluding current tariff)
   * Returns tariffs from the same gid group, filtered by status='0' and module='Internet'
   * Sorted by speed (descending)
   */
  async getAvailableTariffs(uid: number): Promise<AvailableTariffsResponseDto> {
    try {
      this.logger.log(`Getting available tariffs for uid ${uid}`);

      // 1. Get current tariff plan ID
      const sqlCurrentTp = `SELECT tp_id FROM internet_main WHERE uid = ?`;
      const currentTpData = await this.mysqlService.query<any[]>(sqlCurrentTp, [uid]);

      if (!currentTpData || currentTpData.length === 0 || !currentTpData[0].tp_id) {
        throw new NotFoundException(`User ${uid} does not have a tariff plan assigned`);
      }

      const currentTpId = currentTpData[0].tp_id;
      this.logger.log(`Current tariff plan ID for uid ${uid}: ${currentTpId}`);

      // 2. Get available tariffs (same gid group, status='0', module='Internet', excluding current)
      const sqlAvailableTariffs = `
        SELECT
          tp.tp_id,
          tp.name,
          tp.month_fee,
          tt.in_speed
        FROM tarif_plans tp
        JOIN trafic_tarifs tt ON tp.tp_id = tt.tp_id
        WHERE tp.gid IN (
          SELECT gid FROM tarif_plans
          WHERE tp_id = ?
        )
        AND tp.status = '0'
        AND tp.module = 'Internet'
        AND tp.tp_id != ?
        ORDER BY tt.in_speed DESC
      `;

      const tariffsData = await this.mysqlService.query<any[]>(sqlAvailableTariffs, [
        currentTpId,
        currentTpId,
      ]);

      this.logger.log(`Found ${tariffsData.length} available tariffs for uid ${uid}`);

      // 3. Process tariffs and calculate speed
      const available: AvailableTariffDto[] = tariffsData.map((row) => {
        const speedInMbps = row.in_speed / 1024;
        const tariffExtentionSpeed = speedInMbps >= 950 ? 1000 : speedInMbps;

        return {
          tp_id: row.tp_id,
          name: row.name,
          month_fee: row.month_fee,
          tariffExtentionSpeed,
        };
      });

      return {
        available,
        currentTpId,
      };
    } catch (error) {
      this.logger.error(`Error getting available tariffs for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get session history for user from internet_log table
   * Returns up to 1000 most recent sessions with traffic and duration info
   */
  async getSessionHistory(uid: number): Promise<SessionHistoryResponseDto> {
    try {
      this.logger.log(`Getting session history for uid ${uid}`);

      // Query for statistics (count)
      const statsSQL = `
        SELECT COUNT(*) as count
        FROM internet_log
        WHERE uid = ?
      `;

      // Query for detailed session records
      const detailsSQL = `
        SELECT
          DATE_FORMAT(start, '%Y-%m-%d %H:%i:%s') as start,
          tp_id,
          duration,
          sent,
          ip,
          recv,
          cid,
          acct_input_gigawords,
          acct_output_gigawords,
          guest
        FROM internet_log
        WHERE uid = ?
        ORDER BY start DESC
        LIMIT 1000
      `;

      // Execute both queries in parallel
      const [statsResult, detailsResult] = await Promise.all([
        this.mysqlService.query<any[]>(statsSQL, [uid]),
        this.mysqlService.query<any[]>(detailsSQL, [uid]),
      ]);

      // Build response
      const count = statsResult[0]?.count ? parseInt(statsResult[0].count, 10) : 0;

      const sessions: SessionHistoryItemDto[] = detailsResult.map((row) => ({
        start: row.start,
        tpId: row.tp_id,
        duration: formatTime(row.duration),
        sendData: convertDataToMB(row.sent, row.acct_output_gigawords),
        getData: convertDataToMB(row.recv, row.acct_input_gigawords),
        ip: intToIp(row.ip),
        cid: String(row.cid || ''),
        guest: row.guest || 0,
      }));

      this.logger.log(`Found ${count} total sessions for uid ${uid}, returning ${sessions.length}`);

      return {
        count,
        sessions,
      };
    } catch (error) {
      this.logger.error(`Error getting session history for uid ${uid}:`, error);
      throw error;
    }
  }
}
