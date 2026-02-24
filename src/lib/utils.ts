import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertWeight(kg: number, unit: 'kg' | 'lbs'): number {
  if (unit === 'lbs') return Math.round(kg * 2.20462 * 10) / 10;
  return kg;
}

export function convertToKg(value: number, unit: 'kg' | 'lbs'): number {
  if (unit === 'lbs') return Math.round((value / 2.20462) * 10) / 10;
  return value;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatTimerSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Remove diacritics / Polish special characters for fuzzy search.
 * "ławka" → "lawka", "ćwiczenie" → "cwiczenie"
 */
export function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0142/g, 'l').replace(/\u0141/g, 'L');
}

/**
 * Compress a string to base64url using pako (gzip).
 */
export async function compressPlanData(data: string): Promise<string> {
  const { deflate } = await import('pako');
  const compressed = deflate(new TextEncoder().encode(data), { level: 9 });
  // Convert to base64url
  let binary = '';
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decompress a base64url string back to the original string.
 */
export async function decompressPlanData(encoded: string): Promise<string> {
  const { inflate } = await import('pako');
  // Restore base64
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decompressed = inflate(bytes);
  return new TextDecoder().decode(decompressed);
}
