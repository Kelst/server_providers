/**
 * Data Helper Functions
 * Converts and formats data units and time
 */

/**
 * Convert bytes to GB
 * @param bytes - Number of bytes
 * @returns Size in GB
 */
function bytesToGB(bytes: number): number {
  const gb = bytes / Math.pow(1024, 3);
  return gb;
}

/**
 * Convert data from database format (octets + gigawords)
 * @param data - Bytes count (octets)
 * @param acc - Gigaword count (acct_input_gigawords or acct_output_gigawords)
 * @returns Data size in GB rounded to 2 decimal places
 */
export function convertDataFromDB(
  data: number | null | undefined,
  acc: number | null | undefined,
): number {
  if (!data && !acc) {
    return 0;
  }

  const base = 4294967295;

  if (acc === 0 || !acc) {
    return parseFloat(bytesToGB(data || 0).toFixed(2));
  } else {
    return parseFloat(bytesToGB(acc * base + (data || 0)).toFixed(2));
  }
}

/**
 * Format seconds to "D HH:MM:SS" time string
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "0 02:30:15")
 */
export function formatTime(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) {
    return '0';
  }

  // Calculate days, hours, minutes and seconds
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;

  // Format according to requirements
  const formattedTime = days.toString() + ' ' +
                      (hours < 10 ? '0' : '') + hours.toString() + ':' +
                      (minutes < 10 ? '0' : '') + minutes.toString() + ':' +
                      (sec < 10 ? '0' : '') + sec.toString();

  return formattedTime;
}

/**
 * Get time difference from start date to now in HH:MM:SS format
 * @param startDate - Start date (MySQL datetime string, ISO string or Date)
 * @returns Formatted time difference (e.g., "00:20:15")
 */
export function getDifference(
  startDate: string | Date | null | undefined,
): string {
  if (!startDate) {
    return '00:00:00';
  }

  // Handle MySQL datetime format "YYYY-MM-DD HH:MM:SS"
  // Replace space with 'T' to make it ISO-compatible
  let dateString = startDate;
  if (typeof startDate === 'string' && startDate.includes(' ')) {
    dateString = startDate.replace(' ', 'T');
  }

  const targetDate = new Date(dateString);
  const currentDate = new Date();
  const differenceInMillis = currentDate.getTime() - targetDate.getTime();

  // Calculate difference in hours, minutes and seconds
  const seconds = Math.floor(differenceInMillis / 1000) % 60;
  const minutes = Math.floor(differenceInMillis / (1000 * 60)) % 60;
  const hours = Math.floor(differenceInMillis / (1000 * 60 * 60));

  // Format as "HH:MM:SS"
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}
