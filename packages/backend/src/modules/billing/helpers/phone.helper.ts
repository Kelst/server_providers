/**
 * Phone Helper Functions
 * Process and format phone numbers
 */

/**
 * Process phone number - removes country code prefix
 * Removes leading 3, 8, or 0 from phone number
 * @param phone - Phone number string
 * @returns Processed phone number without country code
 */
export function processPhoneNumber(phone: string | null | undefined): string {
  if (!phone) {
    return '';
  }

  // Remove all non-digit characters first
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('3')) {
    // 380951470082 -> 80951470082
    return cleaned.slice(3);
  } else if (cleaned.startsWith('8')) {
    // 80951470082 -> 0951470082
    return cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    // 0951470082 -> 951470082
    return cleaned.slice(1);
  } else {
    return cleaned;
  }
}

/**
 * Get phone number with lowest priority from contacts list
 * Priority 0 is highest (main phone)
 * @param contacts - Array of contact objects with priority and value
 * @returns Phone number with lowest (best) priority
 */
export function getLowestPriorityValue(
  contacts: Array<{ priority: number; value: string }>,
): string {
  if (!contacts || contacts.length === 0) {
    return '';
  }

  // Sort by priority (ascending) and get first non-empty value
  const sorted = contacts
    .filter((c) => c.value && c.value.trim() !== '')
    .sort((a, b) => a.priority - b.priority);

  return sorted.length > 0 ? sorted[0].value : '';
}

/**
 * Format phone number to display format
 * @param phone - Phone number string
 * @returns Formatted phone (e.g., "+380 67 123 4567")
 */
export function formatPhoneForDisplay(
  phone: string | null | undefined,
): string {
  if (!phone) {
    return '';
  }

  const cleaned = phone.replace(/\D/g, '');

  // Format Ukrainian numbers
  if (cleaned.startsWith('380') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }

  return phone;
}
