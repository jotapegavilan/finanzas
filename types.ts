export enum Category {
  Comida = "Comida",
  Transporte = "Transporte",
  Vivienda = "Vivienda",
  Entretenimiento = "Entretenimiento",
  Salud = "Salud",
  Compras = "Compras",
  Otros = "Otros",
}

export enum AccountType {
  Credito = "Crédito",
  Debito = "Débito",
  Prepago = "Prepago",
  CuentaBancaria = "Cuenta Bancaria",
}

export interface FinancialAccount {
  id: string;
  userId: number;
  name: string;
  type: AccountType;
  billingDay?: number; // Día del mes para la facturación (1-31)
  paymentDay?: number; // Día del mes para el vencimiento del pago (1-31)
}

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
  accountId?: string;
}

export interface Income {
  id: string;
  amount: number;
  description: string;
  date: string;
  accountId?: string;
}

export interface Saving {
    id: string;
    amount: number;
    description: string;
    date: string;
    goalId?: string;
    accountId?: string;
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