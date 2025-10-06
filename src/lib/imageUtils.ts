/**
 * Utility functions for handling image URLs, especially Google Drive links
 */

/**
 * Converts Google Drive share URLs to direct image URLs
 * @param url - The Google Drive share URL
 * @returns Direct image URL or original URL if not a Google Drive link
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return url;
  
  // Check if it's a Google Drive share URL
  const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/;
  const match = url.match(driveRegex);
  
  if (match && match[1]) {
    const fileId = match[1];
    // Convert to direct download URL
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  
  // Check if it's already a direct Google Drive URL
  if (url.includes('drive.google.com/uc?')) {
    return url;
  }
  
  // Return original URL if not a Google Drive link
  return url;
}

/**
 * Gets a fallback image URL if the original fails to load
 * @param originalUrl - The original image URL
 * @returns Fallback image URL
 */
export function getFallbackImageUrl(originalUrl?: string): string {
  return originalUrl || 'https://placehold.co/400x200/e2e8f0/64748b?text=Course+Image';
}

/**
 * Validates if a URL is likely to be a valid image URL
 * @param url - The URL to validate
 * @returns Boolean indicating if URL is likely valid
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Check for common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i;
  if (imageExtensions.test(url)) return true;
  
  // Check for Google Drive URLs
  if (url.includes('drive.google.com')) return true;
  
  // Check for other common image hosting services
  const imageHosts = [
    'imgur.com',
    'cloudinary.com',
    'unsplash.com',
    'pexels.com',
    'pixabay.com',
    'firebasestorage.googleapis.com',
    'googleusercontent.com'
  ];
  
  return imageHosts.some(host => url.includes(host));
}
