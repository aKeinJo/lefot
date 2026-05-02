import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Languages that do not use spaces between words */
const NO_SPACE_LANGS = new Set(["ja", "zh", "zh-TW", "th"])

/**
 * Returns the separator string to insert between sentence chunks.
 * CJK/Thai: empty string. All others: single space.
 */
export function getSeparator(targetLanguage: string): string {
  return NO_SPACE_LANGS.has(targetLanguage) ? "" : " "
}
