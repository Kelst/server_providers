import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MySQLService } from './mysql.service';

interface CompanyConfig {
  gid: number;
  company: string;
  status: number;
}

interface CompanyCache {
  gidsByCompany: Map<string, number[]>;
  companyByGid: Map<number, string>;
  lastUpdate: Date;
}

/**
 * Company Service
 *
 * Manages company configuration and group IDs (gids).
 * Implements in-memory caching with automatic refresh every 5 minutes.
 */
@Injectable()
export class CompanyService implements OnModuleInit {
  private readonly logger = new Logger(CompanyService.name);
  private cache: CompanyCache = {
    gidsByCompany: new Map(),
    companyByGid: new Map(),
    lastUpdate: new Date(0),
  };

  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(private readonly mysqlService: MySQLService) {}

  /**
   * Initialize service and start cache refresh interval
   */
  async onModuleInit() {
    await this.refreshCache();

    // Setup automatic cache refresh every 5 minutes
    this.refreshInterval = setInterval(
      () => {
        this.refreshCache().catch((error) => {
          this.logger.error('Failed to refresh company cache:', error);
        });
      },
      this.CACHE_TTL_MS,
    );

    this.logger.log('CompanyService initialized with cache refresh interval');
  }

  /**
   * Cleanup interval on module destroy
   */
  onModuleDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.logger.log('CompanyService cache refresh interval cleared');
    }
  }

  /**
   * Refresh cache from database
   */
  private async refreshCache(): Promise<void> {
    try {
      const sql = 'SELECT gid, company, status FROM config_gid';
      const results = await this.mysqlService.query<CompanyConfig[]>(sql);

      const gidsByCompany = new Map<string, number[]>();
      const companyByGid = new Map<number, string>();

      for (const row of results) {
        // Build gidsByCompany map
        if (!gidsByCompany.has(row.company)) {
          gidsByCompany.set(row.company, []);
        }
        gidsByCompany.get(row.company)!.push(row.gid);

        // Build companyByGid map
        companyByGid.set(row.gid, row.company);
      }

      this.cache = {
        gidsByCompany,
        companyByGid,
        lastUpdate: new Date(),
      };

      this.logger.log(
        `Company cache refreshed: ${companyByGid.size} gids, ${gidsByCompany.size} companies`,
      );
    } catch (error) {
      this.logger.error('Error refreshing company cache:', error);
      throw error;
    }
  }

  /**
   * Get all GIDs for a specific company
   * @param company - Company name (e.g., "Intelekt", "Opticom")
   * @returns Array of GIDs for the company
   */
  async getGidsByCompany(company: string): Promise<number[]> {
    // Check cache age
    const cacheAge = Date.now() - this.cache.lastUpdate.getTime();
    if (cacheAge > this.CACHE_TTL_MS) {
      this.logger.warn('Cache expired, refreshing...');
      await this.refreshCache();
    }

    const gids = this.cache.gidsByCompany.get(company);
    if (!gids || gids.length === 0) {
      this.logger.warn(`No GIDs found for company: ${company}`);
      return [];
    }

    return gids;
  }

  /**
   * Get company name by GID
   * @param gid - Group ID
   * @returns Company name or null if not found
   */
  async getCompanyByGid(gid: number): Promise<string | null> {
    // Check cache age
    const cacheAge = Date.now() - this.cache.lastUpdate.getTime();
    if (cacheAge > this.CACHE_TTL_MS) {
      this.logger.warn('Cache expired, refreshing...');
      await this.refreshCache();
    }

    const company = this.cache.companyByGid.get(gid);
    if (!company) {
      this.logger.warn(`No company found for gid: ${gid}`);
      return null;
    }

    return company;
  }

  /**
   * Get company name by user UID
   * @param uid - User ID
   * @returns Company name or null if not found
   */
  async getCompanyByUid(uid: number): Promise<string | null> {
    try {
      const sql = `
        SELECT c.company
        FROM users u
        LEFT JOIN config_gid c ON u.gid = c.gid
        WHERE u.uid = ?
      `;
      const results = await this.mysqlService.query<Array<{ company: string }>>(
        sql,
        [uid],
      );

      if (!results || results.length === 0) {
        this.logger.warn(`No company found for uid: ${uid}`);
        return null;
      }

      return results[0].company || null;
    } catch (error) {
      this.logger.error(`Error getting company for uid ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get Telegram table name for company
   * @param company - Company name
   * @returns Telegram table name (e.g., "client_chats_id", "opticomplus_client_chats_id")
   */
  getTelegramTableName(company: string): string {
    const tableMap: Record<string, string> = {
      Opticom: 'opticomplus_client_chats_id',
      Veles: 'veles_client_chats_id',
      Opensvit: 'client_chats_id',
      Intelekt: 'client_chats_id',
    };

    return tableMap[company] || 'client_chats_id';
  }

  /**
   * Build SQL WHERE condition for filtering by company GIDs
   * @param company - Company name
   * @returns SQL WHERE condition string (e.g., " AND gid IN (24, 25)")
   */
  async buildGidCondition(company: string): Promise<string> {
    const gids = await this.getGidsByCompany(company);

    if (gids.length === 0) {
      return '';
    }

    return ` AND gid IN (${gids.join(', ')})`;
  }

  /**
   * Get all companies
   * @returns Array of company names
   */
  getAllCompanies(): string[] {
    return Array.from(this.cache.gidsByCompany.keys());
  }

  /**
   * Force refresh cache immediately
   */
  async forceRefresh(): Promise<void> {
    this.logger.log('Forcing cache refresh...');
    await this.refreshCache();
  }
}
