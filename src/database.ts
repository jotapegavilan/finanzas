import initSqlJs from 'sql.js';
import { Expense, Goal, Income, Saving, User, Category, FinancialAccount, AccountType } from './types';

let db: initSqlJs.Database | null = null;
const DB_NAME = 'financial_dashboard_db';

// Guarda la base de datos en el almacenamiento local del navegador
const saveDatabase = () => {
    if (db) {
        const data = db.export();
        localStorage.setItem(DB_NAME, JSON.stringify(Array.from(data)));
    }
};

const runMigrations = () => {
    if (!db) return;
    let tableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='financial_accounts'");
    if (tableCheck.length === 0) {
        db.run("CREATE TABLE financial_accounts (id TEXT PRIMARY KEY, userId INTEGER, name TEXT, type TEXT, billingDay INTEGER, paymentDay INTEGER, FOREIGN KEY(userId) REFERENCES users(id))");
    }

    const accountTableInfo = db.exec(`PRAGMA table_info(financial_accounts)`);
    const columns = accountTableInfo[0] ? accountTableInfo[0].values.map(col => col[1]) : [];
    
    if (!columns.includes('billingDay')) {
        db.run(`ALTER TABLE financial_accounts ADD COLUMN billingDay INTEGER`);
    }
    if (!columns.includes('paymentDay')) {
        db.run(`ALTER TABLE financial_accounts ADD COLUMN paymentDay INTEGER`);
    }
    
    const tablesToMigrate = ['expenses', 'incomes', 'savings'];
    for (const table of tablesToMigrate) {
        const tableInfo = db.exec(`PRAGMA table_info(${table})`);
        if (tableInfo[0] && !tableInfo[0].values.some(col => col && col[1] === 'accountId')) {
            db.run(`ALTER TABLE ${table} ADD COLUMN accountId TEXT`);
        }
    }
    saveDatabase();
}

// Inicializa la base de datos, cargándola desde localStorage si existe, o creando una nueva.
export const initDB = async () => {
  try {
    const SQL = await initSqlJs({
        locateFile: file => `https://esm.sh/sql.js@1.10.3/dist/${file}`
    });
    const savedDb = localStorage.getItem(DB_NAME);
    if (savedDb) {
        const dbData = new Uint8Array(JSON.parse(savedDb));
        db = new SQL.Database(dbData);
    } else {
        db = new SQL.Database();
        const schema = `
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
          );
          CREATE TABLE expenses ( id TEXT PRIMARY KEY, userId INTEGER, amount REAL, category TEXT, description TEXT, date TEXT, accountId TEXT, FOREIGN KEY(userId) REFERENCES users(id) );
          CREATE TABLE incomes ( id TEXT PRIMARY KEY, userId INTEGER, amount REAL, description TEXT, date TEXT, accountId TEXT, FOREIGN KEY(userId) REFERENCES users(id) );
          CREATE TABLE savings ( id TEXT PRIMARY KEY, userId INTEGER, amount REAL, description TEXT, date TEXT, goalId TEXT, accountId TEXT, FOREIGN KEY(userId) REFERENCES users(id) );
          CREATE TABLE goals ( id TEXT PRIMARY KEY, userId INTEGER, name TEXT, targetAmount REAL, currentAmount REAL, deadline TEXT, FOREIGN KEY(userId) REFERENCES users(id) );
          CREATE TABLE financial_accounts (id TEXT PRIMARY KEY, userId INTEGER, name TEXT, type TEXT, billingDay INTEGER, paymentDay INTEGER, FOREIGN KEY(userId) REFERENCES users(id));
        `;
        db.run(schema);
        saveDatabase();
    }
    runMigrations();
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
};

// --- User Management ---
// WARNING: Storing passwords in plaintext is insecure. In a real application, always hash and salt passwords.
export const registerUser = async (username: string, password: string): Promise<User> => {
    if (!db) throw new Error("Database not initialized");
    try {
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password]);
        saveDatabase();
        return loginUser(username, password);
    } catch (e) {
        throw new Error("El nombre de usuario ya existe.");
    }
};

export const loginUser = async (username: string, password: string): Promise<User> => {
    if (!db) throw new Error("Database not initialized");
    const stmt = db.prepare("SELECT id, username FROM users WHERE username = :user AND password = :pass");
    const result = stmt.getAsObject({ ':user': username, ':pass': password });
    stmt.free();
    if (result.id) {
        return { id: result.id as number, username: result.username as string };
    }
    throw new Error("Usuario o contraseña incorrectos.");
};

// --- Generic Fetcher ---
const fetchData = <T>(query: string, userId: number): T[] => {
    if (!db) return [];
    const stmt = db.prepare(query);
    stmt.bind({ ':userId': userId });
    const results: T[] = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
};

// --- CRUD Operations ---
export const getExpenses = (userId: number): Promise<Expense[]> => Promise.resolve(fetchData<Expense>("SELECT * FROM expenses WHERE userId = :userId ORDER BY date DESC", userId));
export const getIncomes = (userId: number): Promise<Income[]> => Promise.resolve(fetchData<Income>("SELECT * FROM incomes WHERE userId = :userId ORDER BY date DESC", userId));
export const getSavings = (userId: number): Promise<Saving[]> => Promise.resolve(fetchData<Saving>("SELECT * FROM savings WHERE userId = :userId ORDER BY date DESC", userId));
export const getGoals = (userId: number): Promise<Goal[]> => Promise.resolve(fetchData<Goal>("SELECT * FROM goals WHERE userId = :userId ORDER BY name", userId));
export const getFinancialAccounts = (userId: number): Promise<FinancialAccount[]> => Promise.resolve(fetchData<FinancialAccount>("SELECT * FROM financial_accounts WHERE userId = :userId ORDER BY name", userId));

export const addExpense = async (userId: number, expense: Omit<Expense, 'id'>) => {
    if (!db) throw new Error("DB not initialized");
    db.run("INSERT INTO expenses (id, userId, amount, category, description, date, accountId) VALUES (:id, :userId, :amount, :category, :description, :date, :accountId)", {
        ':id': `e_${new Date().getTime()}`,
        ':userId': userId,
        ':amount': expense.amount,
        ':category': expense.category,
        ':description': expense.description,
        ':date': expense.date,
        ':accountId': expense.accountId || null,
    });
    saveDatabase();
};

export const addIncome = async (userId: number, income: Omit<Income, 'id'>) => {
    if (!db) throw new Error("DB not initialized");
    db.run("INSERT INTO incomes (id, userId, amount, description, date, accountId) VALUES (:id, :userId, :amount, :description, :date, :accountId)", {
        ':id': `i_${new Date().getTime()}`,
        ':userId': userId,
        ':amount': income.amount,
        ':description': income.description,
        ':date': income.date,
        ':accountId': income.accountId || null,
    });
    saveDatabase();
};

export const addSaving = async (userId: number, saving: Omit<Saving, 'id'>) => {
    if (!db) throw new Error("DB not initialized");
    db.run("INSERT INTO savings (id, userId, amount, description, date, goalId, accountId) VALUES (:id, :userId, :amount, :description, :date, :goalId, :accountId)", {
        ':id': `s_${new Date().getTime()}`,
        ':userId': userId,
        ':amount': saving.amount,
        ':description': saving.description,
        ':date': saving.date,
        ':goalId': saving.goalId || null,
        ':accountId': saving.accountId || null,
    });
    saveDatabase();
};

export const addGoal = async (userId: number, goal: Omit<Goal, 'id'|'currentAmount'>) => {
    if (!db) throw new Error("DB not initialized");
    db.run("INSERT INTO goals VALUES (:id, :userId, :name, :targetAmount, :currentAmount, :deadline)", {
        ':id': `g_${new Date().getTime()}`,
        ':userId': userId,
        ':name': goal.name,
        ':targetAmount': goal.targetAmount,
        ':currentAmount': 0,
        ':deadline': goal.deadline,
    });
    saveDatabase();
};

export const addFinancialAccount = async (userId: number, account: Omit<FinancialAccount, 'id' | 'userId'>) => {
    if (!db) throw new Error("DB not initialized");
    db.run("INSERT INTO financial_accounts (id, userId, name, type, billingDay, paymentDay) VALUES (:id, :userId, :name, :type, :billingDay, :paymentDay)", {
        ':id': `acc_${new Date().getTime()}`,
        ':userId': userId,
        ':name': account.name,
        ':type': account.type,
        ':billingDay': account.billingDay || null,
        ':paymentDay': account.paymentDay || null,
    });
    saveDatabase();
};

export const addFundsToGoal = async (userId: number, amount: number, accountId: string | undefined, goal: Goal) => {
    if (!db) throw new Error("DB not initialized");
    const now = new Date();
    // Correct for timezone offset to get the user's local date in YYYY-MM-DD format
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    const dateString = localDate.toISOString().split('T')[0];
    
    // Add a saving transaction
    await addSaving(userId, { amount, description: `Aporte a meta: ${goal.name}`, goalId: goal.id, date: dateString, accountId });
    
    // Update goal's current amount
    db.run("UPDATE goals SET currentAmount = currentAmount + :amount WHERE id = :id AND userId = :userId", {
        ':amount': amount,
        ':id': goal.id,
        ':userId': userId,
    });
    saveDatabase();
}

export const deleteTransaction = async (id: string, type: 'expense' | 'income' | 'saving', userId: number) => {
    if (!db) throw new Error("DB not initialized");
    
    if (type === 'saving') {
        const savingStmt = db.prepare("SELECT amount, goalId FROM savings WHERE id = :id AND userId = :userId");
        const savingResult = savingStmt.getAsObject({ ':id': id, ':userId': userId });
        savingStmt.free();
        
        if (savingResult && savingResult.goalId) {
            db.run("UPDATE goals SET currentAmount = currentAmount - :amount WHERE id = :id AND userId = :userId", {
                ':amount': savingResult.amount as number,
                ':id': savingResult.goalId as string,
                ':userId': userId,
            });
        }
    }

    const table = `${type}s`;
    db.run(`DELETE FROM ${table} WHERE id = :id AND userId = :userId`, { ':id': id, ':userId': userId });
    saveDatabase();
}

export const deleteGoal = async (id: string, userId: number) => {
    if (!db) throw new Error("DB not initialized");
    // Also delete associated savings contributions to avoid orphaned data
    db.run("DELETE FROM savings WHERE goalId = :id AND userId = :userId", { ':id': id, ':userId': userId });
    db.run("DELETE FROM goals WHERE id = :id AND userId = :userId", { ':id': id, ':userId': userId });
    saveDatabase();
};

export const deleteFinancialAccount = async (id: string, userId: number) => {
    if (!db) throw new Error("DB not initialized");
    // Disassociate transactions from this account
    db.run("UPDATE expenses SET accountId = NULL WHERE accountId = :id AND userId = :userId", { ':id': id, ':userId': userId });
    db.run("UPDATE incomes SET accountId = NULL WHERE accountId = :id AND userId = :userId", { ':id': id, ':userId': userId });
    db.run("UPDATE savings SET accountId = NULL WHERE accountId = :id AND userId = :userId", { ':id': id, ':userId': userId });
    // Delete the account
    db.run("DELETE FROM financial_accounts WHERE id = :id AND userId = :userId", { ':id': id, ':userId': userId });
    saveDatabase();
};


// --- Update Operations ---

export const updateExpense = async (userId: number, expense: Expense) => {
    if (!db) throw new Error("DB not initialized");
    db.run("UPDATE expenses SET amount = :amount, category = :category, description = :description, date = :date, accountId = :accountId WHERE id = :id AND userId = :userId", {
        ':amount': expense.amount,
        ':category': expense.category,
        ':description': expense.description,
        ':date': expense.date,
        ':accountId': expense.accountId || null,
        ':id': expense.id,
        ':userId': userId,
    });
    saveDatabase();
};

export const updateIncome = async (userId: number, income: Income) => {
    if (!db) throw new Error("DB not initialized");
    db.run("UPDATE incomes SET amount = :amount, description = :description, date = :date, accountId = :accountId WHERE id = :id AND userId = :userId", {
        ':amount': income.amount,
        ':description': income.description,
        ':date': income.date,
        ':accountId': income.accountId || null,
        ':id': income.id,
        ':userId': userId,
    });
    saveDatabase();
};

export const updateSaving = async (userId: number, saving: Saving) => {
    if (!db) throw new Error("DB not initialized");
    
    const oldSavingStmt = db.prepare("SELECT amount, goalId FROM savings WHERE id = :id AND userId = :userId");
    const oldSaving = oldSavingStmt.getAsObject({ ':id': saving.id, ':userId': userId });
    oldSavingStmt.free();

    if (!oldSaving) throw new Error("Saving not found");
    
    if (oldSaving.goalId) {
        const amountDifference = saving.amount - (oldSaving.amount as number);
        if (amountDifference !== 0) {
            db.run("UPDATE goals SET currentAmount = currentAmount + :amountDifference WHERE id = :id AND userId = :userId", {
                ':amountDifference': amountDifference,
                ':id': oldSaving.goalId as string,
                ':userId': userId,
            });
        }
    }

    db.run("UPDATE savings SET amount = :amount, description = :description, date = :date, accountId = :accountId WHERE id = :id AND userId = :userId", {
        ':amount': saving.amount,
        ':description': saving.description,
        ':date': saving.date,
        ':accountId': saving.accountId || null,
        ':id': saving.id,
        ':userId': userId,
    });
    saveDatabase();
};

export const updateFinancialAccount = async (userId: number, account: FinancialAccount) => {
    if (!db) throw new Error("DB not initialized");
    db.run("UPDATE financial_accounts SET name = :name, type = :type, billingDay = :billingDay, paymentDay = :paymentDay WHERE id = :id AND userId = :userId", {
        ':name': account.name,
        ':type': account.type,
        ':billingDay': account.billingDay || null,
        ':paymentDay': account.paymentDay || null,
        ':id': account.id,
        ':userId': userId
    });
    saveDatabase();
};