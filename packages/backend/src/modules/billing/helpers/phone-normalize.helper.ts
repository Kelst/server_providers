/**
 * Normalize phone number to format: 380XXXXXXXXX (12 digits)
 * Removes all non-digit characters and ensures proper format
 *
 * @param phone - Phone number in any format (e.g., "+380 67 123 45 67", "0671234567", etc.)
 * @returns Normalized phone number (e.g., "380671234567")
 *
 * @example
 * normalizePhoneNumber("+380 67 123 45 67") // "380671234567"
 * normalizePhoneNumber("0671234567")        // "380671234567"
 * normalizePhoneNumber("380671234567")      // "380671234567"
 * normalizePhoneNumber("+38 (067) 123-45-67") // "380671234567"
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) {
    return '';
  }

  // Remove all non-digit characters (spaces, dashes, parentheses, plus, etc.)
  let normalized = phone.replace(/\D/g, '');

  // Handle different input formats:
  // 1. If starts with "380" - already correct (380XXXXXXXXX)
  // 2. If starts with "0" - replace with "380" (0XXXXXXXXX -> 380XXXXXXXXX)
  // 3. If starts with "80" - add "3" prefix (80XXXXXXXXX -> 380XXXXXXXXX)
  // 4. Otherwise - assume it's missing country code

  if (normalized.startsWith('380')) {
    // Already in correct format: 380671234567
    return normalized;
  } else if (normalized.startsWith('0')) {
    // Format: 0671234567 -> 380671234567
    return '38' + normalized;
  } else if (normalized.startsWith('80')) {
    // Format: 80671234567 -> 380671234567
    return '3' + normalized;
  } else if (normalized.length === 9) {
    // Format: 671234567 -> 380671234567 (missing 0)
    return '380' + normalized;
  }

  // If none of the above, return as is (might be invalid, but let validation handle it)
  return normalized;
}

/**
 * Validate Ukrainian phone number format
 * Must be exactly 12 digits starting with 380
 *
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidUkrainianPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);

  // Must be exactly 12 digits and start with 380
  return /^380\d{9}$/.test(normalized);
}

/**
 * Format phone number for display (human-readable)
 *
 * @param phone - Phone number in any format
 * @returns Formatted phone number (e.g., "+380 67 123 45 67")
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);

  if (!isValidUkrainianPhone(normalized)) {
    return phone; // Return original if invalid
  }

  // Format: 380671234567 -> +380 67 123 45 67
  return `+${normalized.slice(0, 3)} ${normalized.slice(3, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8, 10)} ${normalized.slice(10)}`;
}
