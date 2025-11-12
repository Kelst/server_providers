import {
  IOltVendor,
  OnuStatusData,
  SignalLevelData,
  OnuInfoData,
  OnuConfigData,
  MacAddressEntry,
  PortStateData,
} from '../interfaces/olt-vendor.interface';
import { Logger } from '@nestjs/common';

/**
 * BDCOM OLT Vendor Implementation
 *
 * Implements telnet commands and output parsing for BDCOM OLT devices.
 * Command syntax and parsing logic specific to BDCOM equipment.
 */
export class BdcomVendor implements IOltVendor {
  private readonly logger = new Logger(BdcomVendor.name);
  readonly vendorName = 'bdcom';

  /**
   * Get ONU status command for BDCOM
   *
   * BDCOM command format: show epon onu-information interface epon{port} {onuId}
   * Example: show epon onu-information interface epon0/8 15
   *
   * Note: BDCOM requires enable mode, so we prepend 'enable' command
   */
  getOnuStatusCommand(port: string, onuId: string): string {
    return `enable\nshow epon onu-information interface epon${port} ${onuId}`;
  }

  /**
   * Parse BDCOM ONU status output
   *
   * Expected output format (table can be split across 2 lines):
   * Interface EPON0/8 has registered 1 ONUs:
   * IntfName         VendorID ModelID    MAC Address    Description
   *     BindType Status           Dereg Reason
   * ---------------- -------- ---------- -------------- ----------------------------
   * --- -------- ---------------- -----------------
   * EPON0/8:15       PICO     E910       70a5.6add.7e1d N/A
   *     static   deregistered     power-off
   *
   * Parses ALL fields from table:
   * - IntfName (→ port, onuId)
   * - VendorID
   * - ModelID
   * - MAC Address (converts BDCOM format to standard)
   * - Description
   * - BindType
   * - Status (maps to online/offline/unknown)
   * - Dereg Reason
   */
  parseOnuStatus(rawOutput: string): OnuStatusData {
    try {
      const data: OnuStatusData = {
        port: '',
        onuId: '',
        status: 'unknown',
        rawData: {},
      };

      // Check if output is empty (ONU not found)
      if (!rawOutput || rawOutput.trim().length === 0) {
        data.error = 'ONU not found or not registered';
        this.logger.warn('Empty output - ONU not found');
        return data;
      }

      // Check if no ONUs registered (explicit message from OLT)
      if (rawOutput.includes('has registered 0 ONUs')) {
        data.error = `ONU not registered on this interface`;
        this.logger.warn('OLT reported 0 ONUs registered');
        return data;
      }

      // Parse the table output
      // BDCOM splits data across 2 lines:
      // Line 1: IntfName VendorID ModelID MAC Description
      // Line 2 (indented): BindType Status DeregReason
      const lines = rawOutput.split(/[\r\n]+/);
      let dataLine1: string | null = null;
      let dataLine2: string | null = null;
      let foundSeparator = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines
        if (!line.trim()) continue;

        // Look for separator line (dashes)
        if (line.includes('--------')) {
          foundSeparator = true;
          continue;
        }

        // After separator, find the line starting with EPON
        if (foundSeparator && !dataLine1 && line.trim().startsWith('EPON')) {
          dataLine1 = line;
          // Check if next line is continuation (indented or doesn't start with EPON)
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (nextLine && !nextLine.startsWith('EPON')) {
              dataLine2 = lines[i + 1];
            }
          }
          break;
        }
      }

      // If no data found after separator, ONU not registered
      if (!dataLine1) {
        data.error = 'Could not find ONU data in output - ONU may not be registered';
        this.logger.warn('No data line found after separator');
        data.rawData = { outputSnippet: rawOutput.substring(0, 300) };
        return data;
      }

      // Parse first line: IntfName VendorID ModelID MAC Description
      const parts1 = dataLine1.trim().split(/\s+/);

      if (parts1.length >= 4) {
        // 1. IntfName (e.g., EPON0/8:15)
        const intfName = parts1[0];
        const intfMatch = intfName.match(/EPON(\d+\/\d+):(\d+)/i);
        if (intfMatch) {
          data.port = intfMatch[1]; // e.g., "0/8"
          data.onuId = intfMatch[2]; // e.g., "15"
        }

        // 2. VendorID (e.g., "PICO")
        data.vendorId = parts1[1];

        // 3. ModelID (e.g., "E910")
        data.modelId = parts1[2];

        // ONU Type = VendorID + ModelID
        data.onuType = `${data.vendorId} ${data.modelId}`;

        // 4. MAC Address (BDCOM format: 70a5.6add.7e1d → 70:a5:6a:dd:7e:1d)
        const macBdcom = parts1[3];
        if (macBdcom && macBdcom.includes('.')) {
          // Convert BDCOM format to standard MAC
          data.macAddress = macBdcom
            .replace(/\./g, '') // Remove dots: "70a56add7e1d"
            .match(/.{1,2}/g) // Split into pairs: ["70","a5","6a","dd","7e","1d"]
            ?.join(':') || macBdcom; // Join with colons: "70:a5:6a:dd:7e:1d"
        } else {
          data.macAddress = macBdcom;
        }

        // 5. Description (index 4+, can be multiple words)
        if (parts1.length > 4) {
          const desc = parts1.slice(4).join(' ');
          // Store description even if it's "N/A"
          data.description = desc;
        }
      }

      // Parse second line (if present): BindType Status DeregReason
      if (dataLine2) {
        const parts2 = dataLine2.trim().split(/\s+/);

        if (parts2.length >= 2) {
          // 6. BindType (index 0) - "static" or "dynamic"
          data.bindType = parts2[0];

          // 7. Status (index 1) - keep original value and map to online/offline/unknown
          const statusStr = parts2[1];
          data.onuStatus = statusStr; // Store original ONU status value

          const statusLower = statusStr.toLowerCase();
          if (statusLower === 'auto-configured' || statusLower === 'registered' || statusLower === 'online') {
            data.status = 'online';
          } else if (statusLower === 'deregistered' || statusLower === 'lost' || statusLower === 'offline') {
            data.status = 'offline';
          } else {
            data.status = 'unknown';
            this.logger.warn(`Unknown status string: ${statusStr}`);
          }

          // 8. Dereg Reason (index 2+, can be multiple words)
          if (parts2.length > 2) {
            const deregReason = parts2.slice(2).join(' ');
            // Store dereg reason even if it's "N/A"
            data.lastDeregReason = deregReason;
          }
        }
      } else {
        // Second line not found - try single-line format or wide terminal output
        this.logger.warn('Second line not found - checking for single-line format or wide output');

        // For wide terminal output, all fields may be on one line
        // Try to parse: EPON0/8:15 PICO E910 70a5.6add.7e1d Description static deregistered power-off
        if (parts1.length >= 7) {
          // Assume format: IntfName VendorID ModelID MAC Description BindType Status DeregReason
          const bindTypeIdx = parts1.length - 3; // Third from last
          const statusIdx = parts1.length - 2; // Second from last
          const deregReasonIdx = parts1.length - 1; // Last

          data.bindType = parts1[bindTypeIdx];

          const statusStr = parts1[statusIdx].toLowerCase();
          if (statusStr === 'auto-configured' || statusStr === 'registered' || statusStr === 'online') {
            data.status = 'online';
          } else if (statusStr === 'deregistered' || statusStr === 'lost' || statusStr === 'offline') {
            data.status = 'offline';
          } else {
            data.status = 'unknown';
          }

          data.lastDeregReason = parts1[deregReasonIdx];

          this.logger.debug('Parsed as single-line wide format');
        } else {
          // Try to determine status from raw output
          const lowerOutput = rawOutput.toLowerCase();
          if (lowerOutput.includes('auto-configured') || lowerOutput.includes('registered')) {
            data.status = 'online';
          } else if (lowerOutput.includes('deregistered') || lowerOutput.includes('lost')) {
            data.status = 'offline';
          }

          data.rawData = { ...data.rawData, parseWarning: 'Incomplete parsing - second line not found' };
        }
      }

      // Store snippet of raw output for debugging
      data.rawData = {
        ...data.rawData,
        outputSnippet: rawOutput.substring(0, 500),
      };

      this.logger.debug(`Parsed ONU status: port=${data.port}, onuId=${data.onuId}, status=${data.status}, MAC=${data.macAddress}`);

      return data;
    } catch (error) {
      this.logger.error('Failed to parse ONU status:', error);
      return {
        port: '',
        onuId: '',
        status: 'unknown',
        error: `Parsing error: ${error.message}`,
        rawData: { output: rawOutput.substring(0, 300), errorStack: error.stack },
      };
    }
  }

  /**
   * Get active ONU details command for BDCOM (for online ONUs)
   *
   * BDCOM command format: show epon active-onu interface epon{port} {onuId}
   * Example: show epon active-onu interface epon0/8 15
   *
   * This provides additional details for online ONUs:
   * - Distance, RTT
   * - OAM Status
   * - Last registration/deregistration times
   * - Last deregistration reason
   * - Alive time
   */
  getActiveOnuCommand(port: string, onuId: string): string {
    return `enable\nshow epon active-onu interface epon${port} ${onuId}`;
  }

  /**
   * Parse BDCOM active ONU output
   *
   * Expected output format:
   * Interface EPON0/8 has bound 1 active ONUs:
   * IntfName         MAC Address    Status           OAM Status   Distance(m) RTT(TQ) LastRegTime         LastDeregTime       LastDeregReason   Alivetime
   * ---------------- -------------- ---------------- ------------ ----------- ------- ------------------- ------------------- ----------------- ------------
   * EPON0/8:15       70a5.6add.7e1d auto-configured  ctc-oam-oper 1180        728     2000-05-08 18:28:48 2000-05-08 15:44:20 power-off         0  .00:39:31
   */
  parseActiveOnu(rawOutput: string): Partial<OnuStatusData> {
    try {
      const data: Partial<OnuStatusData> = {
        rawData: {},
      };

      // Check if output is empty or no ONUs
      if (!rawOutput || rawOutput.trim().length === 0) {
        return data;
      }

      if (rawOutput.includes('has bound 0 active ONUs')) {
        return data;
      }

      // Parse the table output
      const lines = rawOutput.split(/[\r\n]+/);
      let dataLine: string | null = null;
      let foundSeparator = false;
      let dataLineIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip empty lines
        if (!line.trim()) continue;

        // Look for separator line
        if (line.includes('--------')) {
          foundSeparator = true;
          continue;
        }

        // After separator, find the line starting with EPON
        if (foundSeparator && !dataLine && line.trim().startsWith('EPON')) {
          dataLine = line;
          dataLineIndex = i;
          // Check if next line exists and might be continuation (starts with spaces)
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            // If next line doesn't start with EPON and is not empty, it's likely a continuation
            if (nextLine && !nextLine.startsWith('EPON') && !nextLine.includes('----')) {
              // Merge the two lines
              dataLine = dataLine + ' ' + nextLine;
            }
          }
          break;
        }
      }

      if (!dataLine) {
        this.logger.warn('Could not find active ONU data line in output');
        return data;
      }

      this.logger.debug(`Active ONU dataLine: "${dataLine}"`);

      // Parse data line
      // Format: IntfName MAC Status OAMStatus Distance(m) RTT(TQ) LastRegTime LastDeregTime LastDeregReason Alivetime
      const parts = dataLine.trim().split(/\s+/);

      this.logger.debug(`Active ONU parts (${parts.length}): ${JSON.stringify(parts)}`);

      if (parts.length >= 10) {
        // OAM Status (index 3)
        if (parts[3] !== 'N/A') {
          data.oamStatus = parts[3];
        }

        // Distance in meters (index 4)
        const distance = parseInt(parts[4], 10);
        if (!isNaN(distance)) {
          data.distance = distance;
        }

        // LastDeregReason (index 10)
        if (parts[10] !== 'N/A') {
          data.lastDeregReason = parts[10];
        }

        // Alivetime (index 11 and possibly 12 - might be split like "0  .00:39:31")
        if (parts.length > 11) {
          const aliveTimeParts = parts.slice(11);
          data.aliveTime = aliveTimeParts.join(' ');
        }
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to parse active ONU data:', error);
      return { rawData: { output: rawOutput.substring(0, 300), error: error.message } };
    }
  }

  /**
   * Get inactive ONU details command for BDCOM (for offline ONUs)
   *
   * BDCOM command format: show epon inactive-onu interface epon{port} {onuId}
   * Example: show epon inactive-onu interface epon0/8 25
   *
   * This provides additional details for offline ONUs:
   * - Last registration/deregistration times
   * - Last deregistration reason
   * - Absent time
   */
  getInactiveOnuCommand(port: string, onuId: string): string {
    return `enable\nshow epon inactive-onu interface epon${port} ${onuId}`;
  }

  /**
   * Parse BDCOM inactive ONU output
   *
   * Expected output format:
   * Interface EPON0/8 has bound 1 inactive ONUs:
   * IntfName         MAC Address    Status           LastRegTime         LastDeregTime       LastDeregReason   Absenttime
   * ---------------- -------------- ---------------- ------------------- ------------------- ----------------- ------------
   * EPON0/8:25       80f7.a607.ce31 lost             2000-02-26 13:48:37 2000-02-26 13:51:37 power-off         72 .05:29:13
   */
  parseInactiveOnu(rawOutput: string): Partial<OnuStatusData> {
    try {
      const data: Partial<OnuStatusData> = {
        rawData: {},
      };

      // Check if output is empty or no ONUs
      if (!rawOutput || rawOutput.trim().length === 0) {
        return data;
      }

      if (rawOutput.includes('has bound 0 inactive ONUs')) {
        return data;
      }

      // Parse the table output
      const lines = rawOutput.split(/[\r\n]+/);
      let dataLine: string | null = null;
      let foundSeparator = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip empty lines
        if (!line.trim()) continue;

        // Look for separator line
        if (line.includes('--------')) {
          foundSeparator = true;
          continue;
        }

        // After separator, find the line starting with EPON
        if (foundSeparator && !dataLine && line.trim().startsWith('EPON')) {
          dataLine = line;
          // Check if next line exists and might be continuation (starts with spaces)
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            // If next line doesn't start with EPON and is not empty, it's likely a continuation
            if (nextLine && !nextLine.startsWith('EPON') && !nextLine.includes('----')) {
              // Merge the two lines
              dataLine = dataLine + ' ' + nextLine;
            }
          }
          break;
        }
      }

      if (!dataLine) {
        this.logger.warn('Could not find inactive ONU data line in output');
        return data;
      }

      // Parse data line
      // Format: IntfName MAC Status LastRegTime LastDeregTime LastDeregReason Absenttime
      const parts = dataLine.trim().split(/\s+/);

      if (parts.length >= 7) {
        // LastDeregReason (index 7)
        if (parts.length > 7 && parts[7] !== 'N/A') {
          data.lastDeregReason = parts[7];
        }

        // Absenttime (index 8 and possibly 9 - might be split like "72 .05:29:13")
        if (parts.length > 8) {
          const absentTimeParts = parts.slice(8);
          data.aliveTime = absentTimeParts.join(' '); // Using aliveTime field for absent time
        }
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to parse inactive ONU data:', error);
      return { rawData: { output: rawOutput.substring(0, 300), error: error.message } };
    }
  }

  /**
   * Get signal level command for BDCOM
   *
   * Example: show epon interface ePON 0/1:4 onu ctc optical-transceiver-diagnosis
   */
  getSignalLevelCommand(port: string, onuId: string): string {
    return `show epon interface ePON ${port}:${onuId} onu ctc optical-transceiver-diagnosis`;
  }

  /**
   * Parse BDCOM signal level output
   *
   * Expected format:
   *  operating temperature(degree): 23
   *  supply voltage(V): 3.3
   *  bias current(mA): 11.3
   *  transmitted power(DBm): 1.5
   *  received power(DBm): -16.2
   */
  parseSignalLevel(rawOutput: string): SignalLevelData {
    try {
      const data: SignalLevelData = {
        port: '',
        onuId: '',
        rawData: { output: rawOutput },
      };

      // Check if output is empty (ONU offline)
      const trimmedOutput = rawOutput.trim();
      if (!trimmedOutput || trimmedOutput.length < 10) {
        this.logger.warn('Empty signal level output - ONU likely offline');
        return data;
      }

      // Parse operating temperature(degree): 23
      const tempMatch = rawOutput.match(/operating\s+temperature\(degree\):\s*(-?\d+\.?\d*)/i);
      if (tempMatch) {
        data.temperature = parseFloat(tempMatch[1]);
      }

      // Parse supply voltage(V): 3.3
      const voltageMatch = rawOutput.match(/supply\s+voltage\(V\):\s*(-?\d+\.?\d*)/i);
      if (voltageMatch) {
        data.voltage = parseFloat(voltageMatch[1]);
      }

      // Parse bias current(mA): 11.3
      const biasMatch = rawOutput.match(/bias\s+current\(mA\):\s*(-?\d+\.?\d*)/i);
      if (biasMatch) {
        data.biasCurrent = parseFloat(biasMatch[1]);
      }

      // Parse transmitted power(DBm): 1.5
      const txMatch = rawOutput.match(/transmitted\s+power\(DBm\):\s*(-?\d+\.?\d*)/i);
      if (txMatch) {
        data.txPower = parseFloat(txMatch[1]);
      }

      // Parse received power(DBm): -16.2 (MOST IMPORTANT)
      const rxMatch = rawOutput.match(/received\s+power\(DBm\):\s*(-?\d+\.?\d*)/i);
      if (rxMatch) {
        data.rxPower = parseFloat(rxMatch[1]);
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to parse signal level:', error);
      return {
        port: '',
        onuId: '',
        rawData: { output: rawOutput, error: error.message },
      };
    }
  }

  /**
   * Get ONU information command for BDCOM
   */
  getOnuInfoCommand(port: string, onuId: string): string {
    // TODO: Replace with actual BDCOM command
    return `show epon onu-information epon${port}:${onuId}`;
  }

  /**
   * Parse BDCOM ONU info output
   */
  parseOnuInfo(rawOutput: string): OnuInfoData {
    try {
      // TODO: Implement actual parsing logic

      const data: OnuInfoData = {
        port: '',
        onuId: '',
        rawData: { output: rawOutput },
      };

      const lines = rawOutput.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Example parsing patterns (to be replaced)
        const macMatch = trimmedLine.match(/MAC.*?([0-9a-f:.-]+)/i);
        if (macMatch) {
          data.macAddress = macMatch[1];
        }

        const snMatch = trimmedLine.match(/S\/N.*?(\S+)/i);
        if (snMatch) {
          data.serialNumber = snMatch[1];
        }

        const modelMatch = trimmedLine.match(/Model.*?(\S+)/i);
        if (modelMatch) {
          data.modelName = modelMatch[1];
        }
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to parse ONU info:', error);
      return {
        port: '',
        onuId: '',
        rawData: { output: rawOutput, error: error.message },
      };
    }
  }

  /**
   * Get ONU running configuration command for BDCOM
   *
   * Example: show running-config interface ePON 0/1:4
   */
  getOnuConfigCommand(port: string, onuId: string): string {
    return `show running-config interface ePON ${port}:${onuId}`;
  }

  /**
   * Parse BDCOM ONU configuration output
   *
   * Expected format:
   * Current configuration:
   * !
   * interface EPON0/1:4
   *   epon onu port 1 ctc vlan mode tag 104 priority 0
   *  epon sla upstream pir 1000000 cir 512
   *  epon sla downstream pir 1000000 cir 512
   */
  parseOnuConfig(rawOutput: string): OnuConfigData {
    try {
      const data: OnuConfigData = {};

      // Check if output is empty (ONU offline)
      if (!rawOutput || rawOutput.trim().length < 10) {
        this.logger.warn('Empty config output - ONU likely offline');
        return data;
      }

      // Parse VLAN configuration: epon onu port 1 ctc vlan mode tag 104 priority 0
      const vlanMatch = rawOutput.match(/epon\s+onu\s+port\s+\d+\s+ctc\s+vlan\s+mode\s+(\w+)\s+(\d+)\s+priority\s+(\d+)/i);
      if (vlanMatch) {
        data.vlanMode = vlanMatch[1]; // 'tag', 'transparent', etc.
        data.vlanId = parseInt(vlanMatch[2], 10);
        data.priority = parseInt(vlanMatch[3], 10);
      }

      // Parse upstream SLA: epon sla upstream pir 1000000 cir 512
      const upstreamMatch = rawOutput.match(/epon\s+sla\s+upstream\s+pir\s+(\d+)\s+cir\s+(\d+)/i);
      if (upstreamMatch) {
        data.upstreamSla = {
          pir: parseInt(upstreamMatch[1], 10),
          cir: parseInt(upstreamMatch[2], 10),
        };
      }

      // Parse downstream SLA: epon sla downstream pir 1000000 cir 512
      const downstreamMatch = rawOutput.match(/epon\s+sla\s+downstream\s+pir\s+(\d+)\s+cir\s+(\d+)/i);
      if (downstreamMatch) {
        data.downstreamSla = {
          pir: parseInt(downstreamMatch[1], 10),
          cir: parseInt(downstreamMatch[2], 10),
        };
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to parse ONU config:', error);
      return {};
    }
  }

  /**
   * Get MAC address table command for BDCOM
   *
   * Example: show mac address-table interface ePON 0/1:4
   */
  getOnuMacTableCommand(port: string, onuId: string): string {
    return `show mac address-table interface ePON ${port}:${onuId}`;
  }

  /**
   * Parse BDCOM MAC address table output
   *
   * Expected format:
   *         Mac Address Table (Total 1)
   * ------------------------------------------
   *
   * Vlan    Mac Address       Type       Ports
   * ----    -----------       ----       -----
   * 104    d847.321e.d80f      DYNAMIC    epon0/1:4
   */
  parseOnuMacTable(rawOutput: string): MacAddressEntry[] {
    try {
      const entries: MacAddressEntry[] = [];

      // Check if output is empty (ONU offline)
      if (!rawOutput || rawOutput.trim().length < 10) {
        this.logger.warn('Empty MAC table output - ONU likely offline');
        return entries;
      }

      // Split by lines and find MAC entries
      const lines = rawOutput.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip header lines and empty lines
        if (!trimmedLine || trimmedLine.includes('---') || trimmedLine.includes('Mac Address') || trimmedLine.includes('Total')) {
          continue;
        }

        // Parse MAC entry: 104    d847.321e.d80f      DYNAMIC    epon0/1:4
        const parts = trimmedLine.split(/\s+/);

        if (parts.length >= 4) {
          const vlanStr = parts[0];
          const macStr = parts[1];
          const typeStr = parts[2];

          // Validate VLAN is a number
          const vlan = parseInt(vlanStr, 10);
          if (isNaN(vlan)) {
            continue;
          }

          // Validate MAC format (e.g., d847.321e.d80f)
          if (macStr && macStr.match(/^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i)) {
            entries.push({
              macAddress: macStr,
              vlan: vlan,
              type: typeStr,
            });
          }
        }
      }

      return entries;
    } catch (error) {
      this.logger.error('Failed to parse MAC table:', error);
      return [];
    }
  }

  /**
   * Get ONU port state command for BDCOM
   *
   * Example: show epon interface ePON 0/1:4 onu port 1 state
   */
  getOnuPortStateCommand(port: string, onuId: string): string {
    return `show epon interface ePON ${port}:${onuId} onu port 1 state`;
  }

  /**
   * Parse BDCOM ONU port state output
   *
   * Expected format:
   *     Hardware state is Link-Up
   *     Speed is 100Mbps
   *     Duplex is Full-Duplex
   */
  parseOnuPortState(rawOutput: string): PortStateData {
    try {
      const data: PortStateData = {
        hardwareState: 'unknown',
      };

      // Check if output is empty (ONU offline)
      if (!rawOutput || rawOutput.trim().length < 10) {
        this.logger.warn('Empty port state output - ONU likely offline');
        data.hardwareState = 'Link-Down';
        return data;
      }

      // Parse Hardware state: Hardware state is Link-Up
      const stateMatch = rawOutput.match(/Hardware\s+state\s+is\s+(\S+)/i);
      if (stateMatch) {
        data.hardwareState = stateMatch[1]; // 'Link-Up', 'Link-Down'
      }

      // Parse Speed: Speed is 100Mbps
      const speedMatch = rawOutput.match(/Speed\s+is\s+(\S+)/i);
      if (speedMatch) {
        data.speed = speedMatch[1]; // '100Mbps', '1Gbps'
      }

      // Parse Duplex: Duplex is Full-Duplex
      const duplexMatch = rawOutput.match(/Duplex\s+is\s+(\S+)/i);
      if (duplexMatch) {
        data.duplex = duplexMatch[1]; // 'Full-Duplex', 'Half-Duplex'
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to parse port state:', error);
      return {
        hardwareState: 'unknown',
      };
    }
  }
}
