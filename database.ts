import initSqlJs from 'sql.js';
import { Expense, Goal, Income, Saving, User, Category } from './types';

let db: initSqlJs.Database | null = null;
const DB_NAME = 'financial_dashboard_db';

// Guarda la base de datos en el almacenamiento local del navegador
const saveDatabase = () => {
    if (db) {
        const data = db.export();
        localStorage.setItem(DB_NAME, JSON.stringify(Array.from(data)));
    }
};

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
          CREATE TABLE expenses ( id TEXT PRIMARY KEY, userId INTEGER, amount REAL, category TEXT, description TEXT, date TEXT, FOREIGN KEY(userId) REFERENCES users(id) );
          CREATE TABLE incomes ( id TEXT PRIMARY KEY, userId INTEGER, amount REAL, description TEXT, date TEXT, FOREIGN KEY(userId) REFERENCES users(id) );
          CREATE TABLE savings ( id TEXT PRIMARY KEY, userId INTEGER, amount REAL, description TEXT, date TEXT, goalId TEXT, FOREIGN KEY(userId) REFERENCES users(id) );
          CREATE TABLE goals ( id TEXT PRIMARY KEY, userId INTEGER, name TEXT, targetAmount REAL, currentAmount REAL, deadline TEXT, FOREIGN KEY(userId) REFERENCES users(id) );
        `;
        db.run(schema);
        saveDatabase();
    }
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

export const addExpense = async (userId: number, expense: Omit<Expense, 'id'|'date'>) => {
    if (!db) throw new Error("DB not initialized");
    db.run("INSERT INTO expenses VALUES (:id, :userId, :amount, :category, :description, :date)", {
        ':id': `e_${new Date().getTime()}`,
        ':userId': userId,
        ':amount': expense.amount,
        ':category': expense.category,
        ':description': expense.description,
        ':date': new Date().toISOString(),
    });
    saveDatabase();
};

export const addIncome = async (userId: number, income: Omit<Income, 'id'|'date'>) => {
    if (!db) throw new Error("DB not initialized");
    db.run("INSERT INTO incomes VALUES (:id, :userId, :amount, :description, :date)", {
        ':id': `i_${new Date().getTime()}`,
        ':userId': userId,
        ':amount': income.amount,
        ':description': income.description,
        ':date': new Date().toISOString(),
    });
    saveDatabase();
};

export const addSaving = async (userId: number, saving: Omit<Saving, 'id'|'date'>) => {
    if (!db) throw new Error("DB not initialized");
    db.run("INSERT INTO savings VALUES (:id, :userId, :amount, :description, :date, :goalId)", {
        ':id': `s_${new Date().getTime()}`,
        ':userId': userId,
        ':amount': saving.amount,
        ':description': saving.description,
        ':date': new Date().toISOString(),
        ':goalId': saving.goalId || null,
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

export const addFundsToGoal = async (userId: number, amount: number, goal: Goal) => {
    if (!db) throw new Error("DB not initialized");
    // Add a saving transaction
    await addSaving(userId, { amount, description: `Aporte a meta: ${goal.name}`, goalId: goal.id });
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
        
        if (savingResult.goalId) {
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