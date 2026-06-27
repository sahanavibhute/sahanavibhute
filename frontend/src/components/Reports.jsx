import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Printer, Database, Upload, FileText, CheckCircle } from 'lucide-react';

function Reports() {
  const [reportData, setReportData] = useState({
    sales: [],
    productSales: [],
    stock: [],
    purchases: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'products', 'stock', 'backup'
  
  // Date range filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Backup states
  const [restoreFile, setRestoreFile] = useState(null);
  const [backupSuccess, setBackupSuccess] = useState('');
  const [backupError, setBackupError] = useState('');

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports/all');
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter Sales Report by date range
  const filteredSales = reportData.sales.filter(s => {
    if (!startDate && !endDate) return true;
    const saleTime = new Date(s.sale_date).getTime();
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Infinity;
    return saleTime >= start && saleTime <= end;
  });

  // Calculate Sales Summary Totals
  const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalSalesCost = filteredSales.reduce((sum, s) => sum + (s.cost_price || 0), 0);
  const totalNetProfit = totalSalesRevenue - totalSalesCost;
  const totalDiscounts = filteredSales.reduce((sum, s) => sum + s.discount, 0);

  // CSV Exporter Utility
  const downloadCSV = (headers, rows, filename) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') ? `"${str}"` : str;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Sales Report to CSV
  const handleExportSales = () => {
    const headers = ['Bill Number', 'Sale Date', 'Customer Name', 'Customer Mobile', 'Discount Given', 'Total Revenue ($)', 'Payment Method', 'Payment Status'];
    const rows = filteredSales.map(s => [
      s.bill_number,
      s.sale_date,
      s.customer_name,
      s.customer_mobile,
      s.discount.toFixed(2),
      s.total_amount.toFixed(2),
      s.payment_method,
      s.payment_status
    ]);
    downloadCSV(headers, rows, 'Sales_Report');
  };

  // Export Product Sales Report to CSV
  const handleExportProducts = () => {
    const headers = ['Supplement Name', 'Brand', 'Category', 'Batch Number', 'Quantity Sold', 'Gross Revenue ($)', 'Net Profit ($)'];
    const rows = reportData.productSales.map(p => [
      p.name,
      p.brand,
      p.category,
      p.batch_number,
      p.total_qty,
      p.gross_revenue.toFixed(2),
      p.net_profit.toFixed(2)
    ]);
    downloadCSV(headers, rows, 'Product_Sales_Report');
  };

  // Export Stock Report to CSV
  const handleExportStock = () => {
    const headers = ['Supplement Name', 'Brand', 'Category', 'Batch Number', 'Purchase Price ($)', 'Selling Price ($)', 'Current Stock Qty', 'Total Valuation Cost ($)', 'Total Potential Revenue ($)'];
    const rows = reportData.stock.map(p => [
      p.name,
      p.brand,
      p.category,
      p.batch_number,
      p.purchase_price.toFixed(2),
      p.selling_price.toFixed(2),
      p.quantity,
      (p.purchase_price * p.quantity).toFixed(2),
      (p.selling_price * p.quantity).toFixed(2)
    ]);
    downloadCSV(headers, rows, 'Stock_Report');
  };

  // Printable layout trigger
  const handlePrint = () => {
    window.print();
  };

  // Database JSON Backup Export trigger
  const handleExportBackup = async () => {
    setBackupSuccess('');
    setBackupError('');
    try {
      const res = await fetch('/api/backup/export');
      if (res.ok) {
        const json = await res.json();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `SupplementStore_DB_Backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        setBackupSuccess('Database JSON file exported successfully!');
      } else {
        setBackupError('Failed to generate export backup');
      }
    } catch (err) {
      setBackupError('Could not connect to database server');
    }
  };

  // Database JSON Restore Import trigger
  const handleRestoreBackup = async (e) => {
    e.preventDefault();
    setBackupSuccess('');
    setBackupError('');

    if (!restoreFile) {
      setBackupError('Please select a JSON backup file first');
      return;
    }

    if (!window.confirm('WARNING: Restoring the database will OVERWRITE all current inventories, transaction histories, and admin settings. Do you want to proceed?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupJson = JSON.parse(event.target.result);
        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupJson)
        });

        if (res.ok) {
          setBackupSuccess('Database restored successfully! Reloading data...');
          setRestoreFile(null);
          fetchReports();
        } else {
          const errData = await res.json();
          setBackupError(errData.error || 'Failed to restore database');
        }
      } catch (err) {
        setBackupError('Invalid JSON file format. Make sure it is a valid backup file.');
      }
    };
    reader.readAsText(restoreFile);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
      
      {/* Top filter and tabs card */}
      <div className="glass-card no-print" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
          <button className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('sales')} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Sales Report
          </button>
          <button className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('products')} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Product Sales
          </button>
          <button className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('stock')} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Stock Valuation
          </button>
          <button className={`btn ${activeTab === 'backup' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('backup')} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <Database size={14} /> Backups
          </button>
        </div>

        {/* Date Filter for Sales tab */}
        {activeTab === 'sales' && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From</span>
            <input type="date" className="glass-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To</span>
            <input type="date" className="glass-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        )}

        {/* Action Export Buttons */}
        {activeTab !== 'backup' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={handlePrint} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <Printer size={14} /> Print
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={activeTab === 'sales' ? handleExportSales : activeTab === 'products' ? handleExportProducts : handleExportStock} 
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Main Report Render Area */}
      <div id="print-area" className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Generating report data...</div>
        ) : (
          <>
            {/* 1. SALES REPORT VIEW */}
            {activeTab === 'sales' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                
                {/* Print Title (Visible only when printing) */}
                <div style={{ display: 'none', marginBottom: '1.5rem' }} className="print-title">
                  <h2>Supplement Store - Sales Ledger Report</h2>
                  <p>Generated on: {new Date().toLocaleDateString()} {startDate && `| Filters: ${startDate} to ${endDate}`}</p>
                </div>

                {/* Sales Summary Widgets */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }} className="no-print">
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GROSS REVENUE</span>
                    <h4 style={{ fontSize: '1.25rem', color: 'var(--secondary)', fontWeight: 800, marginTop: '0.25rem' }}>
                      ${totalSalesRevenue.toFixed(2)}
                    </h4>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>INVENTORY PURCHASE COST</span>
                    <h4 style={{ fontSize: '1.25rem', color: '#6366f1', fontWeight: 800, marginTop: '0.25rem' }}>
                      ${totalSalesCost.toFixed(2)}
                    </h4>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NET PROFIT</span>
                    <h4 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 800, marginTop: '0.25rem' }}>
                      ${totalNetProfit.toFixed(2)}
                    </h4>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DISCOUNTS GIVEN</span>
                    <h4 style={{ fontSize: '1.25rem', color: 'var(--warning)', fontWeight: 800, marginTop: '0.25rem' }}>
                      ${totalDiscounts.toFixed(2)}
                    </h4>
                  </div>
                </div>

                {/* Sales Bills Table */}
                {filteredSales.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No sales transactions in filtered dates.</div>
                ) : (
                  <div className="table-container" style={{ flex: 1 }}>
                    <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Bill Number</th>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Discount</th>
                          <th>Revenue</th>
                          <th>Cost Price</th>
                          <th>Net Profit</th>
                          <th>Payment Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSales.map((s) => {
                          const profit = s.total_amount - (s.cost_price || 0);
                          return (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 600, color: 'white' }}>{s.bill_number}</td>
                              <td>{s.sale_date}</td>
                              <td>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{s.customer_name}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>Mob: {s.customer_mobile}</div>
                                </div>
                              </td>
                              <td>${s.discount.toFixed(2)}</td>
                              <td style={{ fontWeight: 600 }}>${s.total_amount.toFixed(2)}</td>
                              <td>${(s.cost_price || 0).toFixed(2)}</td>
                              <td style={{ fontWeight: 700, color: profit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                                ${profit.toFixed(2)}
                              </td>
                              <td>{s.payment_method}</td>
                              <td>
                                <span className={`badge ${s.payment_status === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                                  {s.payment_status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. PRODUCT SALES REPORT VIEW */}
            {activeTab === 'products' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <div style={{ display: 'none', marginBottom: '1.5rem' }} className="print-title">
                  <h2>Supplement Store - Product Sales Report</h2>
                  <p>Sorted by units sold volume. Generated on: {new Date().toLocaleDateString()}</p>
                </div>

                {reportData.productSales.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No products sold yet.</div>
                ) : (
                  <div className="table-container" style={{ flex: 1 }}>
                    <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Supplement Details</th>
                          <th>Category</th>
                          <th>Batch Number</th>
                          <th>Units Sold</th>
                          <th>Gross Revenue</th>
                          <th>Net Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.productSales.map((p, idx) => (
                          <tr key={idx}>
                            <td>
                              <div>
                                <div style={{ fontWeight: 600, color: 'white' }}>{p.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>{p.brand}</div>
                              </div>
                            </td>
                            <td>{p.category}</td>
                            <td><code>{p.batch_number}</code></td>
                            <td style={{ fontWeight: 700 }}>{p.total_qty} units</td>
                            <td>${p.gross_revenue.toFixed(2)}</td>
                            <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>${p.net_profit.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. STOCK VALUATION REPORT VIEW */}
            {activeTab === 'stock' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                <div style={{ display: 'none', marginBottom: '1.5rem' }} className="print-title">
                  <h2>Supplement Store - Stock Valuation Audit</h2>
                  <p>Current catalog asset worth. Generated on: {new Date().toLocaleDateString()}</p>
                </div>

                {/* Stock totals summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} className="no-print">
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL STOCK INVENTORY COST</span>
                    <h4 style={{ fontSize: '1.25rem', color: '#6366f1', fontWeight: 800, marginTop: '0.25rem' }}>
                      ${reportData.stock.reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0).toFixed(2)}
                    </h4>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL POTENTIAL SELLING VALUE</span>
                    <h4 style={{ fontSize: '1.25rem', color: 'var(--secondary)', fontWeight: 800, marginTop: '0.25rem' }}>
                      ${reportData.stock.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0).toFixed(2)}
                    </h4>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>POTENTIAL PROFIT</span>
                    <h4 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 800, marginTop: '0.25rem' }}>
                      ${reportData.stock.reduce((sum, p) => sum + ((p.selling_price - p.purchase_price) * p.quantity), 0).toFixed(2)}
                    </h4>
                  </div>
                </div>

                {reportData.stock.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Catalog is empty.</div>
                ) : (
                  <div className="table-container" style={{ flex: 1 }}>
                    <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Supplement Details</th>
                          <th>Category</th>
                          <th>Batch</th>
                          <th>Purchase price</th>
                          <th>Selling price</th>
                          <th>Quantity</th>
                          <th>Asset Cost</th>
                          <th>Retail Worth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.stock.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600, color: 'white' }}>{p.name}</td>
                            <td>{p.category}</td>
                            <td><code>{p.batch_number}</code></td>
                            <td>${p.purchase_price.toFixed(2)}</td>
                            <td>${p.selling_price.toFixed(2)}</td>
                            <td style={{ fontWeight: 700 }}>{p.quantity} units</td>
                            <td>${(p.purchase_price * p.quantity).toFixed(2)}</td>
                            <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                              ${(p.selling_price * p.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 4. DATABASE BACKUP & RESTORE VIEW */}
            {activeTab === 'backup' && (
              <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="no-print">
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Database Backup & Restoration</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Export the entire SQLite database into a portable JSON backup file, or restore data from an existing backup.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  {/* Export Box */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>Export DB State</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-dark)', marginTop: '0.25rem' }}>Download a complete snapshot backup of all tables.</p>
                    </div>

                    <button className="btn btn-primary" onClick={handleExportBackup} style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
                      <Download size={16} /> Export JSON File
                    </button>
                  </div>

                  {/* Import Box */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>Restore DB State</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-dark)', marginTop: '0.25rem' }}>Upload a JSON backup file to overwrite current data state.</p>
                    </div>

                    <form onSubmit={handleRestoreBackup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <input 
                        type="file" 
                        accept=".json"
                        onChange={(e) => setRestoreFile(e.target.files[0])}
                        style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}
                      />
                      <button type="submit" className="btn btn-danger" style={{ alignSelf: 'flex-start' }}>
                        <Upload size={16} /> Upload & Restore
                      </button>
                    </form>
                  </div>
                </div>

                {backupSuccess && (
                  <div style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', justifyContent: 'center' }}>
                    <CheckCircle size={16} /> {backupSuccess}
                  </div>
                )}
                {backupError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center' }}>
                    {backupError}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

export default Reports;
