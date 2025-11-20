/**
 * Cyrillic to Latin transliteration map (Ukrainian)
 */
const cyrillicToLatinMap: Record<string, string> = {
  // Ukrainian Cyrillic
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie',
  'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i', 'к': 'k', 'л': 'l',
  'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu',
  'я': 'ia',
  // Russian specific
  'ы': 'y', 'э': 'e', 'ё': 'io', 'ъ': '',
  // Uppercase
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ie',
  'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'I', 'Й': 'I', 'К': 'K', 'Л': 'L',
  'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
  'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Iu',
  'Я': 'Ia', 'Ы': 'Y', 'Э': 'E', 'Ё': 'Io', 'Ъ': '',
};

/**
 * Transliterate Cyrillic text to Latin
 */
function transliterate(text: string): string {
  return text
    .split('')
    .map((char) => cyrillicToLatinMap[char] || char)
    .join('');
}

/**
 * Generate URL-friendly slug from text
 * Supports Cyrillic (Ukrainian/Russian) transliteration
 *
 * @param text - Input text (can contain Cyrillic)
 * @param maxLength - Maximum slug length (default: 100)
 * @returns URL-friendly slug
 *
 * @example
 * generateSlug('Нові тарифні плани 2025') // 'novi-tarifni-plani-2025'
 * generateSlug('Hello World!') // 'hello-world'
 */
export function generateSlug(text: string, maxLength: number = 100): string {
  return transliterate(text)
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]+/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Truncate to max length
    .substring(0, maxLength)
    // Remove trailing hyphen if truncation created one
    .replace(/-+$/, '');
}

/**
 * Generate unique slug by appending number if slug already exists
 *
 * @param baseSlug - Base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug
 *
 * @example
 * generateUniqueSlug('my-article', ['my-article']) // 'my-article-2'
 * generateUniqueSlug('my-article', ['my-article', 'my-article-2']) // 'my-article-3'
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: string[],
): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}
