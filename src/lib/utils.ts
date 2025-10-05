import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CoursePricing } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCoursePricing(pricing: CoursePricing, fallbackPrice?: number): string {
  if (!pricing || typeof pricing !== 'object') {
    // Fallback to old price format if pricing is not available
    return fallbackPrice ? `₦${fallbackPrice.toLocaleString()}` : 'Free';
  }

  switch (pricing.type) {
    case 'free':
      return 'Free';
    case 'donation':
      return (pricing.suggestedDonation && typeof pricing.suggestedDonation === 'number') 
        ? `Donation (suggested: ₦${pricing.suggestedDonation.toLocaleString()})` 
        : 'Donation';
    case 'payment':
      return (pricing.amount && typeof pricing.amount === 'number') 
        ? `₦${pricing.amount.toLocaleString()}` 
        : (fallbackPrice ? `₦${fallbackPrice.toLocaleString()}` : 'Paid');
    default:
      return fallbackPrice ? `₦${fallbackPrice.toLocaleString()}` : 'Free';
  }
}

export function getCoursePriceDisplay(pricing: CoursePricing, fallbackPrice?: number): { 
  display: string; 
  isPaid: boolean; 
  isDonation: boolean; 
  isFree: boolean;
} {
  if (!pricing || typeof pricing !== 'object' || !pricing.type) {
    const isPaid = fallbackPrice ? fallbackPrice > 0 : false;
    return {
      display: fallbackPrice ? `₦${fallbackPrice.toLocaleString()}` : 'Free',
      isPaid,
      isDonation: false,
      isFree: !isPaid
    };
  }

  const isFree = pricing.type === 'free';
  const isDonation = pricing.type === 'donation';
  const isPaid = pricing.type === 'payment';

  return {
    display: formatCoursePricing(pricing, fallbackPrice),
    isPaid,
    isDonation,
    isFree
  };
}
