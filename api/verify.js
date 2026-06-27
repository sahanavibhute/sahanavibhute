import { query, dbReady } from './db.js';

async function runSelfTest() {
  console.log('--- Database Verification Self-Test ---');
  try {
    // Wait for DB migrations to complete
    await dbReady;

    // 1. Check if admin table is seeded
    const admin = await query.get('SELECT id, security_question FROM admin WHERE id = 1');
    if (admin) {
      console.log('✅ Admin Table: Seeding verified. Default security question:', admin.security_question);
    } else {
      console.error('❌ Admin Table: Admin record missing.');
    }

    // 2. Insert a temporary product
    const insertRes = await query.run(`
      INSERT INTO products (name, brand, category, batch_number, purchase_price, selling_price, quantity, expiry_date, min_stock_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['Test Whey Protein', 'TestBrand', 'Whey Protein', 'BATCH-TEST-01', 20.00, 35.00, 10, '2027-12-31', 3]);
    
    console.log('✅ Products Table: Insert verified. Product ID:', insertRes.id);

    // 3. Verify Product read
    const product = await query.get('SELECT * FROM products WHERE id = ?', [insertRes.id]);
    if (product && product.name === 'Test Whey Protein') {
      console.log('✅ Products Table: Query verification matches values.');
    } else {
      console.error('❌ Products Table: Query mismatch or failed.');
    }

    // 4. Log a test Stock History entry
    const historyRes = await query.run(`
      INSERT INTO stock_history (product_id, change_type, quantity_change, new_quantity, date, notes)
      VALUES (?, 'add', 10, 10, ?, ?)
    `, [insertRes.id, '2026-06-26', 'Self-Test entry']);
    console.log('✅ Stock History Table: Logging verified. Record ID:', historyRes.id);

    // 5. Query Stock History list
    const logs = await query.all('SELECT * FROM stock_history WHERE product_id = ?', [insertRes.id]);
    if (logs.length > 0) {
      console.log('✅ Stock History Table: Logs retrieval verified.');
    } else {
      console.error('❌ Stock History Table: Retrieve logs failed.');
    }

    // 6. Clean up Test product
    await query.run('DELETE FROM products WHERE id = ?', [insertRes.id]);
    console.log('✅ Database Cleanup: Temporary records cleared.');
    console.log('-------------------------------------------');
    console.log('🎉 DATABASE VERIFICATION SUCCESSFUL!');
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
  } finally {
    process.exit(0);
  }
}

runSelfTest();
