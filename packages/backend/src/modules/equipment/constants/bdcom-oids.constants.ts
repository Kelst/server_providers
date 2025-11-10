/**
 * SNMP OID Constants for BDCOM OLT Devices
 *
 * These OIDs are used to query BDCOM OLT equipment via SNMP.
 * Includes standard MIB-2 OIDs and BDCOM-specific OIDs for PON monitoring.
 */

/**
 * Standard MIB-2 System Information OIDs (RFC 1213)
 */
export const SYSTEM_OIDS = {
  sysDescr: '1.3.6.1.2.1.1.1.0', // System description
  sysObjectID: '1.3.6.1.2.1.1.2.0', // System Object ID
  sysUpTime: '1.3.6.1.2.1.1.3.0', // System uptime (TimeTicks)
  sysContact: '1.3.6.1.2.1.1.4.0', // System contact
  sysName: '1.3.6.1.2.1.1.5.0', // System name
  sysLocation: '1.3.6.1.2.1.1.6.0', // System location
};

/**
 * Standard MIB-2 Interface Table OIDs (RFC 1213)
 * These are base OIDs - append interface index to query specific interface
 */
export const INTERFACE_OIDS = {
  ifDescr: '1.3.6.1.2.1.2.2.1.2', // Interface description
  ifType: '1.3.6.1.2.1.2.2.1.3', // Interface type
  ifMtu: '1.3.6.1.2.1.2.2.1.4', // Interface MTU
  ifSpeed: '1.3.6.1.2.1.2.2.1.5', // Interface speed
  ifPhysAddress: '1.3.6.1.2.1.2.2.1.6', // Interface MAC address
  ifAdminStatus: '1.3.6.1.2.1.2.2.1.7', // Admin status (1=up, 2=down, 3=testing)
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8', // Operational status (1=up, 2=down, 3=testing)
  ifLastChange: '1.3.6.1.2.1.2.2.1.9', // Last status change
  ifInOctets: '1.3.6.1.2.1.2.2.1.10', // Incoming bytes
  ifInUcastPkts: '1.3.6.1.2.1.2.2.1.11', // Incoming unicast packets
  ifInErrors: '1.3.6.1.2.1.2.2.1.14', // Incoming errors
  ifOutOctets: '1.3.6.1.2.1.2.2.1.16', // Outgoing bytes
  ifOutUcastPkts: '1.3.6.1.2.1.2.2.1.17', // Outgoing unicast packets
  ifOutErrors: '1.3.6.1.2.1.2.2.1.20', // Outgoing errors
};

/**
 * BDCOM-specific OIDs for EPON/GPON OLT
 * These OIDs are specific to BDCOM equipment for PON monitoring
 */
export const BDCOM_PON_OIDS = {
  // ONU Status Table
  onuMacAddress: '1.3.6.1.4.1.3320.101.11.1.1.3', // ONU MAC address
  onuStatus: '1.3.6.1.4.1.3320.101.11.1.1.5', // ONU status (1=online, 2=offline)
  onuDescription: '1.3.6.1.4.1.3320.101.11.1.1.6', // ONU description
  onuDistance: '1.3.6.1.4.1.3320.101.11.1.1.7', // ONU distance (meters)
  onuRxPower: '1.3.6.1.4.1.3320.101.11.1.1.9', // ONU RX power (dBm * 100)
  onuTxPower: '1.3.6.1.4.1.3320.101.11.1.1.10', // ONU TX power (dBm * 100)
  onuTemperature: '1.3.6.1.4.1.3320.101.11.1.1.11', // ONU temperature (°C)
  onuVoltage: '1.3.6.1.4.1.3320.101.11.1.1.12', // ONU voltage (mV)
  onuCurrent: '1.3.6.1.4.1.3320.101.11.1.1.13', // ONU current (mA)

  // PON Port Information
  ponPortRxPower: '1.3.6.1.4.1.3320.101.6.1.1.10', // PON port RX power
  ponPortTxPower: '1.3.6.1.4.1.3320.101.6.1.1.11', // PON port TX power
  ponPortTemperature: '1.3.6.1.4.1.3320.101.6.1.1.12', // PON port temperature
  ponPortVoltage: '1.3.6.1.4.1.3320.101.6.1.1.13', // PON port voltage
  ponPortCurrent: '1.3.6.1.4.1.3320.101.6.1.1.14', // PON port current
};

/**
 * Interface Status Values
 */
export const IF_STATUS = {
  UP: 1,
  DOWN: 2,
  TESTING: 3,
} as const;

/**
 * ONU Status Values
 */
export const ONU_STATUS = {
  ONLINE: 1,
  OFFLINE: 2,
} as const;

/**
 * Common SNMP query parameters
 */
export const SNMP_DEFAULTS = {
  VERSION: 'v2c', // SNMP version (v1, v2c, v3)
  COMMUNITY: 'public', // Default community string
  PORT: 161, // SNMP port
  TIMEOUT: 5000, // Timeout in milliseconds
  RETRIES: 3, // Number of retries
} as const;

/**
 * Helper function to build interface-specific OID
 * @param baseOid - Base OID from INTERFACE_OIDS
 * @param interfaceIndex - Interface index (e.g., 1, 2, 3...)
 * @returns Full OID string
 */
export function buildInterfaceOid(baseOid: string, interfaceIndex: number): string {
  return `${baseOid}.${interfaceIndex}`;
}

/**
 * Helper function to build PON OID for specific port/ONU
 * @param baseOid - Base OID from BDCOM_PON_OIDS
 * @param ponPort - PON port number (e.g., 1, 2, 3...)
 * @param onuId - ONU ID on the port (optional)
 * @returns Full OID string
 */
export function buildPonOid(baseOid: string, ponPort: number, onuId?: number): string {
  if (onuId !== undefined) {
    return `${baseOid}.${ponPort}.${onuId}`;
  }
  return `${baseOid}.${ponPort}`;
}
