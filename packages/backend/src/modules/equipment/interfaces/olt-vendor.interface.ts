/**
 * OLT Vendor Interface
 *
 * Defines the contract that all OLT vendor implementations must follow.
 * Each vendor (BDCOM, Huawei, ZTE, etc.) will implement this interface
 * with vendor-specific command syntax and output parsing.
 */
export interface IOltVendor {
  /**
   * Vendor name (e.g., 'bdcom', 'huawei', 'zte')
   */
  readonly vendorName: string;

  /**
   * Get command to check ONU status
   *
   * @param port - PON port (e.g., '0/1')
   * @param onuId - ONU ID (e.g., '1')
   * @returns Command string
   */
  getOnuStatusCommand(port: string, onuId: string): string;

  /**
   * Parse ONU status command output
   *
   * @param rawOutput - Raw command output
   * @returns Parsed ONU status data
   */
  parseOnuStatus(rawOutput: string): OnuStatusData;

  /**
   * Get command to check ONU signal level
   *
   * @param port - PON port
   * @param onuId - ONU ID
   * @returns Command string
   */
  getSignalLevelCommand(port: string, onuId: string): string;

  /**
   * Parse signal level command output
   *
   * @param rawOutput - Raw command output
   * @returns Parsed signal level data
   */
  parseSignalLevel(rawOutput: string): SignalLevelData;

  /**
   * Get command to retrieve detailed ONU information
   *
   * @param port - PON port
   * @param onuId - ONU ID
   * @returns Command string
   */
  getOnuInfoCommand(port: string, onuId: string): string;

  /**
   * Parse ONU info command output
   *
   * @param rawOutput - Raw command output
   * @returns Parsed ONU information
   */
  parseOnuInfo(rawOutput: string): OnuInfoData;

  /**
   * Get command to check active ONU details (for online ONUs)
   * Optional method for vendors that support detailed active ONU info
   *
   * @param port - PON port
   * @param onuId - ONU ID
   * @returns Command string
   */
  getActiveOnuCommand?(port: string, onuId: string): string;

  /**
   * Parse active ONU command output
   *
   * @param rawOutput - Raw command output
   * @returns Parsed active ONU data (partial, will be merged with status data)
   */
  parseActiveOnu?(rawOutput: string): Partial<OnuStatusData>;

  /**
   * Get command to check inactive ONU details (for offline ONUs)
   * Optional method for vendors that support detailed inactive ONU info
   *
   * @param port - PON port
   * @param onuId - ONU ID
   * @returns Command string
   */
  getInactiveOnuCommand?(port: string, onuId: string): string;

  /**
   * Parse inactive ONU command output
   *
   * @param rawOutput - Raw command output
   * @returns Parsed inactive ONU data (partial, will be merged with status data)
   */
  parseInactiveOnu?(rawOutput: string): Partial<OnuStatusData>;
}

/**
 * ONU Status Data (generic structure)
 */
export interface OnuStatusData {
  port: string;
  onuId: string;
  status: 'online' | 'offline' | 'unknown';
  onuType?: string;
  vendorId?: string; // Vendor ID (e.g., 'PICO')
  modelId?: string; // Model ID (e.g., 'E910')
  macAddress?: string;
  description?: string; // ONU description (e.g., 'N/A' or custom description)
  bindType?: string; // static or dynamic
  onuStatus?: string; // ONU status from OLT (e.g., 'auto-configured', 'deregistered')
  distance?: number; // in meters
  oamStatus?: string; // OAM status (e.g., 'ctc-oam-oper')
  lastDeregReason?: string; // Last deregistration reason
  aliveTime?: string; // Alive time (for online) or absent time (for offline)
  uptime?: string;
  error?: string; // Error message if ONU not found or parsing failed
  rawData?: any; // Additional vendor-specific data
}

/**
 * Signal Level Data
 */
export interface SignalLevelData {
  port: string;
  onuId: string;
  rxPower?: number; // dBm - received power at OLT
  txPower?: number; // dBm - transmitted power from ONU
  temperature?: number; // Celsius
  voltage?: number; // Volts
  biasCurrent?: number; // mA
  rawData?: any;
}

/**
 * ONU Information Data
 */
export interface OnuInfoData {
  port: string;
  onuId: string;
  macAddress?: string;
  serialNumber?: string;
  modelName?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  ipAddress?: string;
  vlan?: number;
  bandwidth?: {
    upstream?: number;
    downstream?: number;
  };
  rawData?: any;
}
