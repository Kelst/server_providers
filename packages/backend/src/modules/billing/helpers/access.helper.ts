/**
 * Access Helper Functions
 * Check user access permissions and special conditions
 */

interface UserAccessData {
  gid: number;
  dateConnect: string | null;
}

/**
 * Check if user has special access
 * Returns true if:
 * - gid = 55 AND dateConnect is empty/null
 * - No data found for user
 *
 * @param gid - User's group ID
 * @param dateConnect - User's connection date
 * @returns true if user has special access
 */
export function checkUserAccess(
  gid: number | null | undefined,
  dateConnect: string | null | undefined,
): boolean {
  // If no data, allow access
  if (gid === null || gid === undefined) {
    return true;
  }

  // Special case: gid = 55 and no connection date
  if (gid === 55 && (!dateConnect || dateConnect === '' || dateConnect === null)) {
    return true;
  }

  // Otherwise, no special access
  return false;
}

/**
 * Determine group ID based on access check
 * @param hasAccess - Result from checkUserAccess
 * @returns '55' if has access, '0' otherwise
 */
export function getGroupIdFromAccess(hasAccess: boolean): string {
  return hasAccess ? '55' : '0';
}
