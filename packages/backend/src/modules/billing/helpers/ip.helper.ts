/**
 * IP Helper Functions
 * Converts between integer and IP address formats
 */

/**
 * Convert integer to IP address string
 * @param int - Integer representation of IP
 * @returns IP address string (e.g., "192.168.1.1")
 */
export function intToIp(int: number | null | undefined): string {
  if (!int || int === 0) {
    return '';
  }

  // Determine each octet of IP address
  const octet1 = (int >> 24) & 255;
  const octet2 = (int >> 16) & 255;
  const octet3 = (int >> 8) & 255;
  const octet4 = int & 255;

  // Assemble octets into IP address string
  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

/**
 * Convert IP address string to integer
 * @param ip - IP address string (e.g., "192.168.1.1")
 * @returns Integer representation of IP
 */
export function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) {
    throw new Error('Invalid IP address format');
  }

  return (
    ((parts[0] & 255) << 24) |
    ((parts[1] & 255) << 16) |
    ((parts[2] & 255) << 8) |
    (parts[3] & 255)
  );
}
