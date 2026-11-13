import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely validates and normalizes an image URL for use in `img.src` attributes.
 * Rejects javascript:, vbscript:, data:text/html, unencoded characters, and unapproved protocols.
 * Allows safe base64 raster image data URLs (png, jpeg, webp, gif) and safe https/http/blob URLs.
 */
export function sanitizeImageUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Safe base64 raster images
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed;
  }

  // Safe blob URLs (generated via URL.createObjectURL for File/Blob objects)
  if (/^blob:[a-zA-Z0-9-/:_]+$/.test(trimmed)) {
    return trimmed;
  }

  // Safe HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.href;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Validates that a color string is a strict hex color code (e.g. #4F46E5).
 * Falls back to the provided default if invalid to prevent CSS/style injection.
 */
export function sanitizeHexColor(color: unknown, fallback = '#4F46E5'): string {
  if (typeof color === 'string' && /^#([0-9a-fA-F]{3}){1,2}$/.test(color.trim())) {
    return color.trim();
  }
  return fallback;
}
