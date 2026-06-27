import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'url';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = dirname(__filename) + '/supplements.db';

const { Pool } = pg;
const isPostgres = !!process.env.DATABASE_URL;

let db;
let pool;

if (isPostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('Database connected using PostgreSQL (Cloud)');
  initializeTables();
} else {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database', err);
    } else {
      console.log('Database connected using SQLite (Local) at', dbPath);
      initializeTables();
    }
  });
}

// Utility to translate standard ? SQL placeholders to Postgres $1, $2, ... placeholders
function translateQuery(sql) {
  if (!isPostgres) return sql;
  let count = 0;
  return sql.replace(/\?/g, () => {
    count++;
    return `$${count}`;
  });
}

// Utility to translate SQLite schema syntax to Postgres schema syntax
function translateSchema(sql) {
  if (!isPostgres) return sql;
  return sql
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/REAL/gi, 'DOUBLE PRECISION')
    .replace(/CHECK\s*\(\s*id\s*=\s*1\s*\)/gi, 'CHECK (id = 1)'); // compatible check syntax
}

// Database query wrapper utilities
export const query = {
  run: async (sql, params = []) => {
    if (isPostgres) {
      let querySql = translateQuery(sql);
      // For inserts, automatically append RETURNING id to capture lastID
      if (/^\s*insert\s+/i.test(querySql) && !/returning/i.test(querySql)) {
        querySql += ' RETURNING id';
      }
      const res = await pool.query(querySql, params);
      const lastID = res.rows[0] ? res.rows[0].id : null;
      return { id: lastID, changes: res.rowCount };
    } else {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
        });
      });
    }
  },
  get: async (sql, params = []) => {
    if (isPostgres) {
      const querySql = translateQuery(sql);
      const res = await pool.query(querySql, params);
      return res.rows[0];
    } else {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
  },
  all: async (sql, params = []) => {
    if (isPostgres) {
      const querySql = translateQuery(sql);
      const res = await pool.query(querySql, params);
      return res.rows;
    } else {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  },
  exec: async (sql) => {
    if (isPostgres) {
      await pool.query(sql);
    } else {
      return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
};

async function initializeTables() {
  try {
    // 1. Admin table
    await query.run(translateSchema(`
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        password_hash TEXT NOT NULL,
        security_question TEXT NOT NULL,
        security_answer_hash TEXT NOT NULL
      )
    `));

    // Seed default admin if empty
    const adminCheck = await query.get('SELECT * FROM admin WHERE id = 1');
    if (!adminCheck) {
      const defaultPasswordHash = await bcrypt.hash('admin123', 10);
      const defaultAnswerHash = await bcrypt.hash('gym', 10);
      await query.run(
        `INSERT INTO admin (id, password_hash, security_question, security_answer_hash) VALUES (1, ?, ?, ?)`,
        [defaultPasswordHash, 'What is your favorite sport?', defaultAnswerHash]
      );
      console.log('Default admin seeded (User: admin, Pass: admin123, Answer: gym)');
    }

    // 2. Products table
    await query.run(translateSchema(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        category TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        purchase_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        expiry_date TEXT NOT NULL,
        min_stock_level INTEGER NOT NULL DEFAULT 5
      )
    `));

    // 3. Stock History table
    await query.run(translateSchema(`
      CREATE TABLE IF NOT EXISTS stock_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        change_type TEXT CHECK(change_type IN ('add', 'update', 'remove_damaged', 'purchase', 'sale')),
        quantity_change INTEGER NOT NULL,
        new_quantity INTEGER NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `));

    // 4. Purchases table
    await query.run(translateSchema(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_bill_number TEXT NOT NULL,
        purchase_date TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        purchase_cost REAL NOT NULL,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `));

    // 5. Sales table
    await query.run(translateSchema(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_number TEXT NOT NULL UNIQUE,
        sale_date TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_mobile TEXT NOT NULL,
        discount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        payment_status TEXT CHECK(payment_status IN ('Paid', 'Pending')) NOT NULL
      )
    `));

    // 6. Sales Details table
    await query.run(translateSchema(`
      CREATE TABLE IF NOT EXISTS sales_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        selling_price REAL NOT NULL,
        purchase_price REAL NOT NULL,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `));

    // 7. Payments table
    await query.run(translateSchema(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        amount_paid REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
      )
    `));

    // 8. Notifications table
    await query.run(translateSchema(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT CHECK(type IN ('low_stock', 'expiry', 'pending_payment')),
        target_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_read INTEGER DEFAULT 0
      )
    `));

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing tables', error);
  }
}

export default db;
