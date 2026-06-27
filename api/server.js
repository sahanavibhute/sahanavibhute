import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend in production
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuildPath));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Helper for dates
const getLocalDateString = () => {
  return new Date().toISOString().split('T')[0];
};

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// Admin Login
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  try {
    const admin = await query.get('SELECT * FROM admin WHERE id = 1');
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (isMatch) {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change Password
app.post('/api/auth/change-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Both old and new passwords are required' });
  }
  try {
    const admin = await query.get('SELECT * FROM admin WHERE id = 1');
    const isMatch = await bcrypt.compare(oldPassword, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await query.run('UPDATE admin SET password_hash = ? WHERE id = 1', [newHash]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Security Question
app.get('/api/auth/security-question', async (req, res) => {
  try {
    const admin = await query.get('SELECT security_question FROM admin WHERE id = 1');
    res.json({ security_question: admin.security_question });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Recovery Answer and Reset Password
app.post('/api/auth/verify-recovery', async (req, res) => {
  const { answer, newPassword } = req.body;
  if (!answer || !newPassword) {
    return res.status(400).json({ error: 'Answer and new password are required' });
  }
  try {
    const admin = await query.get('SELECT security_answer_hash FROM admin WHERE id = 1');
    const isMatch = await bcrypt.compare(answer.toLowerCase().trim(), admin.security_answer_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect answer to security question' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await query.run('UPDATE admin SET password_hash = ? WHERE id = 1', [newHash]);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Security Configuration
app.post('/api/auth/update-security', async (req, res) => {
  const { password, securityQuestion, securityAnswer } = req.body;
  try {
    const admin = await query.get('SELECT password_hash FROM admin WHERE id = 1');
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password to confirm security changes' });
    }
    const answerHash = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);
    await query.run(
      'UPDATE admin SET security_question = ?, security_answer_hash = ? WHERE id = 1',
      [securityQuestion, answerHash]
    );
    res.json({ success: true, message: 'Security question updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. PRODUCT MANAGEMENT ENDPOINTS
// ==========================================

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await query.all('SELECT * FROM products ORDER BY name ASC');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a product
app.post('/api/products', async (req, res) => {
  const { name, brand, category, batch_number, purchase_price, selling_price, quantity, expiry_date, min_stock_level } = req.body;
  try {
    const result = await query.run(
      `INSERT INTO products (name, brand, category, batch_number, purchase_price, selling_price, quantity, expiry_date, min_stock_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, brand, category, batch_number, purchase_price, selling_price, quantity, expiry_date, min_stock_level]
    );

    // Log to stock history
    const dateStr = getLocalDateString();
    await query.run(
      `INSERT INTO stock_history (product_id, change_type, quantity_change, new_quantity, date, notes)
       VALUES (?, 'add', ?, ?, ?, ?)`,
      [result.id, quantity, quantity, dateStr, 'Initial product entry']
    );

    res.json({ success: true, id: result.id, message: 'Product added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a product
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, brand, category, batch_number, purchase_price, selling_price, quantity, expiry_date, min_stock_level } = req.body;
  try {
    // Get existing product to compare quantity
    const oldProduct = await query.get('SELECT quantity FROM products WHERE id = ?', [id]);
    if (!oldProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await query.run(
      `UPDATE products SET name = ?, brand = ?, category = ?, batch_number = ?, purchase_price = ?,
       selling_price = ?, quantity = ?, expiry_date = ?, min_stock_level = ? WHERE id = ?`,
      [name, brand, category, batch_number, purchase_price, selling_price, quantity, expiry_date, min_stock_level, id]
    );

    // If quantity changed, log in stock history
    const diff = quantity - oldProduct.quantity;
    if (diff !== 0) {
      const dateStr = getLocalDateString();
      await query.run(
        `INSERT INTO stock_history (product_id, change_type, quantity_change, new_quantity, date, notes)
         VALUES (?, 'update', ?, ?, ?, ?)`,
        [id, diff, quantity, dateStr, 'Product info edit adjustment']
      );
    }

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. STOCK MANAGEMENT ENDPOINTS
// ==========================================

// Adjust stock manually (Add stock, Remove damaged)
app.post('/api/stock/adjust', async (req, res) => {
  const { product_id, change_type, quantity_change, notes } = req.body;
  // change_type can be: 'add', 'remove_damaged', 'update'
  try {
    const product = await query.get('SELECT quantity FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let change = parseInt(quantity_change, 10);
    if (change_type === 'remove_damaged') {
      change = -Math.abs(change);
    } else if (change_type === 'add') {
      change = Math.abs(change);
    }

    const newQuantity = product.quantity + change;
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    await query.run('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, product_id]);

    const dateStr = getLocalDateString();
    await query.run(
      `INSERT INTO stock_history (product_id, change_type, quantity_change, new_quantity, date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, change_type, change, newQuantity, dateStr, notes]
    );

    res.json({ success: true, newQuantity, message: 'Stock adjusted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock history
app.get('/api/stock/history', async (req, res) => {
  try {
    const history = await query.all(`
      SELECT sh.*, p.name as product_name, p.brand as product_brand, p.batch_number
      FROM stock_history sh
      JOIN products p ON sh.product_id = p.id
      ORDER BY sh.id DESC
    `);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a specific stock history entry
app.delete('/api/stock/history/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM stock_history WHERE id = ?', [id]);
    res.json({ success: true, message: 'Stock history entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete multiple stock history entries
app.post('/api/stock/history/delete-multiple', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty IDs array' });
  }
  try {
    const placeholders = ids.map(() => '?').join(',');
    await query.run(`DELETE FROM stock_history WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: 'Stock history entries deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. PURCHASE MANAGEMENT ENDPOINTS
// ==========================================

// Create purchase bill
app.post('/api/purchases', async (req, res) => {
  const { purchase_bill_number, purchase_date, supplier_name, product_id, quantity, purchase_cost } = req.body;
  try {
    // 1. Add purchase record
    const result = await query.run(
      `INSERT INTO purchases (purchase_bill_number, purchase_date, supplier_name, product_id, quantity, purchase_cost)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [purchase_bill_number, purchase_date, supplier_name, product_id, quantity, purchase_cost]
    );

    // 2. Increment product quantity
    const product = await query.get('SELECT quantity FROM products WHERE id = ?', [product_id]);
    const newQty = (product ? product.quantity : 0) + parseInt(quantity, 10);
    await query.run('UPDATE products SET quantity = ? WHERE id = ?', [newQty, product_id]);

    // 3. Log to stock history
    await query.run(
      `INSERT INTO stock_history (product_id, change_type, quantity_change, new_quantity, date, notes)
       VALUES (?, 'purchase', ?, ?, ?, ?)`,
      [product_id, quantity, newQty, purchase_date, `Purchase Bill: ${purchase_bill_number} (Supplier: ${supplier_name})`]
    );

    res.json({ success: true, purchase_id: result.id, message: 'Purchase logged and stock updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get purchase logs
app.get('/api/purchases', async (req, res) => {
  try {
    const purchases = await query.all(`
      SELECT pu.*, pr.name as product_name, pr.brand as product_brand, pr.batch_number
      FROM purchases pu
      JOIN products pr ON pu.product_id = pr.id
      ORDER BY pu.id DESC
    `);
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. CUSTOMER BILLING & SALES
// ==========================================

// Create bill (sale)
app.post('/api/billing', async (req, res) => {
  const { customer_name, customer_mobile, discount, total_amount, payment_method, payment_status, items } = req.body;
  // items: [{ product_id, quantity, selling_price, purchase_price }]
  try {
    // Generate bill number (format: BILL-YYYYMMDD-XXXX)
    const dateStr = getLocalDateString();
    const cleanDate = dateStr.replace(/-/g, '');
    const countRow = await query.get("SELECT COUNT(*) as count FROM sales WHERE sale_date = ?", [dateStr]);
    const billNumber = `BILL-${cleanDate}-${String(countRow.count + 1).padStart(4, '0')}`;

    // 1. Insert Sales Record
    const saleResult = await query.run(
      `INSERT INTO sales (bill_number, sale_date, customer_name, customer_mobile, discount, total_amount, payment_method, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [billNumber, dateStr, customer_name, customer_mobile, discount || 0, total_amount, payment_method, payment_status]
    );
    const saleId = saleResult.id;

    // 2. Insert items and decrement stock
    for (const item of items) {
      // Insert item details
      await query.run(
        `INSERT INTO sales_details (sale_id, product_id, quantity, selling_price, purchase_price)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, item.product_id, item.quantity, item.selling_price, item.purchase_price]
      );

      // Fetch current quantity
      const product = await query.get('SELECT quantity, name FROM products WHERE id = ?', [item.product_id]);
      if (!product || product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product ? product.name : 'Unknown Product'}`);
      }

      const newQty = product.quantity - item.quantity;
      await query.run('UPDATE products SET quantity = ? WHERE id = ?', [newQty, item.product_id]);

      // Log stock history
      await query.run(
        `INSERT INTO stock_history (product_id, change_type, quantity_change, new_quantity, date, notes)
         VALUES (?, 'sale', ?, ?, ?, ?)`,
        [item.product_id, -item.quantity, newQty, dateStr, `Customer Bill: ${billNumber}`]
      );
    }

    // 3. Insert payment log if fully or partially paid
    if (payment_status === 'Paid') {
      await query.run(
        `INSERT INTO payments (sale_id, amount_paid, payment_date, payment_method)
         VALUES (?, ?, ?, ?)`,
        [saleId, total_amount, dateStr, payment_method]
      );
    }

    res.json({ success: true, sale_id: saleId, bill_number: billNumber, message: 'Sale recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales history
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await query.all('SELECT * FROM sales ORDER BY id DESC');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific sale details
app.get('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sale = await query.get('SELECT * FROM sales WHERE id = ?', [id]);
    if (!sale) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const items = await query.all(`
      SELECT sd.*, p.name as product_name, p.brand as product_brand, p.batch_number
      FROM sales_details sd
      JOIN products p ON sd.product_id = p.id
      WHERE sd.sale_id = ?
    `, [id]);

    const payments = await query.all('SELECT * FROM payments WHERE sale_id = ? ORDER BY id DESC', [id]);

    res.json({ sale, items, payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. PAYMENT MANAGEMENT ENDPOINTS
// ==========================================

// Get payment transactions history
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await query.all(`
      SELECT py.*, s.bill_number, s.customer_name, s.customer_mobile
      FROM payments py
      JOIN sales s ON py.sale_id = s.id
      ORDER BY py.id DESC
    `);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record a payment against a pending bill
app.post('/api/payments/record', async (req, res) => {
  const { sale_id, amount_paid, payment_method } = req.body;
  try {
    const sale = await query.get('SELECT total_amount, bill_number FROM sales WHERE id = ?', [sale_id]);
    if (!sale) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Sum previous payments
    const sumRow = await query.get('SELECT SUM(amount_paid) as total_paid FROM payments WHERE sale_id = ?', [sale_id]);
    const previousPaid = sumRow.total_paid || 0;
    const totalPaidNow = previousPaid + parseFloat(amount_paid);

    // Record the payment
    const dateStr = getLocalDateString();
    await query.run(
      `INSERT INTO payments (sale_id, amount_paid, payment_date, payment_method)
       VALUES (?, ?, ?, ?)`,
      [sale_id, amount_paid, dateStr, payment_method]
    );

    // Update status if fully paid (or very close due to float arithmetic)
    if (totalPaidNow >= sale.total_amount - 0.01) {
      await query.run("UPDATE sales SET payment_status = 'Paid' WHERE id = ?", [sale_id]);
    }

    res.json({ success: true, message: 'Payment recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. NOTIFICATIONS & ALERTS
// ==========================================

// Fetch alerts
app.get('/api/notifications', async (req, res) => {
  try {
    const today = getLocalDateString();
    const todayMs = new Date(today).getTime();

    // 1. Generate Low Stock Alerts
    const lowStockItems = await query.all('SELECT id, name, quantity, min_stock_level FROM products WHERE quantity <= min_stock_level');
    const lowStockAlerts = lowStockItems.map(item => ({
      type: 'low_stock',
      target_id: item.id,
      message: `Low Stock: "${item.name}" has only ${item.quantity} units left (Min. required: ${item.min_stock_level}).`
    }));

    // 2. Generate Expiry Alerts
    const products = await query.all('SELECT id, name, expiry_date, batch_number FROM products');
    const expiryAlerts = [];
    for (const p of products) {
      if (!p.expiry_date) continue;
      const expMs = new Date(p.expiry_date).getTime();
      const diffDays = Math.ceil((expMs - todayMs) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        expiryAlerts.push({
          type: 'expiry',
          target_id: p.id,
          message: `EXPIRED: "${p.name}" (Batch: ${p.batch_number}) expired on ${p.expiry_date}.`
        });
      } else if (diffDays <= 15) {
        expiryAlerts.push({
          type: 'expiry',
          target_id: p.id,
          message: `URGENT EXPIRY: "${p.name}" (Batch: ${p.batch_number}) expires in ${diffDays} days (${p.expiry_date}).`
        });
      } else if (diffDays <= 30) {
        expiryAlerts.push({
          type: 'expiry',
          target_id: p.id,
          message: `EXPIRY WARNING: "${p.name}" (Batch: ${p.batch_number}) expires in ${diffDays} days (${p.expiry_date}).`
        });
      }
    }

    // 3. Generate Pending Payment Alerts
    const pendingSales = await query.all("SELECT id, bill_number, customer_name, total_amount FROM sales WHERE payment_status = 'Pending'");
    const pendingAlerts = [];
    for (const sale of pendingSales) {
      const sumPaidRow = await query.get('SELECT SUM(amount_paid) as paid FROM payments WHERE sale_id = ?', [sale.id]);
      const paid = sumPaidRow.paid || 0;
      const balance = sale.total_amount - paid;
      if (balance > 0.01) {
        pendingAlerts.push({
          type: 'pending_payment',
          target_id: sale.id,
          message: `Credit Sales: Bill ${sale.bill_number} for ${sale.customer_name} has a pending balance of ₹${balance.toFixed(2)}.`
        });
      }
    }

    const allAlerts = [...lowStockAlerts, ...expiryAlerts, ...pendingAlerts];
    res.json(allAlerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. DASHBOARD AND REPORTS ENDPOINTS
// ==========================================

// Dashboard analytics
app.get('/api/reports/dashboard', async (req, res) => {
  try {
    const today = getLocalDateString();
    const currentMonth = today.substring(0, 7); // YYYY-MM

    // 1. Total Products
    const totalRow = await query.get('SELECT COUNT(*) as count FROM products');
    const totalProducts = totalRow.count;

    // 2. Low Stock Products
    const lowStockRow = await query.get('SELECT COUNT(*) as count FROM products WHERE quantity <= min_stock_level');
    const lowStockProducts = lowStockRow.count;

    // 3. Expired/Expiring Products
    const products = await query.all('SELECT expiry_date FROM products');
    const todayMs = new Date(today).getTime();
    let expiredProducts = 0;
    for (const p of products) {
      if (!p.expiry_date) continue;
      const expMs = new Date(p.expiry_date).getTime();
      const diffDays = Math.ceil((expMs - todayMs) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        expiredProducts++;
      }
    }

    // 4. Sales sums
    const sales = await query.all('SELECT * FROM sales');
    let todaySales = 0;
    let monthlySales = 0;
    let pendingPayments = 0;

    for (const s of sales) {
      const sumPaidRow = await query.get('SELECT SUM(amount_paid) as paid FROM payments WHERE sale_id = ?', [s.id]);
      const paid = sumPaidRow.paid || 0;
      const balance = s.total_amount - paid;

      if (s.sale_date === today) {
        todaySales += s.total_amount;
      }
      if (s.sale_date.substring(0, 7) === currentMonth) {
        monthlySales += s.total_amount;
      }
      if (s.payment_status === 'Pending') {
        pendingPayments += balance;
      }
    }

    // 5. Recent 5 Transactions
    const recentTransactions = await query.all(`
      SELECT * FROM sales ORDER BY id DESC LIMIT 5
    `);

    // 6. Monthly sales chart data (last 6 months)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const yearMonth = date.toISOString().substring(0, 7);
      const monthName = date.toLocaleString('default', { month: 'short' });

      const sumRow = await query.get(
        "SELECT SUM(total_amount) as total FROM sales WHERE SUBSTR(sale_date, 1, 7) = ?",
        [yearMonth]
      );
      chartData.push({
        month: monthName,
        sales: sumRow.total || 0
      });
    }

    res.json({
      metrics: {
        totalProducts,
        lowStockProducts,
        expiredProducts,
        todaySales,
        monthlySales,
        pendingPayments
      },
      recentTransactions,
      chartData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detailed Reports API
app.get('/api/reports/all', async (req, res) => {
  try {
    // We aggregate all tables to generate specific report tables in frontend
    const salesReport = await query.all(`
      SELECT s.*,
             (SELECT SUM(sd.quantity * sd.purchase_price) FROM sales_details sd WHERE sd.sale_id = s.id) as cost_price
      FROM sales s
      ORDER BY s.id DESC
    `);

    const productSalesReport = await query.all(`
      SELECT p.name, p.brand, p.category, p.batch_number,
             SUM(sd.quantity) as total_qty,
             SUM(sd.quantity * sd.selling_price) as gross_revenue,
             SUM(sd.quantity * (sd.selling_price - sd.purchase_price)) as net_profit
      FROM sales_details sd
      JOIN products p ON sd.product_id = p.id
      GROUP BY sd.product_id, p.name, p.brand, p.category, p.batch_number
      ORDER BY total_qty DESC
    `);

    const stockReport = await query.all('SELECT * FROM products ORDER BY quantity ASC');

    const purchaseReport = await query.all(`
      SELECT pu.*, pr.name, pr.brand, pr.batch_number
      FROM purchases pu
      JOIN products pr ON pu.product_id = pr.id
      ORDER BY pu.id DESC
    `);

    const customerReport = await query.all(`
      SELECT s.customer_name, s.customer_mobile,
             COUNT(s.id) as total_bills,
             SUM(s.total_amount) as total_purchased,
             SUM(CASE WHEN s.payment_status = 'Paid' THEN s.total_amount ELSE (SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE sale_id = s.id) END) as total_paid
      FROM sales s
      GROUP BY s.customer_name, s.customer_mobile
      ORDER BY total_purchased DESC
    `);

    res.json({
      sales: salesReport,
      productSales: productSalesReport,
      stock: stockReport,
      purchases: purchaseReport,
      customers: customerReport
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. BACKUP & RESTORE ENDPOINTS
// ==========================================

// JSON Export backup
app.get('/api/backup/export', async (req, res) => {
  try {
    const admin = await query.all('SELECT id, password_hash, security_question, security_answer_hash FROM admin');
    const products = await query.all('SELECT * FROM products');
    const stock_history = await query.all('SELECT * FROM stock_history');
    const purchases = await query.all('SELECT * FROM purchases');
    const sales = await query.all('SELECT * FROM sales');
    const sales_details = await query.all('SELECT * FROM sales_details');
    const payments = await query.all('SELECT * FROM payments');
    const notifications = await query.all('SELECT * FROM notifications');

    const backupData = {
      backupDate: new Date().toISOString(),
      tables: {
        admin,
        products,
        stock_history,
        purchases,
        sales,
        sales_details,
        payments,
        notifications
      }
    };

    res.json(backupData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// JSON Import restore
app.post('/api/backup/restore', async (req, res) => {
  const { tables } = req.body;
  if (!tables) {
    return res.status(400).json({ error: 'Invalid backup structure. Missing "tables" root.' });
  }

  try {
    // Perform restoration in a transaction-like series of writes
    await query.exec('BEGIN TRANSACTION');

    // Clear all existing data
    await query.exec('DELETE FROM admin');
    await query.exec('DELETE FROM products');
    await query.exec('DELETE FROM stock_history');
    await query.exec('DELETE FROM purchases');
    await query.exec('DELETE FROM sales');
    await query.exec('DELETE FROM sales_details');
    await query.exec('DELETE FROM payments');
    await query.exec('DELETE FROM notifications');

    // 1. Restore Admin
    if (tables.admin && tables.admin.length > 0) {
      for (const row of tables.admin) {
        await query.run(
          'INSERT INTO admin (id, password_hash, security_question, security_answer_hash) VALUES (?, ?, ?, ?)',
          [row.id, row.password_hash, row.security_question, row.security_answer_hash]
        );
      }
    }

    // 2. Restore Products
    if (tables.products && tables.products.length > 0) {
      for (const row of tables.products) {
        await query.run(
          `INSERT INTO products (id, name, brand, category, batch_number, purchase_price, selling_price, quantity, expiry_date, min_stock_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.name, row.brand, row.category, row.batch_number, row.purchase_price, row.selling_price, row.quantity, row.expiry_date, row.min_stock_level]
        );
      }
    }

    // 3. Restore Stock History
    if (tables.stock_history && tables.stock_history.length > 0) {
      for (const row of tables.stock_history) {
        await query.run(
          `INSERT INTO stock_history (id, product_id, change_type, quantity_change, new_quantity, date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.product_id, row.change_type, row.quantity_change, row.new_quantity, row.date, row.notes]
        );
      }
    }

    // 4. Restore Purchases
    if (tables.purchases && tables.purchases.length > 0) {
      for (const row of tables.purchases) {
        await query.run(
          `INSERT INTO purchases (id, purchase_bill_number, purchase_date, supplier_name, product_id, quantity, purchase_cost)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.purchase_bill_number, row.purchase_date, row.supplier_name, row.product_id, row.quantity, row.purchase_cost]
        );
      }
    }

    // 5. Restore Sales
    if (tables.sales && tables.sales.length > 0) {
      for (const row of tables.sales) {
        await query.run(
          `INSERT INTO sales (id, bill_number, sale_date, customer_name, customer_mobile, discount, total_amount, payment_method, payment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.bill_number, row.sale_date, row.customer_name, row.customer_mobile, row.discount, row.total_amount, row.payment_method, row.payment_status]
        );
      }
    }

    // 6. Restore Sales Details
    if (tables.sales_details && tables.sales_details.length > 0) {
      for (const row of tables.sales_details) {
        await query.run(
          `INSERT INTO sales_details (id, sale_id, product_id, quantity, selling_price, purchase_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [row.id, row.sale_id, row.product_id, row.quantity, row.selling_price, row.purchase_price]
        );
      }
    }

    // 7. Restore Payments
    if (tables.payments && tables.payments.length > 0) {
      for (const row of tables.payments) {
        await query.run(
          `INSERT INTO payments (id, sale_id, amount_paid, payment_date, payment_method)
           VALUES (?, ?, ?, ?, ?)`,
          [row.id, row.sale_id, row.amount_paid, row.payment_date, row.payment_method]
        );
      }
    }

    // 8. Restore Notifications
    if (tables.notifications && tables.notifications.length > 0) {
      for (const row of tables.notifications) {
        await query.run(
          `INSERT INTO notifications (id, type, target_id, message, created_at, is_read)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [row.id, row.type, row.target_id, row.message, row.created_at, row.is_read]
        );
      }
    }

    await query.exec('COMMIT');
    res.json({ success: true, message: 'Database restored successfully' });
  } catch (error) {
    await query.exec('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Fallback to React static build files for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5173;
  app.listen(PORT, () => {
    console.log(`Server is running offline on http://localhost:${PORT}`);
    if (process.send) {
      process.send('ready');
    }
  });
}

export default app;
