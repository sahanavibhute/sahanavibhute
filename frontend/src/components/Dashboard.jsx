import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  TrendingDown
} from 'lucide-react';

function Dashboard({ setCurrentTab, onRefreshNotif }) {
  const [data, setData] = useState({
    metrics: {
      totalProducts: 0,
      lowStockProducts: 0,
      expiredProducts: 0,
      todaySales: 0,
      monthlySales: 0,
      pendingPayments: 0
    },
    recentTransactions: [],
    chartData: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/reports/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    onRefreshNotif();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  const { metrics, recentTransactions, chartData } = data;

  // Find max sales for scaling the chart
  const maxSales = Math.max(...chartData.map(d => d.sales), 100);

  // Quick stat cards config
  const statCards = [
    { 
      title: 'Total Products', 
      value: metrics.totalProducts, 
      desc: 'Registered catalog items',
      icon: Package, 
      color: '#8b5cf6', 
      bg: 'rgba(139, 92, 246, 0.1)',
      tab: 'products'
    },
    { 
      title: 'Low Stock Products', 
      value: metrics.lowStockProducts, 
      desc: 'At or below threshold',
      icon: AlertTriangle, 
      color: '#ef4444', 
      bg: 'rgba(239, 68, 68, 0.1)',
      tab: 'products'
    },
    { 
      title: 'Expiring Soon', 
      value: metrics.expiredProducts, 
      desc: 'Expires within 30 days',
      icon: Calendar, 
      color: '#f97316', 
      bg: 'rgba(249, 115, 22, 0.1)',
      tab: 'expiry'
    },
    { 
      title: "Today's Sales", 
      value: `$${metrics.todaySales.toFixed(2)}`, 
      desc: 'Total revenue logged today',
      icon: DollarSign, 
      color: '#10b981', 
      bg: 'rgba(16, 185, 129, 0.1)',
      tab: 'reports'
    },
    { 
      title: 'Monthly Sales', 
      value: `$${metrics.monthlySales.toFixed(2)}`, 
      desc: 'Total sales this month',
      icon: TrendingUp, 
      color: '#06b6d4', 
      bg: 'rgba(6, 182, 212, 0.1)',
      tab: 'reports'
    },
    { 
      title: 'Pending Payments', 
      value: `$${metrics.pendingPayments.toFixed(2)}`, 
      desc: 'Awaiting credit collection',
      icon: Clock, 
      color: '#fb923c', 
      bg: 'rgba(251, 146, 60, 0.1)',
      tab: 'payments'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Metrics Row */}
      <div className="dashboard-grid">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="glass-card metric-card" 
              onClick={() => setCurrentTab(stat.tab)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.title}
                </span>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0 0.25rem 0' }}>
                  {stat.value}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>{stat.desc}</p>
              </div>
              <div className="metric-icon-wrapper" style={{ backgroundColor: stat.bg, color: stat.color }}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Details Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
        {/* Sales Chart (SVG representation) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Monthly Sales Performance
          </h3>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 1rem 1rem 1rem', position: 'relative' }}>
            {/* Grid background lines */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: '25%', borderTop: '1px dashed rgba(255,255,255,0.03)' }}></div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed rgba(255,255,255,0.03)' }}></div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '75%', borderTop: '1px dashed rgba(255,255,255,0.03)' }}></div>

            {chartData.map((d, index) => {
              const barHeight = d.sales > 0 ? (d.sales / maxSales) * 220 : 5;
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${100 / chartData.length}%`, zIndex: 1 }}>
                  {/* Bar value tooltip */}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    ${d.sales.toFixed(0)}
                  </span>
                  
                  {/* Visual Bar */}
                  <div 
                    style={{ 
                      width: '36px', 
                      height: `${barHeight}px`, 
                      background: 'linear-gradient(to top, var(--primary) 0%, var(--accent) 100%)', 
                      borderRadius: '6px 6px 0 0',
                      boxShadow: '0 0 15px rgba(139, 92, 246, 0.25)',
                      transition: 'all 0.4s ease',
                    }}
                  />
                  
                  {/* X Axis Label */}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)', marginTop: '0.75rem', fontWeight: 500 }}>
                    {d.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Operations and Activity Info */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: 'var(--secondary)' }} /> Quick Management
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {/* Quick links to billing */}
            <div 
              onClick={() => setCurrentTab('billing')}
              className="glass-card" 
              style={{ padding: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'rgba(16, 185, 129, 0.02)' }}
            >
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>Generate New Sale Bill</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Checkout products and generate invoices</p>
              </div>
              <ArrowRight size={18} style={{ color: '#34d399' }} />
            </div>

            <div 
              onClick={() => setCurrentTab('purchases')}
              className="glass-card" 
              style={{ padding: '1rem', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'rgba(139, 92, 246, 0.02)' }}
            >
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#a78bfa' }}>Receive Inventory Stock</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Add new incoming purchase quantities</p>
              </div>
              <ArrowRight size={18} style={{ color: '#a78bfa' }} />
            </div>

            {/* Quick helper note */}
            <div className="glass-card" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(255,255,255,0.01)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>System Status</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                All transactions, billing invoices, and stock registers are stored locally in SQLite database. You can perform backups or restore tables in the **Reports** tab.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Recent Invoices</h3>
        
        {recentTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No sales recorded yet. Use the **Billing POS** tab to create bills.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Customer Name</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Payment Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: 600, color: 'white' }}>{tx.bill_number}</td>
                    <td>{tx.customer_name}</td>
                    <td>{tx.sale_date}</td>
                    <td>${tx.total_amount.toFixed(2)}</td>
                    <td>{tx.payment_method}</td>
                    <td>
                      <span className={`badge ${tx.payment_status === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                        {tx.payment_status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => setCurrentTab('payments')} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
