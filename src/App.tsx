
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Expense, Goal, Category, Currency, Income, Saving, User, FinancialAccount, AccountType } from './types';
import { INITIAL_BUDGET, CATEGORY_COLORS, CURRENCY_SYMBOLS } from './constants';
import { generateFinancialTip } from './services/geminiService';
import { 
    initDB, getExpenses, getIncomes, getSavings, getGoals, getFinancialAccounts,
    addExpense, addIncome, addSaving, addGoal, addFundsToGoal, addFinancialAccount,
    deleteTransaction, deleteGoal, deleteFinancialAccount,
    updateExpense, updateIncome, updateSaving, updateFinancialAccount
} from './database';
import Auth from './Auth';

// --- Helper Functions --- //
const parseLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date(); 
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// --- Reusable SVG Icons --- //
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /> </svg> );
const PlusCircleIcon = ({ className }: { className?: string }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg> );
const PiggyBankIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path d="M2 10a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm3-3a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1H5z" /> <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v1h16V4a1 1 0 00-1-1H3zm14 12a1 1 0 01-1 1H4a1 1 0 01-1-1v-1h14v1z" clipRule="evenodd" /> </svg> );
const CalendarIcon = ({ className }: { className?: string }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4 mr-1.5 inline"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> </svg> );
const LightbulbIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"> <path d="M11 3a1 1 0 100 2h.01a1 1 0 100-2H11zM10 1a1 1 0 00-1 1v1a1 1 0 002 0V2a1 1 0 00-1-1zM4 9a1 1 0 01-2 0V7a1 1 0 112 0v2zm14-2a1 1 0 010 2v-2a1 1 0 010-2zM6.343 15.657a1 1 0 00-1.414-1.414L3.515 15.657a1 1 0 001.414 1.414l1.414-1.414zm10.607-10.607a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414-1.414l-1.414-1.414zM10 17a7 7 0 100-14 7 7 0 000 14zm-3-7a3 3 0 116 0 3 3 0 01-6 0z" /> </svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /> </svg> );
const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /> </svg> );
const LogoutIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /> </svg> );
const ClockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>);
const CreditCardIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v6a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm3 0a1 1 0 011-1h1a1 1 0 110 2H8a1 1 0 01-1-1zm3 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z" clipRule="evenodd" /></svg>);

// --- Reusable UI Components --- //
interface SummaryCardProps { title: string; value: string; color: string; }
const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, color }) => ( <div className={`p-4 rounded-xl shadow-lg bg-slate-800 border-l-4 ${color}`}> <h3 className="text-sm font-medium text-slate-400">{title}</h3> <p className="text-2xl font-bold text-slate-100">{value}</p> </div> );

const ModalWrapper: React.FC<{ title: string, children: React.ReactNode, onClose: () => void }> = ({ title, children, onClose }) => ( <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}> <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md m-4 transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}> <h2 className="text-2xl font-bold mb-6 text-slate-100">{title}</h2> {children} </div> </div> );
const FormButtons: React.FC<{ onCancel: () => void; submitText?: string }> = ({ onCancel, submitText = "Añadir" }) => ( <div className="flex justify-end space-x-4 pt-4"> <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">Cancelar</button> <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">{submitText}</button> </div> );
const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-500 text-slate-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />;
const FormSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />;
const FormLabel: React.FC<{ htmlFor: string, children: React.ReactNode }> = ({ htmlFor, children }) => <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-400">{children}</label>;

const Nav: React.FC<{ activeView: string, setActiveView: (view: 'dashboard' | 'cards') => void }> = ({ activeView, setActiveView }) => (
    <div className="mb-6 border-b border-slate-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button onClick={() => setActiveView('dashboard')} className={`${activeView === 'dashboard' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
                Panel Principal
            </button>
            <button onClick={() => setActiveView('cards')} className={`${activeView === 'cards' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
                Tarjetas de Crédito
            </button>
        </nav>
    </div>
);


// --- Form Modals --- //
const AddExpenseForm: React.FC<{ onAddExpense: (expense: Omit<Expense, 'id'>) => void; onClose: () => void; accounts: FinancialAccount[] }> = ({ onAddExpense, onClose, accounts }) => { const [amount, setAmount] = useState(''); const [category, setCategory] = useState<Category>(Category.Comida); const [description, setDescription] = useState(''); const [date, setDate] = useState(new Date().toISOString().split('T')[0]); const [accountId, setAccountId] = useState<string>(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(!amount || !description) return; onAddExpense({ amount: parseFloat(amount), category, description, date, accountId: accountId || undefined }); onClose(); }; return ( <ModalWrapper title="Añadir Nuevo Gasto" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <FormLabel htmlFor="amount">Importe</FormLabel> <FormInput type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required /> </div> <div> <FormLabel htmlFor="category">Categoría</FormLabel> <FormSelect id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)}> {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)} </FormSelect> </div> <div> <FormLabel htmlFor="account">Cuenta / Tarjeta</FormLabel> <FormSelect id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}> <option value="">Efectivo / No especificado</option> {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>)} </FormSelect> </div> <div> <FormLabel htmlFor="description">Descripción</FormLabel> <FormInput type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Café con amigos" required /> </div> <div> <FormLabel htmlFor="date">Fecha</FormLabel> <FormInput type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required /> </div> <FormButtons onCancel={onClose} submitText="Añadir Gasto" /> </form> </ModalWrapper> ); };
const AddIncomeForm: React.FC<{ onAddIncome: (income: Omit<Income, 'id'>) => void; onClose: () => void; accounts: FinancialAccount[] }> = ({ onAddIncome, onClose, accounts }) => { const [amount, setAmount] = useState(''); const [description, setDescription] = useState(''); const [date, setDate] = useState(new Date().toISOString().split('T')[0]); const [accountId, setAccountId] = useState<string>(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(!amount || !description) return; onAddIncome({ amount: parseFloat(amount), description, date, accountId: accountId || undefined }); onClose(); }; const bankAccounts = accounts.filter(a => a.type === AccountType.CuentaBancaria); return ( <ModalWrapper title="Añadir Nuevo Ingreso" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <FormLabel htmlFor="income-amount">Importe</FormLabel> <FormInput type="number" id="income-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required /> </div> <div> <FormLabel htmlFor="income-account">Depositar en</FormLabel> <FormSelect id="income-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}> <option value="">Efectivo / No especificado</option> {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)} </FormSelect> </div> <div> <FormLabel htmlFor="income-description">Descripción</FormLabel> <FormInput type="text" id="income-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Salario mensual" required /> </div> <div> <FormLabel htmlFor="income-date">Fecha</FormLabel> <FormInput type="date" id="income-date" value={date} onChange={(e) => setDate(e.target.value)} required /> </div> <FormButtons onCancel={onClose} submitText="Añadir Ingreso" /> </form> </ModalWrapper> ); };
const AddSavingForm: React.FC<{ onAddSaving: (saving: Omit<Saving, 'id'>) => void; onClose: () => void; accounts: FinancialAccount[] }> = ({ onAddSaving, onClose, accounts }) => { const [amount, setAmount] = useState(''); const [description, setDescription] = useState(''); const [date, setDate] = useState(new Date().toISOString().split('T')[0]); const [accountId, setAccountId] = useState<string>(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(!amount || !description) return; onAddSaving({ amount: parseFloat(amount), description, date, accountId: accountId || undefined }); onClose(); }; const bankAccounts = accounts.filter(a => a.type === AccountType.CuentaBancaria); return ( <ModalWrapper title="Añadir Ahorro" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <FormLabel htmlFor="saving-amount">Importe</FormLabel> <FormInput type="number" id="saving-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required /> </div> <div> <FormLabel htmlFor="saving-account">Ahorrar en</FormLabel> <FormSelect id="saving-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}> <option value="">Efectivo / No especificado</option> {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)} </FormSelect> </div> <div> <FormLabel htmlFor="saving-description">Descripción</FormLabel> <FormInput type="text" id="saving-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ahorro para vacaciones" required /> </div> <div> <FormLabel htmlFor="saving-date">Fecha</FormLabel> <FormInput type="date" id="saving-date" value={date} onChange={(e) => setDate(e.target.value)} required /> </div> <FormButtons onCancel={onClose} submitText="Añadir Ahorro" /> </form> </ModalWrapper> ); };
const AddGoalForm: React.FC<{ onAddGoal: (goal: Omit<Goal, 'id' | 'currentAmount'>) => void; onClose: () => void; }> = ({ onAddGoal, onClose }) => { const [name, setName] = useState(''); const [targetAmount, setTargetAmount] = useState(''); const [deadline, setDeadline] = useState(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name || !targetAmount || !deadline) return; onAddGoal({ name, targetAmount: parseFloat(targetAmount), deadline }); onClose(); }; return ( <ModalWrapper title="Crear Nueva Meta" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <FormLabel htmlFor="goal-name">Nombre de la Meta</FormLabel> <FormInput type="text" id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Comprar una casa" required /> </div> <div> <FormLabel htmlFor="goal-target">Objetivo</FormLabel> <FormInput type="number" id="goal-target" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="100000" required /> </div> <div> <FormLabel htmlFor="goal-deadline">Fecha Límite</FormLabel> <FormInput type="date" id="goal-deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} required /> </div> <FormButtons onCancel={onClose} submitText="Crear Meta" /> </form> </ModalWrapper> ); };
const AddFundsToGoalForm: React.FC<{ onAddFunds: (amount: number, accountId?: string) => void; onClose: () => void; goalName: string; accounts: FinancialAccount[] }> = ({ onAddFunds, onClose, goalName, accounts }) => { const [amount, setAmount] = useState(''); const [accountId, setAccountId] = useState<string>(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!amount || parseFloat(amount) <= 0) return; onAddFunds(parseFloat(amount), accountId || undefined); onClose(); }; const bankAccounts = accounts.filter(a => a.type === AccountType.CuentaBancaria); return ( <ModalWrapper title={`Aportar a: ${goalName}`} onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <FormLabel htmlFor="fund-amount">Importe a Aportar</FormLabel> <FormInput type="number" id="fund-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50.00" required autoFocus /> </div> <div> <FormLabel htmlFor="fund-account">Aportar desde</FormLabel> <FormSelect id="fund-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}> <option value="">Efectivo / No especificado</option> {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)} </FormSelect> </div> <FormButtons onCancel={onClose} submitText="Aportar Fondos" /> </form> </ModalWrapper> ); };
const EditTransactionForm: React.FC<{ item: Expense | Income | Saving; type: 'expense' | 'income' | 'saving'; onUpdate: (item: Expense | Income | Saving) => void; onClose: () => void; accounts: FinancialAccount[]; }> = ({ item, type, onUpdate, onClose, accounts }) => { const [amount, setAmount] = useState(item.amount.toString()); const [description, setDescription] = useState(item.description); const [date, setDate] = useState(item.date); const [category, setCategory] = useState(type === 'expense' ? (item as Expense).category : Category.Otros); const [accountId, setAccountId] = useState(item.accountId || ''); const getTitle = () => { if (type === 'expense') return "Editar Gasto"; if (type === 'saving') return "Editar Ahorro"; return "Editar Ingreso"; }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!amount || !description || !date) return; let updatedItem: Expense | Income | Saving; const commonProps = { id: item.id, amount: parseFloat(amount), description, date, accountId: accountId || undefined }; if (type === 'expense') { updatedItem = { ...commonProps, category }; } else if (type === 'saving') { updatedItem = { ...commonProps, goalId: (item as Saving).goalId }; } else { updatedItem = { ...commonProps }; } onUpdate(updatedItem); onClose(); }; return ( <ModalWrapper title={getTitle()} onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <FormLabel htmlFor="edit-amount">Importe</FormLabel> <FormInput type="number" id="edit-amount" value={amount} onChange={(e) => setAmount(e.target.value)} required /> </div> {type === 'expense' && ( <div> <FormLabel htmlFor="edit-category">Categoría</FormLabel> <FormSelect id="edit-category" value={category} onChange={(e) => setCategory(e.target.value as Category)}> {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)} </FormSelect> </div> )} <div> <FormLabel htmlFor="edit-account">Cuenta / Tarjeta</FormLabel> <FormSelect id="edit-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}> <option value="">Efectivo / No especificado</option> {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>)} </FormSelect> </div> <div> <FormLabel htmlFor="edit-description">Descripción</FormLabel> <FormInput type="text" id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} required /> </div> <div> <FormLabel htmlFor="edit-date">Fecha</FormLabel> <FormInput type="date" id="edit-date" value={date} onChange={(e) => setDate(e.target.value)} required /> </div> <FormButtons onCancel={onClose} submitText="Guardar Cambios" /> </form> </ModalWrapper> ); };
const AddAccountForm: React.FC<{ onAddAccount: (account: Omit<FinancialAccount, 'id' | 'userId'>) => void; onClose: () => void; }> = ({ onAddAccount, onClose }) => { const [name, setName] = useState(''); const [type, setType] = useState<AccountType>(AccountType.CuentaBancaria); const [billingDay, setBillingDay] = useState(''); const [paymentDay, setPaymentDay] = useState(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name || (type === AccountType.Credito && (!billingDay || !paymentDay))) return; const accountData: Omit<FinancialAccount, 'id' | 'userId'> = { name, type }; if (type === AccountType.Credito) { accountData.billingDay = parseInt(billingDay); accountData.paymentDay = parseInt(paymentDay); } onAddAccount(accountData); onClose(); }; return ( <ModalWrapper title="Añadir Cuenta o Tarjeta" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <FormLabel htmlFor="account-name">Nombre</FormLabel> <FormInput type="text" id="account-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Tarjeta CMR Falabella" required /> </div> <div> <FormLabel htmlFor="account-type">Tipo</FormLabel> <FormSelect id="account-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}> {Object.values(AccountType).map(t => <option key={t} value={t}>{t}</option>)} </FormSelect> </div> {type === AccountType.Credito && ( <> <div><FormLabel htmlFor="billing-day">Día de Facturación (1-31)</FormLabel><FormInput type="number" id="billing-day" value={billingDay} onChange={e => setBillingDay(e.target.value)} min="1" max="31" placeholder="Ej: 25" required /></div> <div><FormLabel htmlFor="payment-day">Día de Vencimiento de Pago (1-31)</FormLabel><FormInput type="number" id="payment-day" value={paymentDay} onChange={e => setPaymentDay(e.target.value)} min="1" max="31" placeholder="Ej: 10" required /></div> </> )} <FormButtons onCancel={onClose} submitText="Añadir Cuenta" /> </form> </ModalWrapper> ); };
const EditAccountForm: React.FC<{ account: FinancialAccount; onUpdate: (account: FinancialAccount) => void; onClose: () => void; }> = ({ account, onUpdate, onClose }) => { const [name, setName] = useState(account.name); const [type, setType] = useState<AccountType>(account.type); const [billingDay, setBillingDay] = useState(account.billingDay?.toString() || ''); const [paymentDay, setPaymentDay] = useState(account.paymentDay?.toString() || ''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name || (type === AccountType.Credito && (!billingDay || !paymentDay))) return; const updatedAccount: FinancialAccount = { ...account, name, type, }; if (type === AccountType.Credito) { updatedAccount.billingDay = parseInt(billingDay); updatedAccount.paymentDay = parseInt(paymentDay); } else { delete updatedAccount.billingDay; delete updatedAccount.paymentDay; } onUpdate(updatedAccount); onClose(); }; return ( <ModalWrapper title="Editar Cuenta o Tarjeta" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <FormLabel htmlFor="edit-account-name">Nombre</FormLabel> <FormInput type="text" id="edit-account-name" value={name} onChange={(e) => setName(e.target.value)} required /> </div> <div> <FormLabel htmlFor="edit-account-type">Tipo</FormLabel> <FormSelect id="edit-account-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}> {Object.values(AccountType).map(t => <option key={t} value={t}>{t}</option>)} </FormSelect> </div> {type === AccountType.Credito && ( <> <div><FormLabel htmlFor="edit-billing-day">Día de Facturación (1-31)</FormLabel><FormInput type="number" id="edit-billing-day" value={billingDay} onChange={e => setBillingDay(e.target.value)} min="1" max="31" required /></div> <div><FormLabel htmlFor="edit-payment-day">Día de Vencimiento de Pago (1-31)</FormLabel><FormInput type="number" id="edit-payment-day" value={paymentDay} onChange={e => setPaymentDay(e.target.value)} min="1" max="31" required /></div> </> )} <FormButtons onCancel={onClose} submitText="Guardar Cambios" /> </form> </ModalWrapper> ); };

// --- View Components --- //

const DashboardView = (props: any) => {
    const {
        summaryChartData, formatCurrency, currency, pieChartData, recentTransactions, accountsById,
        expenseByCategory, goals, savingsTarget, totalSavings,
        handleGetFinancialTip, isTipLoading, financialTip, selectedMonth, monthNames,
        handleDelete, setEditingItem, handleDeleteGoal, setSelectedGoalId, setModalType,
        accounts, handleDeleteAccount
    } = props;
    return(
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <SummaryCard title="Ingresos del Mes" value={formatCurrency(props.totalIncome)} color="border-green-400" />
              <SummaryCard title="Gastos del Mes" value={formatCurrency(props.totalExpenses)} color="border-red-400" />
              <SummaryCard title="Ahorro del Mes" value={formatCurrency(props.totalSavings)} color="border-blue-400" />
              <SummaryCard title="Balance del Mes" value={formatCurrency(props.currentBalance)} color={props.currentBalance >= 0 ? "border-indigo-400" : "border-amber-500"} />
            </div>

            <div className="bg-slate-800 p-5 rounded-xl shadow-lg mb-8">
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center"><LightbulbIcon /> Consejo Financiero para {monthNames[selectedMonth]}</h3>
                    <button onClick={handleGetFinancialTip} disabled={isTipLoading} className="px-4 py-2 bg-amber-400 text-amber-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"> {isTipLoading ? 'Generando...' : 'Obtener Consejo'} </button>
                </div>
                {isTipLoading && <div className="mt-4 text-center text-slate-400">Buscando la mejor recomendación para ti...</div>}
                {financialTip && <p className="mt-4 text-amber-200 bg-amber-900/20 p-4 rounded-lg border border-amber-500/30">{financialTip}</p>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
              <div className="lg:col-span-3 bg-slate-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Resumen del Mes</h3>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={summaryChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis tickFormatter={(value) => CURRENCY_SYMBOLS[currency] + value} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'rgba(71, 85, 105, 0.5)'}} contentStyle={{ backgroundColor: 'rgb(30 41 59 / 0.9)', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0' }} />
                      <Legend wrapperStyle={{color: '#e2e8f0'}}/>
                      <Bar dataKey="Ingresos" fill="#22C55E" name="Ingresos" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Gastos" fill="#EF4444" name="Gastos" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Ahorros" fill="#3B82F6" name="Ahorros" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Desglose de Gastos del Mes</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={{ fill: '#f1f5f9' }}> {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as Category]} />)} </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgb(30 41 59 / 0.9)', border: '1px solid #334155', borderRadius: '0.5rem', color: '#e2e8f0' }}/>
                            <Legend wrapperStyle={{color: '#e2e8f0'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">Análisis de Ahorro del Mes</h3>
                        <p className="text-sm text-slate-400">Recomendamos ahorrar al menos el 10% de tus ingresos.</p>
                        <div className="mt-4 space-y-3">
                            <div className="flex justify-between items-baseline"><span className="font-medium text-slate-300">Objetivo (10%)</span><span className="font-bold text-lg text-indigo-400">{formatCurrency(savingsTarget)}</span></div>
                            <div className="flex justify-between items-baseline"><span className="font-medium text-slate-300">Ahorrado</span><span className="font-bold text-lg text-green-400">{formatCurrency(totalSavings)}</span></div>
                            <div className="w-full bg-slate-700 rounded-full h-2.5"><div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${savingsTarget > 0 ? Math.min((totalSavings / savingsTarget) * 100, 100) : 0}%` }}></div></div>
                            <p className="text-sm text-center font-medium text-slate-400">{totalSavings >= savingsTarget ? '¡Felicidades, superaste tu meta de ahorro!' : '¡Estás en camino a lograr tu meta!'}</p>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-slate-100">Metas Financieras</h3><button onClick={() => setModalType('goal')} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Crear Meta</button></div>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                        {goals.length === 0 && <p className="text-center text-slate-500 pt-10">Aún no has creado ninguna meta.</p>}
                        {goals.map(goal => (
                            <div key={goal.id} className="group">
                            <div className="flex justify-between mb-1 items-center">
                                <div>
                                    <span className="text-base font-medium text-slate-200">{goal.name}</span>
                                    <p className="text-xs text-slate-400"><CalendarIcon />Vence el: {parseLocalDate(goal.deadline).toLocaleDateString('es-ES')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                <button onClick={() => { setSelectedGoalId(goal.id); setModalType('addFunds'); }} className="text-slate-500 hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100"><PlusCircleIcon className="h-6 w-6"/></button>
                                <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><TrashIcon /></button>
                                </div>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}></div></div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="font-medium text-green-400">{formatCurrency(goal.currentAmount)}</span>
                                <span className="font-medium text-slate-400">{formatCurrency(goal.targetAmount)}</span>
                            </div>
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
                
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-slate-100">Mis Cuentas y Tarjetas</h3><button onClick={() => setModalType('account')} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Añadir Cuenta</button></div>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {accounts.length === 0 && <p className="text-center text-slate-500 pt-8">No has añadido ninguna cuenta o tarjeta.</p>}
                            {accounts.map(acc => (
                                <div key={acc.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg group">
                                    <div>
                                        <p className="font-medium text-slate-200">{acc.name}</p>
                                        <p className="text-xs text-slate-400">{acc.type}</p>
                                    </div>
                                    <button onClick={() => handleDeleteAccount(acc.id)} className="text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><TrashIcon /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">Actividad del Mes</h3>
                        {recentTransactions.length === 0 && <p className="text-center text-slate-500 pt-10">No hay transacciones este mes.</p>}
                        <ul className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                        {recentTransactions.slice(0, 20).map(item => (
                            <li key={item.id} className="flex items-center justify-between py-3 group">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-full" style={{backgroundColor: item.type === 'expense' ? `${CATEGORY_COLORS[item.category as Category]}20` : item.type === 'income' ? '#22C55E20' : '#3B82F620' }}>
                                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.type === 'expense' ? CATEGORY_COLORS[item.category as Category] : item.type === 'income' ? '#22C55E' : '#3B82F6' }}></div>
                                </div>
                                <div>
                                    <p className="font-medium text-slate-200">{item.description}</p>
                                    <span className="text-sm text-slate-400">{item.type === 'expense' ? item.category : item.type === 'income' ? 'Ingreso' : 'Ahorro'} - {parseLocalDate(item.date).toLocaleDateString('es-ES')}</span>
                                    {item.accountId && accountsById[item.accountId] && <p className="text-xs text-slate-500">via {accountsById[item.accountId]}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                               <p className={`font-semibold ${item.type === 'expense' ? 'text-red-400' : item.type === 'income' ? 'text-green-400' : 'text-blue-400'}`}>
                                {item.type === 'expense' ? '-' : '+'} {formatCurrency(item.amount)}
                               </p>
                               <button onClick={() => setEditingItem({ item, type: item.type })} className="text-slate-500 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"><EditIcon /></button>
                               <button onClick={() => handleDelete(item.id, item.type)} className="text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><TrashIcon /></button>
                            </div>
                            </li>
                        ))}
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
};

const CardStatus = ({ card, expenses, formatCurrency, onEdit }: { card: FinancialAccount, expenses: Expense[], formatCurrency: (amount: number) => string, onEdit: (account: FinancialAccount) => void }) => {
    const cardInfo = useMemo(() => {
        if (!card.billingDay || !card.paymentDay) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let nextBillingDate = new Date(today.getFullYear(), today.getMonth(), card.billingDay);
        if (today.getTime() > nextBillingDate.getTime()) {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }

        const cycleEndDate = new Date(nextBillingDate);
        const cycleStartDate = new Date(cycleEndDate);
        cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
        cycleStartDate.setDate(cycleStartDate.getDate() + 1);
        
        let nextPaymentDate = new Date(nextBillingDate);
        nextPaymentDate.setDate(card.paymentDay);
        if (card.paymentDay <= card.billingDay) {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        }

        const daysUntilBilling = Math.ceil((nextBillingDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        const daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        const estimatedPayment = expenses
            .filter(e => e.accountId === card.id)
            .filter(e => {
                const expenseDate = parseLocalDate(e.date);
                return expenseDate >= cycleStartDate && expenseDate < cycleEndDate;
            })
            .reduce((sum, e) => sum + e.amount, 0);
        
        return { daysUntilBilling, daysUntilPayment, estimatedPayment };

    }, [card, expenses]);

    if (!cardInfo) return null;

    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex flex-col justify-between group">
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3"><CreditCardIcon />{card.name}</h3>
                    <button onClick={() => onEdit(card)} className="text-slate-500 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"><EditIcon /></button>
                </div>
                <div className="mt-4 space-y-3 text-slate-300">
                    <div className="flex items-center gap-3">
                        <ClockIcon />
                        <p>Facturación en <span className="font-bold text-amber-400">{cardInfo.daysUntilBilling} días</span></p>
                    </div>
                     <div className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5"/>
                        <p>Vencimiento de pago en <span className="font-bold text-red-400">{cardInfo.daysUntilPayment} días</span></p>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400">Pago estimado del ciclo actual</p>
                <p className="text-3xl font-bold text-indigo-400">{formatCurrency(cardInfo.estimatedPayment)}</p>
            </div>
        </div>
    );
};


const CardManagementView = ({ accounts, expenses, formatCurrency, setEditingAccount, setModalType }: any) => {
    const creditCards = accounts.filter((acc: FinancialAccount) => acc.type === AccountType.Credito);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-100">Gestión de Tarjetas de Crédito</h2>
                <button onClick={() => setModalType('account')} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200">
                    <PlusIcon /> Añadir Tarjeta
                </button>
            </div>
            {creditCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {creditCards.map((card: FinancialAccount) => (
                        <CardStatus key={card.id} card={card} expenses={expenses} formatCurrency={formatCurrency} onEdit={setEditingAccount} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-800 rounded-xl">
                    <CreditCardIcon className="mx-auto h-12 w-12 text-slate-500" />
                    <h3 className="mt-2 text-lg font-medium text-slate-200">No hay tarjetas de crédito</h3>
                    <p className="mt-1 text-sm text-slate-400">Añade tu primera tarjeta de crédito para empezar a gestionarla.</p>
                </div>
            )}
        </div>
    );
};


// --- Main App Component --- //
export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  const [modalType, setModalType] = useState<'expense' | 'income' | 'saving' | 'goal' | 'addFunds' | 'account' | null>(null);
  const [editingItem, setEditingItem] = useState<{item: Expense | Income | Saving, type: 'expense' | 'income' | 'saving'} | null>(null);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>('CLP');
  const [financialTip, setFinancialTip] = useState('');
  const [isTipLoading, setIsTipLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeView, setActiveView] = useState<'dashboard' | 'cards'>('dashboard');


  // --- DB and Auth Effects ---
  useEffect(() => {
    const initialize = async () => {
      await initDB();
      const sessionUser = sessionStorage.getItem('currentUser');
      if (sessionUser) {
        setCurrentUser(JSON.parse(sessionUser));
      }
      setDbInitialized(true);
    };
    initialize();
  }, []);

  const loadUserData = useCallback(async (userId: number) => {
    const [userExpenses, userIncomes, userSavings, userGoals, userAccounts] = await Promise.all([
      getExpenses(userId), getIncomes(userId), getSavings(userId), getGoals(userId), getFinancialAccounts(userId),
    ]);
    setExpenses(userExpenses);
    setIncomes(userIncomes);
    setSavings(userSavings);
    setGoals(userGoals);
    setAccounts(userAccounts);
  }, []);

  useEffect(() => {
    if (currentUser && dbInitialized) {
      loadUserData(currentUser.id);
    }
  }, [currentUser, dbInitialized, loadUserData]);

  const handleAuthSuccess = (user: User) => {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    setCurrentUser(null);
    setExpenses([]); setIncomes([]); setSavings([]); setGoals([]); setAccounts([]);
    setActiveView('dashboard');
  };

  // --- Data Handlers ---
  const handleAddExpense = useCallback(async (expenseData: Omit<Expense, 'id'>) => { if (!currentUser) return; await addExpense(currentUser.id, expenseData); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleAddIncome = useCallback(async (incomeData: Omit<Income, 'id'>) => { if (!currentUser) return; await addIncome(currentUser.id, incomeData); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleAddSaving = useCallback(async (savingData: Omit<Saving, 'id'>) => { if (!currentUser) return; await addSaving(currentUser.id, savingData); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleAddGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'currentAmount'>) => { if (!currentUser) return; await addGoal(currentUser.id, goalData); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleAddAccount = useCallback(async (accountData: Omit<FinancialAccount, 'id' | 'userId'>) => { if (!currentUser) return; await addFinancialAccount(currentUser.id, accountData); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleDelete = useCallback(async (id: string, type: 'expense' | 'income' | 'saving') => { if (!currentUser) return; await deleteTransaction(id, type, currentUser.id); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleDeleteGoal = useCallback(async (id: string) => { if (!currentUser) return; await deleteGoal(id, currentUser.id); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleDeleteAccount = useCallback(async (id: string) => { if (!currentUser) return; await deleteFinancialAccount(id, currentUser.id); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleUpdateAccount = useCallback(async (account: FinancialAccount) => { if (!currentUser) return; await updateFinancialAccount(currentUser.id, account); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  
  const selectedGoal = useMemo(() => goals.find(g => g.id === selectedGoalId), [goals, selectedGoalId]);

  const handleAddFundsToGoal = useCallback(async (amount: number, accountId?: string) => {
    if (!currentUser || !selectedGoal) return;
    await addFundsToGoal(currentUser.id, amount, accountId, selectedGoal);
    loadUserData(currentUser.id);
  }, [currentUser, selectedGoal, loadUserData]);

  const handleUpdateTransaction = useCallback(async (item: Expense | Income | Saving) => {
    if (!currentUser) return;
    const type = item.id.startsWith('e_') ? 'expense' : item.id.startsWith('s_') ? 'saving' : 'income';
    if (type === 'expense') {
        await updateExpense(currentUser.id, item as Expense);
    } else if (type === 'saving') {
        await updateSaving(currentUser.id, item as Saving);
    } else {
        await updateIncome(currentUser.id, item as Income);
    }
    loadUserData(currentUser.id);
  }, [currentUser, loadUserData]);


  // --- Memos and Calculations ---
  const formatCurrency = useCallback((amount: number) => { const isCLP = currency === 'CLP'; const options = { style: 'currency', currency, minimumFractionDigits: isCLP ? 0 : 2, maximumFractionDigits: isCLP ? 0 : 2, }; return new Intl.NumberFormat(isCLP ? 'es-CL' : 'es-ES', options).format(amount); }, [currency]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    [...expenses, ...incomes, ...savings].forEach(t => {
        years.add(parseLocalDate(t.date).getFullYear());
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses, incomes, savings]);
  
  const accountsById = useMemo(() => Object.fromEntries(accounts.map(acc => [acc.id, acc.name])), [accounts]);

  const filteredExpenses = useMemo(() => expenses.filter(exp => { const d = parseLocalDate(exp.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear; }), [expenses, selectedMonth, selectedYear]);
  const filteredIncomes = useMemo(() => incomes.filter(inc => { const d = parseLocalDate(inc.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear; }), [incomes, selectedMonth, selectedYear]);
  const filteredSavings = useMemo(() => savings.filter(s => { const d = parseLocalDate(s.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear; }), [savings, selectedMonth, selectedYear]);

  const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0), [filteredExpenses]);
  const totalIncome = useMemo(() => filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0), [filteredIncomes]);
  const totalSavings = useMemo(() => filteredSavings.reduce((sum, s) => sum + s.amount, 0), [filteredSavings]);
  const savingsTarget = useMemo(() => totalIncome * 0.1, [totalIncome]);
  const currentBalance = useMemo(() => totalIncome - totalExpenses - totalSavings, [totalIncome, totalExpenses, totalSavings]);
  const expenseByCategory = useMemo(() => { const grouped: { [key in Category]?: number } = {}; filteredExpenses.forEach(expense => { grouped[expense.category] = (grouped[expense.category] || 0) + expense.amount; }); return Object.values(Category).map(cat => ({ name: cat, spent: grouped[cat] || 0, budget: INITIAL_BUDGET[cat] })); }, [filteredExpenses]);
  const pieChartData = useMemo(() => expenseByCategory.filter(item => item.spent > 0).map(item => ({ name: item.name, value: item.spent })), [expenseByCategory]);
  const recentTransactions = useMemo(() => { const combined = [ ...filteredExpenses.map(e => ({ ...e, type: 'expense' as const })), ...filteredIncomes.map(i => ({ ...i, type: 'income' as const })), ...filteredSavings.map(s => ({...s, type: 'saving' as const })), ]; return combined.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()); }, [filteredExpenses, filteredIncomes, filteredSavings]);
  const summaryChartData = useMemo(() => ([ { name: 'Resumen', Ingresos: totalIncome, Gastos: totalExpenses, Ahorros: totalSavings } ]), [totalIncome, totalExpenses, totalSavings]);
  
  const handleGetFinancialTip = async () => { setIsTipLoading(true); setFinancialTip(''); try { const monthName = new Date(selectedYear, selectedMonth).toLocaleString('es-ES', { month: 'long' }); const summary = { totalIncome, totalExpenses, totalSavings, savingsTarget, currency, month: monthName, year: selectedYear, expensesByCategory: expenseByCategory.map(e => ({ category: e.name, spent: e.spent, budget: e.budget })) }; const tip = await generateFinancialTip(summary); setFinancialTip(tip); } catch(error) { console.error("Error fetching financial tip:", error); setFinancialTip("No se pudo obtener un consejo en este momento. Inténtalo de nuevo más tarde."); } finally { setIsTipLoading(false); } };

  if (!dbInitialized) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando aplicación...</div>;
  }
  if (!currentUser) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const dashboardProps = {
    totalIncome, totalExpenses, totalSavings, currentBalance, summaryChartData, formatCurrency, currency, pieChartData, recentTransactions,
    accountsById, expenseByCategory, goals, savingsTarget, handleGetFinancialTip, isTipLoading, financialTip,
    selectedMonth, monthNames, handleDelete, setEditingItem, handleDeleteGoal, setSelectedGoalId, setModalType,
    accounts, handleDeleteAccount
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6 lg:p-8">
      <main className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Panel Financiero</h1>
            <p className="text-slate-400 mt-1">Hola, <span className="font-semibold text-indigo-400">{currentUser.username}</span>. Aquí tienes tu resumen.</p>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <button onClick={() => setModalType('income')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-all duration-200"><PlusIcon /> Ingreso</button>
            <button onClick={() => setModalType('expense')} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-all duration-200"><PlusIcon /> Gasto</button>
            <button onClick={() => setModalType('saving')} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200"><PiggyBankIcon /> Ahorrar</button>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-600 hover:text-white transition-all duration-200">
              <LogoutIcon />
              Cerrar Sesión
            </button>
          </div>
        </div>
        
        <Nav activeView={activeView} setActiveView={setActiveView} />

        {activeView === 'dashboard' && (
            <div className="flex flex-wrap gap-4 mb-8 bg-slate-800/50 p-4 rounded-xl items-center justify-start">
                <span className="text-sm font-medium text-slate-300 mr-2">Filtrar por:</span>
                <FormSelect onChange={(e) => setSelectedMonth(parseInt(e.target.value))} value={selectedMonth} className="w-auto">
                    {monthNames.map((name, index) => <option key={index} value={index}>{name}</option>)}
                </FormSelect>
                <FormSelect onChange={(e) => setSelectedYear(parseInt(e.target.value))} value={selectedYear} className="w-auto">
                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </FormSelect>
                <FormSelect onChange={(e) => setCurrency(e.target.value as Currency)} value={currency} className="w-auto">
                    {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
                </FormSelect>
            </div>
        )}


        {modalType === 'expense' && <AddExpenseForm onAddExpense={handleAddExpense} onClose={() => setModalType(null)} accounts={accounts} />}
        {modalType === 'income' && <AddIncomeForm onAddIncome={handleAddIncome} onClose={() => setModalType(null)} accounts={accounts} />}
        {modalType === 'saving' && <AddSavingForm onAddSaving={handleAddSaving} onClose={() => setModalType(null)} accounts={accounts} />}
        {modalType === 'goal' && <AddGoalForm onAddGoal={handleAddGoal} onClose={() => setModalType(null)} />}
        {modalType === 'addFunds' && selectedGoal && <AddFundsToGoalForm goalName={selectedGoal.name} onAddFunds={handleAddFundsToGoal} onClose={() => setModalType(null)} accounts={accounts} />}
        {modalType === 'account' && <AddAccountForm onAddAccount={handleAddAccount} onClose={() => setModalType(null)} />}
        {editingItem && <EditTransactionForm item={editingItem.item} type={editingItem.type} onUpdate={handleUpdateTransaction} onClose={() => setEditingItem(null)} accounts={accounts} />}
        {editingAccount && <EditAccountForm account={editingAccount} onUpdate={(acc) => { handleUpdateAccount(acc); setEditingAccount(null); }} onClose={() => setEditingAccount(null)} />}

        {activeView === 'dashboard' && <DashboardView {...dashboardProps} />}
        {activeView === 'cards' && <CardManagementView accounts={accounts} expenses={expenses} formatCurrency={formatCurrency} setEditingAccount={setEditingAccount} setModalType={setModalType} />}
        
      </main>
    </div>
  );
}