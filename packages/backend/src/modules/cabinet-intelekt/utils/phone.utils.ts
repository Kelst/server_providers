/**
 * Normalize Ukrainian phone number to +380XXXXXXXXX format
 *
 * Accepts formats:
 * - 0501234567 -> +380501234567
 * - 380501234567 -> +380501234567
 * - +380501234567 -> +380501234567
 *
 * @param phoneNumber - Phone number in various formats
 * @returns Normalized phone number in +380XXXXXXXXX format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all spaces, dashes, parentheses
  let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');

  // If starts with 0, replace with +380
  if (normalized.startsWith('0')) {
    normalized = '+380' + normalized.slice(1);
  }
  // If starts with 380 without +, add +
  else if (normalized.startsWith('380') && !normalized.startsWith('+380')) {
    normalized = '+' + normalized;
  }
  // If doesn't start with +, assume it's already in correct format or add +380
  else if (!normalized.startsWith('+')) {
    normalized = '+380' + normalized;
  }

  return normalized;
}

/**
 * Validate if phone number matches Ukrainian format
 *
 * @param phoneNumber - Phone number to validate
 * @returns true if valid Ukrainian phone number
 */
export function isValidUkrainianPhone(phoneNumber: string): boolean {
  const normalized = normalizePhoneNumber(phoneNumber);
  // Ukrainian phone format: +380 followed by 9 digits
  return /^\+380\d{9}$/.test(normalized);
}
