
import { Treatment } from './types';

export const CURRENCY_FORMATTER = new Intl.NumberFormat('uz-UZ', {
  style: 'currency',
  currency: 'UZS',
  maximumFractionDigits: 0,
});

export const STATIC_SERVICES: Treatment[] = [];

// TELEGRAM CONFIGURATION
export const TELEGRAM_BOT_TOKEN: string = '8204799466:AAHvhm6ymD9NyJ77KCCdZgt9Ba2ZJBpE94I'; 
export const TELEGRAM_ADMIN_ID: string = '153931240'; 
