/**
 * Generate a 6-digit verification code
 * @returns Random 6-digit code as string (e.g., "123456")
 */
export function generateVerificationCode(): string {
  const min = 100000;
  const max = 999999;
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  return code.toString();
}
