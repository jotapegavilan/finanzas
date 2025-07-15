import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Expense, Goal, Category, Currency, Income, Saving, User } from './types';
import { INITIAL_BUDGET, CATEGORY_COLORS, CURRENCY_SYMBOLS } from './constants';
import { generateFinancialTip } from './services/geminiService';
import { 
    initDB, getExpenses, getIncomes, getSavings, getGoals, 
    addExpense, addIncome, addSaving, addGoal, addFundsToGoal,
    deleteTransaction, deleteGoal
} from './database';
import Auth from './Auth';

// --- Reusable SVG Icons --- //
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /> </svg> );
const PlusCircleIcon = ({ className }: { className?: string }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg> );
const PiggyBankIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path d="M2 10a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm3-3a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1H5z" /> <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v1h16V4a1 1 0 00-1-1H3zm14 12a1 1 0 01-1 1H4a1 1 0 01-1-1v-1h14v1z" clipRule="evenodd" /> </svg> );
const CalendarIcon = ({ className }: { className?: string }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4 mr-1.5 inline"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> </svg> );
const LightbulbIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"> <path d="M11 3a1 1 0 100 2h.01a1 1 0 100-2H11zM10 1a1 1 0 00-1 1v1a1 1 0 002 0V2a1 1 0 00-1-1zM4 9a1 1 0 01-2 0V7a1 1 0 112 0v2zm14-2a1 1 0 010 2v-2a1 1 0 010-2zM6.343 15.657a1 1 0 00-1.414-1.414L3.515 15.657a1 1 0 001.414 1.414l1.414-1.414zm10.607-10.607a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414-1.414l-1.414-1.414zM10 17a7 7 0 100-14 7 7 0 000 14zm-3-7a3 3 0 116 0 3 3 0 01-6 0z" /> </svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /> </svg> );
const LogoutIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /> </svg> );

// --- Reusable UI Components --- //
interface SummaryCardProps { title: string; value: string; color: string; }
const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, color }) => ( <div className={`p-4 rounded-xl shadow-md bg-white border-l-4 ${color}`}> <h3 className="text-sm font-medium text-slate-500">{title}</h3> <p className="text-2xl font-bold text-slate-800">{value}</p> </div> );

const ModalWrapper: React.FC<{ title: string, children: React.ReactNode, onClose: () => void }> = ({ title, children, onClose }) => ( <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}> <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md m-4 transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}> <h2 className="text-2xl font-bold mb-6 text-slate-800">{title}</h2> {children} </div> </div> );
const FormButtons: React.FC<{ onCancel: () => void; submitText?: string }> = ({ onCancel, submitText = "Añadir" }) => ( <div className="flex justify-end space-x-4 pt-4"> <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button> <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">{submitText}</button> </div> );

// --- Form Modals --- //
const AddExpenseForm: React.FC<{ onAddExpense: (expense: Omit<Expense, 'id' | 'date'>) => void; onClose: () => void; }> = ({ onAddExpense, onClose }) => { const [amount, setAmount] = useState(''); const [category, setCategory] = useState<Category>(Category.Comida); const [description, setDescription] = useState(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(!amount || !description) return; onAddExpense({ amount: parseFloat(amount), category, description }); onClose(); }; return ( <ModalWrapper title="Añadir Nuevo Gasto" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <label htmlFor="amount" className="block text-sm font-medium text-slate-600">Importe</label> <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="0.00" required /> </div> <div> <label htmlFor="category" className="block text-sm font-medium text-slate-600">Categoría</label> <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"> {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)} </select> </div> <div> <label htmlFor="description" className="block text-sm font-medium text-slate-600">Descripción</label> <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Café con amigos" required /> </div> <FormButtons onCancel={onClose} submitText="Añadir Gasto" /> </form> </ModalWrapper> ); };
const AddIncomeForm: React.FC<{ onAddIncome: (income: Omit<Income, 'id' | 'date'>) => void; onClose: () => void; }> = ({ onAddIncome, onClose }) => { const [amount, setAmount] = useState(''); const [description, setDescription] = useState(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(!amount || !description) return; onAddIncome({ amount: parseFloat(amount), description }); onClose(); }; return ( <ModalWrapper title="Añadir Nuevo Ingreso" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <label htmlFor="income-amount" className="block text-sm font-medium text-slate-600">Importe</label> <input type="number" id="income-amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="0.00" required /> </div> <div> <label htmlFor="income-description" className="block text-sm font-medium text-slate-600">Descripción</label> <input type="text" id="income-description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Salario mensual" required /> </div> <FormButtons onCancel={onClose} submitText="Añadir Ingreso" /> </form> </ModalWrapper> ); };
const AddSavingForm: React.FC<{ onAddSaving: (saving: Omit<Saving, 'id' | 'date'>) => void; onClose: () => void; }> = ({ onAddSaving, onClose }) => { const [amount, setAmount] = useState(''); const [description, setDescription] = useState(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(!amount || !description) return; onAddSaving({ amount: parseFloat(amount), description }); onClose(); }; return ( <ModalWrapper title="Añadir Ahorro" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <label htmlFor="saving-amount" className="block text-sm font-medium text-slate-600">Importe</label> <input type="number" id="saving-amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="0.00" required /> </div> <div> <label htmlFor="saving-description" className="block text-sm font-medium text-slate-600">Descripción</label> <input type="text" id="saving-description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Ahorro para vacaciones" required /> </div> <FormButtons onCancel={onClose} submitText="Añadir Ahorro" /> </form> </ModalWrapper> ); };
const AddGoalForm: React.FC<{ onAddGoal: (goal: Omit<Goal, 'id' | 'currentAmount'>) => void; onClose: () => void; }> = ({ onAddGoal, onClose }) => { const [name, setName] = useState(''); const [targetAmount, setTargetAmount] = useState(''); const [deadline, setDeadline] = useState(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name || !targetAmount || !deadline) return; onAddGoal({ name, targetAmount: parseFloat(targetAmount), deadline }); onClose(); }; return ( <ModalWrapper title="Crear Nueva Meta" onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <label htmlFor="goal-name" className="block text-sm font-medium text-slate-600">Nombre de la Meta</label> <input type="text" id="goal-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Comprar una casa" required /> </div> <div> <label htmlFor="goal-target" className="block text-sm font-medium text-slate-600">Objetivo</label> <input type="number" id="goal-target" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="100000" required /> </div> <div> <label htmlFor="goal-deadline" className="block text-sm font-medium text-slate-600">Fecha Límite</label> <div className="relative mt-1"> <input type="date" id="goal-deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="block w-full px-3 py-2 pr-10 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required /> <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"> <CalendarIcon className="h-5 w-5 text-slate-400" /> </div> </div> </div> <FormButtons onCancel={onClose} submitText="Crear Meta" /> </form> </ModalWrapper> ); };
const AddFundsToGoalForm: React.FC<{ onAddFunds: (amount: number) => void; onClose: () => void; goalName: string; }> = ({ onAddFunds, onClose, goalName }) => { const [amount, setAmount] = useState(''); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!amount || parseFloat(amount) <= 0) return; onAddFunds(parseFloat(amount)); onClose(); }; return ( <ModalWrapper title={`Aportar a: ${goalName}`} onClose={onClose}> <form onSubmit={handleSubmit} className="space-y-4"> <div> <label htmlFor="fund-amount" className="block text-sm font-medium text-slate-600">Importe a Aportar</label> <input type="number" id="fund-amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="50.00" required autoFocus /> </div> <FormButtons onCancel={onClose} submitText="Aportar Fondos" /> </form> </ModalWrapper> ); };


// --- Main App Component --- //
export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [modalType, setModalType] = useState<'expense' | 'income' | 'saving' | 'goal' | 'addFunds' | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>('CLP');
  const [financialTip, setFinancialTip] = useState('');
  const [isTipLoading, setIsTipLoading] = useState(false);

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
    const [userExpenses, userIncomes, userSavings, userGoals] = await Promise.all([
      getExpenses(userId), getIncomes(userId), getSavings(userId), getGoals(userId),
    ]);
    setExpenses(userExpenses);
    setIncomes(userIncomes);
    setSavings(userSavings);
    setGoals(userGoals);
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
    setExpenses([]); setIncomes([]); setSavings([]); setGoals([]);
  };

  // --- Data Handlers ---
  const handleAddExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'date'>) => { if (!currentUser) return; await addExpense(currentUser.id, expenseData); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleAddIncome = useCallback(async (incomeData: Omit<Income, 'id' | 'date'>) => { if (!currentUser) return; await addIncome(currentUser.id, incomeData); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleAddSaving = useCallback(async (savingData: Omit<Saving, 'id' | 'date'>) => { if (!currentUser) return; await addSaving(currentUser.id, savingData); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleAddGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'currentAmount'>) => { if (!currentUser) return; await addGoal(currentUser.id, goalData); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleDelete = useCallback(async (id: string, type: 'expense' | 'income' | 'saving') => { if (!currentUser) return; await deleteTransaction(id, type, currentUser.id); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  const handleDeleteGoal = useCallback(async (id: string) => { if (!currentUser) return; await deleteGoal(id, currentUser.id); loadUserData(currentUser.id); }, [currentUser, loadUserData]);
  
  const selectedGoal = useMemo(() => goals.find(g => g.id === selectedGoalId), [goals, selectedGoalId]);

  const handleAddFundsToGoal = useCallback(async (amount: number) => {
    if (!currentUser || !selectedGoal) return;
    await addFundsToGoal(currentUser.id, amount, selectedGoal);
    loadUserData(currentUser.id);
  }, [currentUser, selectedGoal, loadUserData]);

  // --- Memos and Calculations ---
  const formatCurrency = useCallback((amount: number) => { const isCLP = currency === 'CLP'; const options = { style: 'currency', currency, minimumFractionDigits: isCLP ? 0 : 2, maximumFractionDigits: isCLP ? 0 : 2, }; return new Intl.NumberFormat(isCLP ? 'es-CL' : 'es-ES', options).format(amount); }, [currency]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, exp) => sum + exp.amount, 0), [expenses]);
  const totalIncome = useMemo(() => incomes.reduce((sum, inc) => sum + inc.amount, 0), [incomes]);
  const totalSavings = useMemo(() => savings.reduce((sum, s) => sum + s.amount, 0), [savings]);
  const savingsTarget = useMemo(() => totalIncome * 0.1, [totalIncome]);
  const currentBalance = useMemo(() => totalIncome - totalExpenses - totalSavings, [totalIncome, totalExpenses, totalSavings]);
  const expenseByCategory = useMemo(() => { const grouped: { [key in Category]?: number } = {}; expenses.forEach(expense => { grouped[expense.category] = (grouped[expense.category] || 0) + expense.amount; }); return Object.values(Category).map(cat => ({ name: cat, spent: grouped[cat] || 0, budget: INITIAL_BUDGET[cat] })); }, [expenses]);
  const pieChartData = useMemo(() => expenseByCategory.filter(item => item.spent > 0).map(item => ({ name: item.name, value: item.spent })), [expenseByCategory]);
  const recentTransactions = useMemo(() => { const combined = [ ...expenses.map(e => ({ ...e, type: 'expense' as const })), ...incomes.map(i => ({ ...i, type: 'income' as const })), ...savings.map(s => ({...s, type: 'saving' as const })), ]; return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); }, [expenses, incomes, savings]);
  const summaryChartData = useMemo(() => ([ { name: 'Resumen', Ingresos: totalIncome, Gastos: totalExpenses, Ahorros: totalSavings } ]), [totalIncome, totalExpenses, totalSavings]);
  
  const handleGetFinancialTip = async () => { setIsTipLoading(true); setFinancialTip(''); try { const summary = { totalIncome, totalExpenses, totalSavings, savingsTarget, currency, expensesByCategory: expenseByCategory.map(e => ({ category: e.name, spent: e.spent, budget: e.budget })) }; const tip = await generateFinancialTip(summary); setFinancialTip(tip); } catch(error) { console.error("Error fetching financial tip:", error); setFinancialTip("No se pudo obtener un consejo en este momento. Inténtalo de nuevo más tarde."); } finally { setIsTipLoading(false); } };

  if (!dbInitialized) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando aplicación...</div>;
  }
  if (!currentUser) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <main className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Panel Financiero</h1>
            <p className="text-slate-500 mt-1">Hola, <span className="font-semibold text-indigo-600">{currentUser.username}</span>. Aquí tienes tu resumen.</p>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <button onClick={() => setModalType('income')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-all duration-200"><PlusIcon /> Ingreso</button>
            <button onClick={() => setModalType('expense')} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-all duration-200"><PlusIcon /> Gasto</button>
            <button onClick={() => setModalType('saving')} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200"><PiggyBankIcon /> Ahorrar</button>
            <select onChange={(e) => setCurrency(e.target.value as Currency)} value={currency} className="px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 text-slate-600 font-semibold rounded-lg shadow-sm hover:bg-slate-300 hover:text-slate-800 transition-all duration-200">
              <LogoutIcon />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {modalType === 'expense' && <AddExpenseForm onAddExpense={handleAddExpense} onClose={() => setModalType(null)} />}
        {modalType === 'income' && <AddIncomeForm onAddIncome={handleAddIncome} onClose={() => setModalType(null)} />}
        {modalType === 'saving' && <AddSavingForm onAddSaving={handleAddSaving} onClose={() => setModalType(null)} />}
        {modalType === 'goal' && <AddGoalForm onAddGoal={handleAddGoal} onClose={() => setModalType(null)} />}
        {modalType === 'addFunds' && selectedGoal && <AddFundsToGoalForm goalName={selectedGoal.name} onAddFunds={handleAddFundsToGoal} onClose={() => setModalType(null)} />}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard title="Ingresos Totales" value={formatCurrency(totalIncome)} color="border-green-400" />
          <SummaryCard title="Gastos Totales" value={formatCurrency(totalExpenses)} color="border-red-400" />
          <SummaryCard title="Ahorro Total" value={formatCurrency(totalSavings)} color="border-blue-400" />
          <SummaryCard title="Balance Actual" value={formatCurrency(currentBalance)} color={currentBalance >= 0 ? "border-indigo-400" : "border-amber-500"} />
        </div>

        <div className="bg-white p-5 rounded-xl shadow-md mb-8">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center"><LightbulbIcon /> Consejo Financiero con IA</h3>
                <button onClick={handleGetFinancialTip} disabled={isTipLoading} className="px-4 py-2 bg-amber-400 text-amber-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"> {isTipLoading ? 'Generando...' : 'Obtener Consejo'} </button>
            </div>
            {isTipLoading && <div className="mt-4 text-center text-slate-500">Buscando la mejor recomendación para ti...</div>}
            {financialTip && <p className="mt-4 text-slate-600 bg-amber-50 p-4 rounded-lg border border-amber-200">{financialTip}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
          <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumen General</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={summaryChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => CURRENCY_SYMBOLS[currency] + value} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'rgba(241, 245, 249, 0.5)'}} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#22C55E" name="Ingresos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#EF4444" name="Gastos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ahorros" fill="#3B82F6" name="Ahorros" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Desglose de Gastos</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label> {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as Category]} />)} </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}/>
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Análisis de Ahorro</h3>
                <p className="text-sm text-slate-500">Recomendamos ahorrar al menos el 10% de tus ingresos.</p>
                <div className="mt-4 space-y-3">
                    <div className="flex justify-between items-baseline"><span className="font-medium text-slate-600">Objetivo (10%)</span><span className="font-bold text-lg text-indigo-600">{formatCurrency(savingsTarget)}</span></div>
                    <div className="flex justify-between items-baseline"><span className="font-medium text-slate-600">Ahorrado</span><span className="font-bold text-lg text-green-600">{formatCurrency(totalSavings)}</span></div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${savingsTarget > 0 ? Math.min((totalSavings / savingsTarget) * 100, 100) : 0}%` }}></div></div>
                    <p className="text-sm text-center font-medium text-slate-600">{totalSavings >= savingsTarget ? '¡Felicidades, superaste tu meta de ahorro!' : '¡Estás en camino a lograr tu meta!'}</p>
            </div>
            </div>

            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-slate-800">Metas Financieras</h3><button onClick={() => setModalType('goal')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">Crear Meta</button></div>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {goals.length === 0 && <p className="text-center text-slate-400 pt-10">Aún no has creado ninguna meta. ¡Anímate a crear una!</p>}
                {goals.map(goal => (
                    <div key={goal.id} className="group">
                    <div className="flex justify-between mb-1 items-center">
                        <div>
                            <span className="text-base font-medium text-slate-700">{goal.name}</span>
                            <p className="text-xs text-slate-400"><CalendarIcon />Vence el: {new Date(goal.deadline).toLocaleDateString('es-ES')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedGoalId(goal.id); setModalType('addFunds'); }} className="text-slate-400 hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100"><PlusCircleIcon className="h-6 w-6"/></button>
                        <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><TrashIcon /></button>
                        </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}></div></div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="font-medium text-green-600">{formatCurrency(goal.currentAmount)}</span>
                        <span className="font-medium text-slate-500">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Actividad Reciente</h3>
                 {recentTransactions.length === 0 && <p className="text-center text-slate-400 pt-10">No hay transacciones recientes. ¡Añade un ingreso o gasto para empezar!</p>}
                <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {recentTransactions.slice(0, 15).map(item => (
                    <li key={item.id} className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full" style={{backgroundColor: item.type === 'expense' ? `${CATEGORY_COLORS[item.category as Category]}20` : item.type === 'income' ? '#22C55E20' : '#3B82F620' }}>
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.type === 'expense' ? CATEGORY_COLORS[item.category as Category] : item.type === 'income' ? '#22C55E' : '#3B82F6' }}></div>
                        </div>
                        <div>
                            <p className="font-medium text-slate-800">{item.description}</p>
                            <p className="text-sm text-slate-500">{item.type === 'expense' ? item.category : item.type === 'income' ? 'Ingreso' : 'Ahorro'} - {new Date(item.date).toLocaleDateString('es-ES')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className={`font-semibold ${item.type === 'expense' ? 'text-red-600' : item.type === 'income' ? 'text-green-600' : 'text-blue-600'}`}>
                        {item.type === 'expense' ? '-' : '+'} {formatCurrency(item.amount)}
                        </p>
                        <button onClick={() => handleDelete(item.id, item.type)} className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><TrashIcon /></button>
                    </div>
                    </li>
                ))}
                </ul>
            </div>
        </div>
      </main>
    </div>
  );
}