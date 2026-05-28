import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';

let db: Database.Database;

// Função para garantir que o banco seja instanciado apenas quando necessário
const getDb = () => {
  if (!db) {
    const isDev = !app.isPackaged;
    const dbPath = isDev 
      ? path.join(process.cwd(), 'local.db')
      : path.join(app.getPath('userData'), 'local.db');

    console.log('[BANCO] Utilizando better-sqlite3 em:', dbPath);
    db = new Database(dbPath, { verbose: isDev ? console.log : undefined });
    db.pragma('journal_mode = WAL');
  }
  return db;
};

export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error('[BANCO] Erro na query:', sql, err);
    throw err;
  }
};

export const get = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.get(...params);
  } catch (err) {
    console.error('[BANCO] Erro no get:', sql, err);
    throw err;
  }
};

export const run = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    const stmt = getDb().prepare(sql);
    const info = stmt.run(...params);
    return { lastID: info.lastInsertRowid, changes: info.changes };
  } catch (err) {
    console.error('[BANCO] Erro no run:', sql, err);
    throw err;
  }
};

export const initDatabase = async () => {
  const database = getDb();
  console.log('[BANCO] Inicializando tabelas e migrações...');

  database.exec(`
    CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, archived INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'vendedor');
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, barcode TEXT UNIQUE, name TEXT NOT NULL, price REAL NOT NULL, cost_price REAL DEFAULT 0, archived INTEGER DEFAULT 0, synced INTEGER DEFAULT 0, image TEXT, category_id TEXT);
    CREATE TABLE IF NOT EXISTS inventory (product_id TEXT, store_id TEXT, quantity INTEGER DEFAULT 0, min_stock INTEGER DEFAULT 2, sale_tolerance_days INTEGER DEFAULT 30, PRIMARY KEY(product_id, store_id));
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      amount REAL NOT NULL,
      period TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, total REAL NOT NULL, payment_method TEXT NOT NULL, vendedor TEXT NOT NULL, store_id TEXT, customer_id TEXT, items TEXT NOT NULL, discount REAL DEFAULT 0, synced INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS commissions (id TEXT PRIMARY KEY, sale_id TEXT, vendedor TEXT NOT NULL, value REAL NOT NULL, percentage REAL NOT NULL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS expense_categories (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      category_id TEXT,
      value REAL NOT NULL,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT,
      store_id TEXT,
      synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS maintenance_orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      customer_phone TEXT,
      device_brand TEXT,
      device_model TEXT,
      serial_number TEXT,
      device_password TEXT,
      visual_condition TEXT,
      issue_description TEXT,
      technical_notes TEXT,
      checklist TEXT,
      priority TEXT DEFAULT 'normal',
      photo_url TEXT,
      price REAL DEFAULT 0,
      entry_store_id TEXT,
      maintenance_store_id TEXT,
      return_store_id TEXT,
      current_store_id TEXT,
      status TEXT,
      payment_status TEXT DEFAULT 'pending',
      delivery_date TEXT,
      synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS global_library (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT,
      synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrações para campos novos (JavaScript)
  try { database.exec("ALTER TABLE users ADD COLUMN photo_url TEXT;"); } catch(e) {}
  try { database.exec("ALTER TABLE maintenance_orders ADD COLUMN customer_phone_secondary TEXT;"); } catch(e) {}
  try { database.exec("ALTER TABLE maintenance_orders ADD COLUMN customer_email TEXT;"); } catch(e) {}
  try { database.exec("ALTER TABLE maintenance_orders ADD COLUMN technician_id TEXT;"); } catch(e) {}
  try { database.exec("ALTER TABLE maintenance_orders ADD COLUMN budget_details TEXT;"); } catch(e) {}
  try { database.exec("ALTER TABLE maintenance_orders ADD COLUMN current_store_id TEXT;"); } catch(e) {}
  try { database.exec("ALTER TABLE maintenance_orders ADD COLUMN photo_url TEXT;"); } catch(e) {}

  database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      cpf TEXT,
      rg TEXT,
      birth_date TEXT,
      city TEXT DEFAULT 'ALMENARA',
      origin TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      assignee_type TEXT NOT NULL,
      assignee_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      is_routine INTEGER DEFAULT 0,
      proof_required INTEGER DEFAULT 0,
      photo_proof TEXT,
      justification TEXT,
      completed_at DATETIME,
      synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financial_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT,
      store_id TEXT,
      reference_id TEXT,
      synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS repair_history (
      id TEXT PRIMARY KEY,
      repair_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(repair_id) REFERENCES maintenance_orders(id)
    );

    CREATE TABLE IF NOT EXISTS accounts_payable_receivable (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      category_id TEXT,
      store_id TEXT,
      reference_id TEXT,
      synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_registers (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      opening_balance REAL DEFAULT 0,
      closing_balance REAL,
      reported_balance REAL,
      total_sales REAL DEFAULT 0,
      total_cash REAL DEFAULT 0,
      total_card REAL DEFAULT 0,
      total_pix REAL DEFAULT 0,
      total_expenses REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      notes TEXT
    );
  `);

  // Migrações básicas
  const migrations = [
    { table: 'stores', col: 'archived', type: 'INTEGER DEFAULT 0' },
    { table: 'products', col: 'archived', type: 'INTEGER DEFAULT 0' },
    { table: 'products', col: 'synced', type: 'INTEGER DEFAULT 0' },
    { table: 'products', col: 'image', type: 'TEXT' },
    { table: 'products', col: 'extra_barcodes', type: "TEXT DEFAULT '[]'" },
    { table: 'sales', col: 'synced', type: 'INTEGER DEFAULT 0' },
    { table: 'sales', col: 'customer_id', type: 'TEXT' },
    { table: 'inventory', col: 'min_stock', type: 'INTEGER DEFAULT 2' },
    { table: 'inventory', col: 'sale_tolerance_days', type: 'INTEGER DEFAULT 30' },
    { table: 'maintenance_orders', col: 'payment_status', type: "TEXT DEFAULT 'pending'" },
    { table: 'maintenance_orders', col: 'return_store_id', type: "TEXT" },
    { table: 'maintenance_orders', col: 'delivery_date', type: "TEXT" },
    { table: 'maintenance_orders', col: 'serial_number', type: "TEXT" },
    { table: 'maintenance_orders', col: 'priority', type: "TEXT DEFAULT 'normal'" },
    { table: 'maintenance_orders', col: 'checklist', type: "TEXT" },
    { table: 'maintenance_orders', col: 'technical_notes', type: "TEXT" },
    { table: 'customers', col: 'cpf', type: "TEXT" },
    { table: 'customers', col: 'rg', type: "TEXT" },
    { table: 'customers', col: 'birth_date', type: "TEXT" },
    { table: 'customers', col: 'city', type: "TEXT DEFAULT 'ALMENARA'" },
    { table: 'customers', col: 'origin', type: "TEXT" },
    { table: 'tasks', col: 'is_routine', type: "INTEGER DEFAULT 0" },
    { table: 'tasks', col: 'proof_required', type: "INTEGER DEFAULT 0" },
    { table: 'tasks', col: 'photo_proof', type: "TEXT" },
    { table: 'tasks', col: 'justification', type: "TEXT" },
    { table: 'tasks', col: 'completed_at', type: "DATETIME" },
    { table: 'tasks', col: 'synced', type: "INTEGER DEFAULT 0" },
    { table: 'financial_transactions', col: 'reference_id', type: "TEXT" }
  ];

  for (const m of migrations) {
    try {
      database.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.col} ${m.type}`);
    } catch (e) { /* Coluna já existe */ }
  }

  // Migração de dados legados para financial_transactions
  console.log('[BANCO] Sincronizando transações financeiras...');
  
  // Migrar Vendas (se não existirem no financeiro)
  database.exec(`
    INSERT OR IGNORE INTO financial_transactions (id, type, category, description, amount, date, payment_method, store_id, reference_id)
    SELECT id, 'INFLOW', 'VENDA', 'VENDA PDV - ' || vendedor, total, created_at, payment_method, store_id, id
    FROM sales
  `);

  // Migrar Despesas (se não existirem no financeiro)
  database.exec(`
    INSERT OR IGNORE INTO financial_transactions (id, type, category, description, amount, date, payment_method, store_id, reference_id)
    SELECT e.id, 'OUTFLOW', IFNULL(c.name, 'OUTROS'), e.description, e.value, e.date, e.payment_method, e.store_id, e.id
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
  `);
  
  // Limpar duplicatas (casos onde o mesmo ID de venda/gasto foi inserido mais de uma vez)
  database.exec(`
    DELETE FROM financial_transactions 
    WHERE id NOT IN (
      SELECT MIN(id) 
      FROM financial_transactions 
      GROUP BY reference_id, type, amount
    ) AND reference_id IS NOT NULL;
  `);

  console.log('[BANCO] Sincronização concluída.');

  const userCount: any = database.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count === 0) {
    database.prepare('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)').run(randomUUID(), 'Admin', 'admin', 'admin');
  }

  // --- CONFIGURAÇÃO AUTOMÁTICA DA IMPRESSORA KNUP ---
  const printerInterface = database.prepare("SELECT value FROM settings WHERE key = 'printer_interface'").get();
  if (!printerInterface) {
    console.log('[BANCO] Configurando impressora Knup automaticamente...');
    database.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('printer_interface', 'USB:28e9:0289');
    database.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('printer_type', 'escpos');
  }

  console.log('[BANCO] Inicialização concluída.');
};

export default { query, get, run, initDatabase };
