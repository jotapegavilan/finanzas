export enum Category {
  Comida = "Comida",
  Transporte = "Transporte",
  Vivienda = "Vivienda",
  Entretenimiento = "Entretenimiento",
  Salud = "Salud",
  Compras = "Compras",
  Otros = "Otros",
}

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
}

export interface Income {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export interface Saving {
    id: string;
    amount: number;
    description: string;
    date: string;
    goalId?: string;
}

export interface Goal {
  id:string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface User {
  id: number;
  username: string;
}

export type Currency = 'EUR' | 'USD' | 'GBP' | 'MXN' | 'CLP';