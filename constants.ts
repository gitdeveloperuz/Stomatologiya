import { Treatment } from './types';

export const CURRENCY_FORMATTER = new Intl.NumberFormat('uz-UZ', {
  style: 'currency',
  currency: 'UZS',
  maximumFractionDigits: 0,
});

export const STATIC_SERVICES: Treatment[] = [
  {
    id: 'static-1',
    name: 'Professional tish tozalash',
    description: 'Tish toshlari va karashlarini ultratovush va Air Flow yordamida tozalash. Tishlar silliqligi va tabiiy oqligini tiklaydi.',
    price: 350000,
    recommended: false
  },
  {
    id: 'static-2',
    name: 'Tish oqartirish (Zoom 4)',
    description: 'Xavfsiz va samarali ofis tish oqartirish tizimi. Bir muolajada 3-4 tonnagacha oqartirish imkoniyati.',
    price: 1200000,
    recommended: true
  },
  {
    id: 'static-3',
    name: 'Karies davolash (Kompozit plomba)',
    description: 'Zamonaviy yorug\'lik bilan qotuvchi yuqori sifatli kompozit materiallar yordamida tish butunligini tiklash.',
    price: 300000,
    recommended: false
  },
  {
    id: 'static-4',
    name: 'Tish olish (Oddiy)',
    description: 'Og\'riqsizlantirish ostida bajariladigan jarrohlik amaliyoti. Milkni asrash va tez bitishini ta\'minlash.',
    price: 150000,
    recommended: false
  }
];