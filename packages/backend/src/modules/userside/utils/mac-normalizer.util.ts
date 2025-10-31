/**
 * MAC Address Normalizer Utility
 *
 * Converts MAC addresses from various formats to a unified format
 *
 * Supported input formats:
 * - 90:9a:4a:95:5f:20
 * - 90-9a-4a-95-5f-20
 * - 909a4a955f20
 * - 909A4A955F20
 * - 90:9A:4A:95:5F:20
 * - 90-9A-4A-95-5F-20
 *
 * Output format: 909a4a955f20 (lowercase, no separators)
 */

/**
 * Normalizes a MAC address to lowercase without separators
 *
 * @param mac - MAC address in any common format
 * @returns Normalized MAC address (lowercase, no separators) or null if invalid
 *
 * @example
 * normalizeMac('90:9a:4a:95:5f:20') // '909a4a955f20'
 * normalizeMac('90-9A-4A-95-5F-20') // '909a4a955f20'
 * normalizeMac('909A4A955F20')     // '909a4a955f20'
 */
export function normalizeMac(mac: string | null | undefined): string | null {
  if (!mac) {
    return null;
  }

  // Remove all common separators (: - . space)
  const cleaned = mac.replace(/[:\-.\s]/g, '').toLowerCase();

  // Validate format: must be exactly 12 hexadecimal characters
  if (!/^[0-9a-f]{12}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Formats a normalized MAC address to a specific format
 *
 * @param mac - Normalized MAC address (12 hex chars)
 * @param format - Output format ('colon', 'dash', 'dot', 'none')
 * @returns Formatted MAC address
 *
 * @example
 * formatMac('909a4a955f20', 'colon') // '90:9a:4a:95:5f:20'
 * formatMac('909a4a955f20', 'dash')  // '90-9a-4a-95-5f-20'
 */
export function formatMac(
  mac: string,
  format: 'colon' | 'dash' | 'dot' | 'none' = 'none'
): string {
  const normalized = normalizeMac(mac);
  if (!normalized) {
    throw new Error(`Invalid MAC address: ${mac}`);
  }

  if (format === 'none') {
    return normalized;
  }

  // Split into pairs: 90 9a 4a 95 5f 20
  const pairs = normalized.match(/.{2}/g) || [];

  switch (format) {
    case 'colon':
      return pairs.join(':');
    case 'dash':
      return pairs.join('-');
    case 'dot':
      // Cisco format: 909a.4a95.5f20
      return [
        normalized.slice(0, 4),
        normalized.slice(4, 8),
        normalized.slice(8, 12),
      ].join('.');
    default:
      return normalized;
  }
}

/**
 * Validates if a string is a valid MAC address
 *
 * @param mac - MAC address to validate
 * @returns True if valid MAC address format
 */
export function isValidMac(mac: string | null | undefined): boolean {
  return normalizeMac(mac) !== null;
}
