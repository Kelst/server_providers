import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  CustomerDataResponseDto,
  CustomerInfoDto,
  MacInfoDto,
  DeviceInfoDto,
  AbonIdResponseDto,
  CustomerDetailsResponseDto,
  MacLocationResponseDto,
  DeviceDataResponseDto,
} from './dto/customer-data.dto';
import {
  CustomerTasksResponseDto,
  TaskInfoDto,
  TaskCommentDto,
  TasksStatisticsDto,
} from './dto/task.dto';
import { normalizeMac } from './utils/mac-normalizer.util';

/**
 * Simple in-memory cache with TTL
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Userside Service
 *
 * Proxies requests to Userside API (https://us.intelekt.cv.ua/api.php)
 * Handles authentication with API key and parameter forwarding
 */
@Injectable()
export class UsersideService {
  private readonly logger = new Logger(UsersideService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly vlanOpensvitKey: string;
  private readonly vlanVelesKey: string;
  private readonly cacheTtl: number;
  private readonly cache = new Map<string, CacheEntry<any>>();

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('userside.apiUrl');
    this.apiKey = this.configService.get<string>('userside.apiKey');
    this.vlanOpensvitKey = this.configService.get<string>(
      'userside.vlanMapping.opensvitKey'
    );
    this.vlanVelesKey = this.configService.get<string>(
      'userside.vlanMapping.velesKey'
    );
    this.cacheTtl = this.configService.get<number>(
      'userside.cacheConfig.customerDataTtl'
    );

    this.logger.log(`Userside API configured: ${this.apiUrl}`);
    this.logger.log(
      `Cache TTL: ${this.cacheTtl}s, VLAN keys: ${this.vlanOpensvitKey}/${this.vlanVelesKey}`
    );

    // Cleanup expired cache entries every minute
    setInterval(() => this.cleanupCache(), 60000);
  }

  /**
   * Forward query to Userside API
   *
   * @param params - Query parameters to send to Userside API
   * @returns Response from Userside API with status code
   */
  async query(params: Record<string, any>) {
    try {
      // Always include API key with params
      const requestParams = {
        key: this.apiKey,
        ...params,
      };

      this.logger.debug(
        `Sending request to Userside API: ${JSON.stringify({
          cat: params.cat,
          subcat: params.subcat,
        })}`,
      );

      const response = await axios.get(this.apiUrl, {
        params: requestParams,
        timeout: 10000, // 10 second timeout
      });

      this.logger.debug(`Userside API responded with status: ${response.status}`);

      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        this.logger.error(
          `Userside API error: ${axiosError.message}`,
          axiosError.response?.data,
        );

        throw new HttpException(
          axiosError.response?.data || 'Userside API error',
          axiosError.response?.status || 500,
        );
      }

      this.logger.error(`Unexpected error calling Userside API:`, error);
      throw error;
    }
  }

  /**
   * Get complete customer data with device information
   * Implements pipeline: uid → customer_id → customer_data + mac → device_id → device_data
   *
   * @param uid - Billing UID (e.g., '140278')
   * @returns Complete customer data with warnings for failed API calls
   */
  async getCustomerData(uid: string): Promise<CustomerDataResponseDto> {
    const cacheKey = `customer_data:${uid}`;

    // Check cache first
    const cached = this.getFromCache<CustomerDataResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached customer data for uid: ${uid}`);
      return cached;
    }

    const warnings: string[] = [];
    let customerInfo: CustomerInfoDto | null = null;
    let macInfo: MacInfoDto[] | null = null;
    let deviceInfo: DeviceInfoDto | null = null;

    try {
      // Step 1: Get customer ID from billing UID
      const customerId = await this.getAbonId(uid);
      if (!customerId) {
        throw new HttpException('Customer not found by UID', 404);
      }

      // Step 2: Get customer data
      const customerData = await this.getCustomerDetails(customerId);
      customerInfo = this.extractCustomerInfo(customerData);

      // Step 3: Try to find MAC on device
      const macAddress = this.extractMacAddress(customerData);
      if (macAddress) {
        const normalizedMac = normalizeMac(macAddress);
        if (normalizedMac) {
          const macLocations = await this.findMacOnDevice(normalizedMac);
          if (macLocations && macLocations.length > 0) {
            // Filter records within 10 hours of the freshest
            const recentMacRecords = this.filterRecentMacRecords(macLocations);
            macInfo = recentMacRecords.map((record) => this.extractMacInfo(record));

            // Step 4: Get device info from the freshest record
            if (recentMacRecords.length > 0 && recentMacRecords[0].device_id) {
              const deviceData = await this.getDeviceData(
                recentMacRecords[0].device_id.toString()
              );
              if (deviceData) {
                deviceInfo = this.extractDeviceInfo(deviceData);
              } else {
                warnings.push('Device information not found');
              }
            }
          } else {
            warnings.push('MAC address not found on any device');
          }
        } else {
          warnings.push('Invalid MAC address format');
        }
      } else {
        warnings.push('No MAC address found in customer data');
      }
    } catch (error) {
      this.logger.error('Error in customer data pipeline:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve customer data',
        500
      );
    }

    const result: CustomerDataResponseDto = {
      customerInfo,
      macInfo,
      deviceInfo,
      warnings: warnings.length > 0 ? warnings : null,
    };

    // Cache the result
    this.setInCache(cacheKey, result, this.cacheTtl);

    return result;
  }

  /**
   * Get customer ID from billing UID
   * Endpoint: GET /userside/abon-id/:uid
   *
   * @param uid - Billing UID
   * @returns Customer ID response with UID
   */
  async getAbonIdResponse(uid: string): Promise<AbonIdResponseDto> {
    const cacheKey = `abon_id:${uid}`;

    // Check cache first
    const cached = this.getFromCache<AbonIdResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached abon ID for uid: ${uid}`);
      return cached;
    }

    const customerId = await this.getAbonId(uid);
    if (!customerId) {
      throw new HttpException('Customer not found by UID', 404);
    }

    const result: AbonIdResponseDto = {
      customerId,
      uid,
    };

    // Cache for 30 seconds
    this.setInCache(cacheKey, result, this.cacheTtl);

    return result;
  }

  /**
   * Get customer details by customer ID
   * Endpoint: GET /userside/customer-details/:customerId
   *
   * @param customerId - Customer ID from Userside
   * @returns Customer details response
   */
  async getCustomerDetailsResponse(
    customerId: number,
  ): Promise<CustomerDetailsResponseDto> {
    const cacheKey = `customer_details:${customerId}`;

    // Check cache first
    const cached = this.getFromCache<CustomerDetailsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Returning cached customer details for ID: ${customerId}`,
      );
      return cached;
    }

    const customerData = await this.getCustomerDetails(customerId);
    if (!customerData) {
      throw new HttpException('Customer details not found', 404);
    }

    const customerInfo = this.extractCustomerInfo(customerData);

    const result: CustomerDetailsResponseDto = {
      customerId,
      customerInfo,
    };

    // Cache for 30 seconds
    this.setInCache(cacheKey, result, this.cacheTtl);

    return result;
  }

  /**
   * Find MAC address on devices
   * Endpoint: GET /userside/mac-location/:mac
   *
   * @param mac - MAC address (any format)
   * @returns MAC location response with filtered records
   */
  async getMacLocationResponse(mac: string): Promise<MacLocationResponseDto> {
    const normalizedMac = normalizeMac(mac);
    if (!normalizedMac) {
      throw new HttpException('Invalid MAC address format', 400);
    }

    const cacheKey = `mac_location:${normalizedMac}`;

    // Check cache first
    const cached = this.getFromCache<MacLocationResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached MAC location for: ${normalizedMac}`);
      return cached;
    }

    const macLocations = await this.findMacOnDevice(normalizedMac);
    if (!macLocations || macLocations.length === 0) {
      throw new HttpException('MAC address not found on any device', 404);
    }

    // Filter records within 10 hours of the freshest
    const recentMacRecords = this.filterRecentMacRecords(macLocations);
    const locations = recentMacRecords.map((record) =>
      this.extractMacInfo(record),
    );

    const result: MacLocationResponseDto = {
      mac: normalizedMac,
      locations,
    };

    // Cache for 30 seconds
    this.setInCache(cacheKey, result, this.cacheTtl);

    return result;
  }

  /**
   * Get device data by device ID
   * Endpoint: GET /userside/device/:deviceId
   *
   * @param deviceId - Device ID from Userside
   * @returns Device data response
   */
  async getDeviceDataResponse(deviceId: string): Promise<DeviceDataResponseDto> {
    const cacheKey = `device_data:${deviceId}`;

    // Check cache first
    const cached = this.getFromCache<DeviceDataResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached device data for ID: ${deviceId}`);
      return cached;
    }

    const deviceData = await this.getDeviceData(deviceId);
    if (!deviceData) {
      throw new HttpException('Device not found', 404);
    }

    const deviceInfo = this.extractDeviceInfo(deviceData);

    const result: DeviceDataResponseDto = {
      deviceId,
      deviceInfo,
    };

    // Cache for 30 seconds
    this.setInCache(cacheKey, result, this.cacheTtl);

    return result;
  }

  /**
   * Get customer ID from billing UID
   * API: cat=customer&action=get_abon_id&data_typer=billing_uid&data_value=140278
   */
  private async getAbonId(uid: string): Promise<number | null> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          key: this.apiKey,
          cat: 'customer',
          action: 'get_abon_id',
          data_typer: 'billing_uid',
          data_value: uid,
        },
        timeout: 10000,
      });

      if (response.data?.result === 'OK' && response.data?.Id) {
        return response.data.Id;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting abon ID for uid ${uid}:`, error);
      return null;
    }
  }

  /**
   * Get customer details by customer ID
   * API: cat=customer&action=get_data&customer_id=96754
   */
  private async getCustomerDetails(customerId: number): Promise<any> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          key: this.apiKey,
          cat: 'customer',
          action: 'get_data',
          customer_id: customerId,
        },
        timeout: 10000,
      });

      if (response.data?.result === 'OK' && response.data?.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error getting customer details for ID ${customerId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Find MAC address on device
   * API: cat=device&action=find_mac&mac=909a4a955f20
   */
  private async findMacOnDevice(mac: string): Promise<any[] | null> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          key: this.apiKey,
          cat: 'device',
          action: 'find_mac',
          mac: mac,
        },
        timeout: 10000,
      });

      if (response.data?.result === 'OK' && response.data?.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error finding MAC ${mac}:`, error);
      return null;
    }
  }

  /**
   * Get device data by device ID
   * API: cat=device&action=get_data&object_id=125646&object_type=olt
   */
  private async getDeviceData(deviceId: string): Promise<any> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          key: this.apiKey,
          cat: 'device',
          action: 'get_data',
          object_id: deviceId,
          object_type: 'olt',
        },
        timeout: 10000,
      });

      if (response.data?.result === 'OK' && response.data?.data) {
        const deviceData = response.data.data[deviceId];
        return deviceData || null;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting device data for ID ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * Extract customer info from API response
   */
  private extractCustomerInfo(data: any): CustomerInfoDto {
    return {
      dateActivity: data?.date_activity || null,
      dateActivityInet: data?.date_activity_inet || null,
      comment: data?.comment || null,
      flagCorporate: data?.flag_corporate ?? null,
      dateCreate: data?.date_create || null,
      dateConnect: data?.date_connect || null,
      datePositiveBalance: data?.date_positive_balance || null,
    };
  }

  /**
   * Extract MAC address from customer data
   */
  private extractMacAddress(data: any): string | null {
    if (data?.ip_mac) {
      const ipMacEntries = Object.values(data.ip_mac);
      if (ipMacEntries.length > 0) {
        const firstEntry = ipMacEntries[0] as any;
        return firstEntry?.mac || null;
      }
    }
    return null;
  }

  /**
   * Filter MAC records to include only those within 10 hours of the freshest record
   *
   * @param records - Array of MAC records from find_mac API
   * @returns Filtered array of records within 10 hours of the most recent
   */
  private filterRecentMacRecords(records: any[]): any[] {
    if (records.length === 0) {
      return [];
    }

    if (records.length === 1) {
      return records;
    }

    // Find the freshest record (max date_last)
    const freshestRecord = records.reduce((freshest, current) => {
      const freshestDate = new Date(freshest.date_last || 0);
      const currentDate = new Date(current.date_last || 0);
      return currentDate > freshestDate ? current : freshest;
    });

    const freshestDate = new Date(freshestRecord.date_last);
    const tenHoursInMs = 10 * 60 * 60 * 1000; // 10 hours in milliseconds

    // Filter records within 10 hours of the freshest
    const recentRecords = records.filter((record) => {
      const recordDate = new Date(record.date_last || 0);
      const timeDiff = freshestDate.getTime() - recordDate.getTime();
      return timeDiff >= 0 && timeDiff <= tenHoursInMs;
    });

    // Sort by date_last descending (freshest first)
    return recentRecords.sort((a, b) => {
      const dateA = new Date(a.date_last || 0);
      const dateB = new Date(b.date_last || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Extract MAC info from find_mac API response
   */
  private extractMacInfo(data: any): MacInfoDto {
    return {
      deviceId: data?.device_id ?? null,
      mac: data?.mac || null,
      port: data?.port || null,
      vlanId: data?.vlan_id ?? null,
      dateFirst: data?.date_first || null,
      dateLast: data?.date_last || null,
    };
  }

  /**
   * Extract device info from device get_data API response
   */
  private extractDeviceInfo(data: any): DeviceInfoDto {
    // Extract VLAN values from additional_data
    const additionalData = data?.additional_data || {};
    const vlanPppoeOpensvit = additionalData[this.vlanOpensvitKey] || null;
    const vlanPppoeVeles = additionalData[this.vlanVelesKey] || null;

    return {
      name: data?.name || null,
      ip: data?.ip || null,
      host: data?.host || null,
      comment: data?.comment || null,
      location: data?.location || null,
      activityTime: data?.activity_time || null,
      isOnline: data?.is_online ?? null,
      snmpProto: data?.snmp_proto ?? null,
      snmpCommunityRo: data?.snmp_community_ro || null,
      snmpCommunityRw: data?.snmp_community_rw || null,
      snmpPort: data?.snmp_port ?? null,
      telnetLogin: data?.telnet_login || null,
      telnetPass: data?.telnet_pass || null,
      vlanPppoeOpensvit,
      vlanPppoeVeles,
    };
  }

  /**
   * Get customer tasks with full analytics
   * Endpoint: GET /userside/customer-tasks/:customerId
   *
   * @param customerId - Customer ID from Userside
   * @returns Customer tasks with analytics and statistics
   */
  async getCustomerTasks(
    customerId: number,
  ): Promise<CustomerTasksResponseDto> {
    const cacheKey = `customer_tasks:${customerId}`;

    // Check cache first
    const cached = this.getFromCache<CustomerTasksResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Returning cached customer tasks for ID: ${customerId}`,
      );
      return cached;
    }

    try {
      // Step 1: Get list of task IDs
      const taskIds = await this.getTaskList(customerId);
      if (!taskIds || taskIds.length === 0) {
        return {
          customerId,
          tasks: [],
          statistics: {
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            averageExecutionTimeHours: null,
            lastTaskCreatedDate: null,
            lastTaskCompletedDate: null,
          },
        };
      }

      // Step 2: Get details for each task
      const tasksData = await Promise.all(
        taskIds.map((taskId) => this.getTaskDetails(taskId)),
      );

      // Filter out null results
      const validTasksData = tasksData.filter((task) => task !== null);

      if (validTasksData.length === 0) {
        throw new HttpException('Failed to retrieve task details', 500);
      }

      // Step 3: Sort tasks by creation date (oldest first)
      validTasksData.sort((a, b) => {
        const dateA = new Date(a.date?.create || 0);
        const dateB = new Date(b.date?.create || 0);
        return dateA.getTime() - dateB.getTime();
      });

      // Step 4: Extract task info with computed fields
      const tasks: TaskInfoDto[] = validTasksData.map((taskData, index) => {
        const previousTaskData = index > 0 ? validTasksData[index - 1] : null;
        return this.extractTaskInfo(taskData, previousTaskData);
      });

      // Step 5: Calculate statistics
      const statistics = this.calculateStatistics(tasks);

      const result: CustomerTasksResponseDto = {
        customerId,
        tasks,
        statistics,
      };

      // Cache for 30 seconds
      this.setInCache(cacheKey, result, this.cacheTtl);

      return result;
    } catch (error) {
      this.logger.error(
        `Error getting customer tasks for ID ${customerId}:`,
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to retrieve customer tasks', 500);
    }
  }

  /**
   * Get list of task IDs for customer
   * API: cat=task&action=get_list&customer_id=138343
   */
  private async getTaskList(customerId: number): Promise<number[]> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          key: this.apiKey,
          cat: 'task',
          action: 'get_list',
          customer_id: customerId,
        },
        timeout: 10000,
      });

      if (response.data?.result === 'OK' && response.data?.list) {
        // Parse comma-separated list of IDs
        const listStr = response.data.list as string;
        if (!listStr || listStr.trim() === '') {
          return [];
        }
        return listStr.split(',').map((id) => parseInt(id.trim(), 10));
      }

      return [];
    } catch (error) {
      this.logger.error(
        `Error getting task list for customer ${customerId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get task details by task ID
   * API: cat=task&action=show&id=771571
   */
  private async getTaskDetails(taskId: number): Promise<any> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          key: this.apiKey,
          cat: 'task',
          action: 'show',
          id: taskId,
        },
        timeout: 10000,
      });

      if (response.data?.result === 'OK' && response.data?.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting task details for ID ${taskId}:`, error);
      return null;
    }
  }

  /**
   * Extract task info from API response with computed fields
   */
  private extractTaskInfo(
    taskData: any,
    previousTaskData: any | null,
  ): TaskInfoDto {
    const createDate = taskData?.date?.create || null;
    const completeDate = taskData?.date?.complete || null;

    // Calculate execution time or in-progress time
    let executionTimeHours: number | null = null;
    let inProgressHours: number | null = null;

    if (createDate && completeDate) {
      executionTimeHours = this.calculateExecutionTime(
        createDate,
        completeDate,
      );
    } else if (createDate && !completeDate) {
      inProgressHours = this.calculateInProgressTime(createDate);
    }

    // Calculate time since previous task
    let timeSincePreviousTaskHours: number | null = null;
    if (previousTaskData && previousTaskData.date?.create && createDate) {
      timeSincePreviousTaskHours = this.calculateTimeSincePreviousTask(
        previousTaskData.date.create,
        createDate,
      );
    }

    // Extract comments
    const comments: TaskCommentDto[] = [];
    if (taskData?.comments && typeof taskData.comments === 'object') {
      for (const [commentId, commentData] of Object.entries(
        taskData.comments,
      )) {
        const comment = commentData as any;
        comments.push({
          id: parseInt(commentId, 10),
          employeeId: comment.employee_id || null,
          comment: comment.comment || '',
          dateAdd: comment.dateAdd || null,
        });
      }
    }

    return {
      id: taskData?.id || null,
      type: {
        id: taskData?.type?.id || null,
        name: taskData?.type?.name || null,
      },
      dates: {
        create: createDate,
        todo: taskData?.date?.todo || null,
        update: taskData?.date?.update || null,
        complete: completeDate,
        deadlineIndividualHour: taskData?.date?.deadline_individual_hour || 0,
        runtimeIndividualHour: taskData?.date?.runtime_individual_hour || 0,
      },
      description: taskData?.description || null,
      comments,
      executionTimeHours,
      inProgressHours,
      timeSincePreviousTaskHours,
    };
  }

  /**
   * Calculate execution time in hours
   */
  private calculateExecutionTime(
    createDate: string,
    completeDate: string,
  ): number {
    const create = new Date(createDate);
    const complete = new Date(completeDate);
    const diffMs = complete.getTime() - create.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate in-progress time in hours
   */
  private calculateInProgressTime(createDate: string): number {
    const create = new Date(createDate);
    const now = new Date();
    const diffMs = now.getTime() - create.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate time since previous task in hours
   */
  private calculateTimeSincePreviousTask(
    previousCreateDate: string,
    currentCreateDate: string,
  ): number {
    const previous = new Date(previousCreateDate);
    const current = new Date(currentCreateDate);
    const diffMs = current.getTime() - previous.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate tasks statistics
   */
  private calculateStatistics(tasks: TaskInfoDto[]): TasksStatisticsDto {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.dates.complete !== null,
    ).length;
    const inProgressTasks = totalTasks - completedTasks;

    // Calculate average execution time for completed tasks
    let averageExecutionTimeHours: number | null = null;
    const executionTimes = tasks
      .filter((task) => task.executionTimeHours !== null)
      .map((task) => task.executionTimeHours as number);

    if (executionTimes.length > 0) {
      const sum = executionTimes.reduce((acc, time) => acc + time, 0);
      averageExecutionTimeHours =
        Math.round((sum / executionTimes.length) * 100) / 100;
    }

    // Find last created and last completed dates
    let lastTaskCreatedDate: string | null = null;
    let lastTaskCompletedDate: string | null = null;

    if (tasks.length > 0) {
      // Tasks are sorted by creation date, so last is most recent (freshest)
      const freshestTask = tasks[tasks.length - 1];
      lastTaskCreatedDate = freshestTask.dates.create;

      // Get completion date of the freshest task (null if not completed)
      lastTaskCompletedDate = freshestTask.dates.complete;
    }

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      averageExecutionTimeHours,
      lastTaskCreatedDate,
      lastTaskCompletedDate,
    };
  }

  /**
   * Get value from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data;
    }
    // Remove expired entry
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set value in cache with TTL
   */
  private setInCache<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }
}
