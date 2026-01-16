
import { Treatment } from './types';

export const CURRENCY_FORMATTER = new Intl.NumberFormat('uz-UZ', {
  style: 'currency',
  currency: 'UZS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatPrice = (price: number, currency: 'UZS' | 'USD' = 'UZS') => {
  return currency === 'USD' ? USD_FORMATTER.format(price) : CURRENCY_FORMATTER.format(price);
};

export const STATIC_SERVICES: Treatment[] = [];

// TELEGRAM CONFIGURATION
export const TELEGRAM_BOT_TOKEN: string = '8565608994:AAGVcJCYuCDIDVPSCnxvMqCmXEbTq7ialfo'; 
export const TELEGRAM_ADMIN_ID: string = '153931240';
