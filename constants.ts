import { Category, Currency } from './types';

export const CATEGORY_COLORS: { [key in Category]: string } = {
  [Category.Comida]: "#34D399", // Emerald 400
  [Category.Transporte]: "#FBBF24", // Amber 400
  [Category.Vivienda]: "#60A5FA", // Blue 400
  [Category.Entretenimiento]: "#F472B6", // Pink 400
  [Category.Salud]: "#EC4899", // Fuchsia 500
  [Category.Compras]: "#818CF8", // Indigo 400
  [Category.Otros]: "#A78BFA", // Violet 400
};

export const CURRENCY_SYMBOLS: { [key in Currency]: string } = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  MXN: '$',
  CLP: '$',
};

export const INITIAL_BUDGET: { [key in Category]: number } = {
  [Category.Comida]: 400,
  [Category.Transporte]: 150,
  [Category.Vivienda]: 1200,
  [Category.Entretenimiento]: 200,
  [Category.Salud]: 100,
  [Category.Compras]: 250,
  [Category.Otros]: 80,
};