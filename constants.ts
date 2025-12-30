export const CURRENCY_FORMATTER = new Intl.NumberFormat('uz-UZ', {
  style: 'currency',
  currency: 'UZS',
  maximumFractionDigits: 0,
});

export const STATIC_SERVICES = [
  {
    id: 's1',
    name: 'Tish tozalash (Air Flow)',
    description: 'Tishlarni professional tozalash va oqartirish.',
    price: 350000,
    recommended: false,
  },
  {
    id: 's2',
    name: 'Plomba (Fotopolimer)',
    description: 'Yuqori sifatli material bilan tishni plombalash.',
    price: 400000,
    recommended: false,
  },
  {
    id: 's3',
    name: 'Tish sug\'urish',
    description: 'Og\'riqsiz tish olish jarayoni.',
    price: 200000,
    recommended: false,
  },
  {
    id: 's4',
    name: 'Implantatsiya',
    description: 'Titan implant o\'rnatish (1 dona).',
    price: 3500000,
    recommended: false,
  }
];