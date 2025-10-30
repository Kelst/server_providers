import { ApiProperty } from '@nestjs/swagger';

/**
 * Basic User Information DTO
 */
export class UserBasicInfoDto {
  @ApiProperty({ description: 'User ID', example: 140278 })
  uid: number;

  @ApiProperty({ description: 'Full name', example: 'Іван Петренко' })
  name: string;

  @ApiProperty({ description: 'Phone number', example: '+380671234567' })
  phone: string;

  @ApiProperty({ description: 'Full address', example: 'Центральний район вул. Шевченка 10' })
  address: string;

  @ApiProperty({ description: 'User login', example: 'vlad_b_1' })
  login: string;

  @ApiProperty({ description: 'User password', example: 'V1234567' })
  password: string;

  @ApiProperty({ description: 'Telegram chat ID', example: '123456789', required: false })
  telegramId?: string;

  @ApiProperty({ description: 'Company name', example: 'Intelekt' })
  company: string;

  @ApiProperty({
    description: 'User status from internet_main.disable (0: active, 1: disabled, 3: paused)',
    example: 0
  })
  status: number;
}

/**
 * Internet Connection Information DTO
 */
export class InternetInfoDto {
  @ApiProperty({ description: 'Internet connection ID', example: 'inet_12345' })
  internetId: string;

  @ApiProperty({ description: 'Static IP address', example: '192.168.1.100' })
  ip: string;

  @ApiProperty({ description: 'Is static IP', example: true })
  isStaticIp: boolean;

  @ApiProperty({
    description: 'Connection status from internet_main.disable (0: active, 1: disabled, 3: paused)',
    example: 0
  })
  status: number;

  @ApiProperty({
    description: 'Registered MAC address (router MAC). May be outdated if router was replaced.',
    example: '90:9a:4a:95:5f:20'
  })
  registeredMac: string;

  @ApiProperty({ description: 'Current online status', example: true })
  statusInternet: boolean;
}

/**
 * Session Information DTO
 */
export class SessionInfoDto {
  @ApiProperty({ description: 'Guest/dynamic IP address', example: '100.64.1.10' })
  guestIp: string;

  @ApiProperty({ description: 'Session duration', example: '2h 30m 15s' })
  duration: string;

  @ApiProperty({ description: 'Data sent (MB)', example: 1024.50 })
  sendData: number;

  @ApiProperty({ description: 'Data received (MB)', example: 2048.75 })
  getData: number;
 
  @ApiProperty({ description: 'Cid mac adress', example: '909a.4a95.5f20' })
  cid: string;

  @ApiProperty({ description: 'Internet connection active', example: true })
  statusInternet: boolean;
}

/**
 * Tariff Information DTO
 */
export class TariffInfoDto {
  @ApiProperty({ description: 'Tariff name', example: 'Максимальний 100' })
  tariff: string;

  @ApiProperty({ description: 'Monthly payment', example: 250.00 })
  monthlyPayment: number;

  @ApiProperty({ description: 'Speed (Mbps)', example: 100 })
  tariffExtentionSpeed: number;
}

/**
 * Billing Information DTO
 */
export class BillingInfoDto {
  @ApiProperty({ description: 'Current balance', example: 150.50 })
  balance: number;

  @ApiProperty({ description: 'Deposit amount', example: 0 })
  deposit: number;

  @ApiProperty({ description: 'Reduction/discount (%)', example: 10 })
  reduction: number;

  @ApiProperty({ description: 'Credit end date', example: '2025-12-31', required: false })
  dateOfEndCredits?: string | null;

  @ApiProperty({ description: 'Bill ID', example: 158419 })
  billId: number;

  @ApiProperty({ description: 'Company ID', example: 0 })
  companyId: number;

  @ApiProperty({ description: 'Group ID', example: '55' })
  groupId: string;
}

/**
 * Family Account (SubLogin) DTO
 */
export class FamilyAccountDto {
  @ApiProperty({ description: 'User ID', example: 140279 })
  uid: string;

  @ApiProperty({ description: 'Login', example: 'ivan_s_2' })
  login: string;

  @ApiProperty({ description: 'Monthly payment', example: 200.00 })
  monthlyPayment: number;

  @ApiProperty({ description: 'Balance', example: 100.50 })
  balance: number;

  @ApiProperty({ description: 'Password', example: 'Pass123' })
  password: string;
}

/**
 * Additional Service DTO
 */
export class AdditionalServiceDto {
  @ApiProperty({ description: 'Service name', example: 'IPTV Premium' })
  name: string;

  @ApiProperty({ description: 'Service price', example: 50.00 })
  price: number;
}

/**
 * Additional Services Response DTO
 */
export class AdditionalServicesDto {
  @ApiProperty({ type: [AdditionalServiceDto], description: 'List of services' })
  services: AdditionalServiceDto[];

  @ApiProperty({ description: 'Total price of all services', example: 100.00 })
  totalPrice: number;
}

/**
 * Full User Data DTO (aggregates all information)
 */
export class FullUserDataDto {
  // Basic Info
  @ApiProperty({ description: 'User ID', example: 140278 })
  uid: number;

  @ApiProperty({ description: 'Full name', example: 'Іван Петренко' })
  name: string;

  @ApiProperty({ description: 'Phone number', example: '+380671234567' })
  phone: string;

  @ApiProperty({ description: 'Full address', example: 'Центральний район вул. Шевченка 10' })
  address: string;

  @ApiProperty({ description: 'User login', example: 'vlad_b_1' })
  login: string;

  @ApiProperty({ description: 'User password', example: 'V1234567' })
  password: string;

  @ApiProperty({ description: 'Telegram chat ID', example: '123456789', required: false })
  telegramId?: string;

  @ApiProperty({ description: 'Company name', example: 'Intelekt' })
  company: string;

  // Internet Info
  @ApiProperty({ description: 'Internet connection ID', example: 'inet_12345' })
  internetId: string;

  @ApiProperty({ description: 'Static IP address', example: '192.168.1.100' })
  ip: string;

  @ApiProperty({ description: 'Is static IP', example: true })
  isStaticIp: boolean;

  @ApiProperty({
    description: 'Connection status from internet_main.disable (0: active, 1: disabled, 3: paused)',
    example: 0
  })
  status: number;

  @ApiProperty({
    description: 'Registered MAC address (router MAC). May be outdated if router was replaced.',
    example: '90:9a:4a:95:5f:20'
  })
  registeredMac: string;

  // Session Info
  @ApiProperty({ description: 'Guest/dynamic IP address', example: '100.64.1.10' })
  guestIp: string;

  @ApiProperty({ description: 'Session duration', example: '2h 30m 15s' })
  duration: string;

  @ApiProperty({ description: 'Data sent (MB)', example: 1024.50 })
  sendData: number;

  @ApiProperty({ description: 'Data received (MB)', example: 2048.75 })
  getData: number;

  @ApiProperty({ description: 'Internet connection active', example: true })
  statusInternet: boolean;

  // Tariff Info
  @ApiProperty({ description: 'Tariff name', example: 'Максимальний 100' })
  tariff: string;

  @ApiProperty({ description: 'Monthly payment', example: 250.00 })
  monthlyPayment: number;

  @ApiProperty({ description: 'Speed (Mbps)', example: 100 })
  tariffExtentionSpeed: number;

  // Billing Info
  @ApiProperty({ description: 'Current balance', example: 150.50 })
  balance: number;

  @ApiProperty({ description: 'Deposit amount', example: 0 })
  deposit: number;

  @ApiProperty({ description: 'Reduction/discount (%)', example: 10 })
  reduction: number;

  @ApiProperty({ description: 'Credit end date', example: '2025-12-31', required: false })
  dateOfEndCredits?: string | null;

  @ApiProperty({ description: 'Bill ID', example: 158419 })
  billId: number;

  @ApiProperty({ description: 'Company ID', example: 0 })
  companyId: number;

  @ApiProperty({ description: 'Group ID', example: '55' })
  groupId: string;

  // Additional Services
  @ApiProperty({ type: AdditionalServicesDto, description: 'Additional services' })
  addServicePrice: AdditionalServicesDto;

  @ApiProperty({ description: 'Total payment (tariff + services - discount)', example: 315.00 })
  payAll: number;

  // Family Accounts
  @ApiProperty({ type: [FamilyAccountDto], description: 'Family accounts (sublogins)' })
  subLogin: FamilyAccountDto[];
}
