import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Search, ShieldCheck } from 'lucide-react';

function Expiry() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewTab, setViewTab] = useState('all'); // 'all', 'expired', '15days', '30days'

  const fetchExpiryData = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load expiry data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryData();
  }, []);

  const getDaysDiff = (expiryDateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(expiryDateStr);
    expDate.setHours(0,0,0,0);
    const diffMs = expDate.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.brand.toLowerCase().includes(search.toLowerCase()) ||
                          p.batch_number.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    const diffDays = getDaysDiff(p.expiry_date);

    if (viewTab === 'expired') {
      return diffDays <= 0;
    } else if (viewTab === '15days') {
      return diffDays > 0 && diffDays <= 15;
    } else if (viewTab === '30days') {
      return diffDays > 0 && diffDays <= 30;
    } else {
      // Show only warnings/expired in all tab, or all items? Let's show all items that are expired or expiring within 30 days.
      return diffDays <= 30;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
      
      {/* Top Filter Panel */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
          <button 
            className={`btn ${viewTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewTab('all')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Calendar size={14} /> All Expiry Alerts (30 Days)
          </button>
          <button 
            className={`btn ${viewTab === 'expired' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewTab('expired')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: viewTab === 'expired' ? 'white' : 'var(--danger)' }}
          >
            <AlertTriangle size={14} /> Expired Products List
          </button>
          <button 
            className={`btn ${viewTab === '15days' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewTab('15days')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: viewTab === '15days' ? 'white' : 'var(--warning)' }}
          >
            Urgent Expiry (15 Days)
          </button>
          <button 
            className={`btn ${viewTab === '30days' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewTab('30days')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Expiring Within 30 Days
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '220px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }}>
            <Search size={16} />
          </span>
          <input 
            type="text" 
            className="glass-input" 
            placeholder="Search expiring items..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Main Expiry Table */}
      <div className="glass-card" style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading expiry data ledger...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <ShieldCheck size={48} style={{ color: 'var(--secondary)' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
              No expiry warnings in this scope! Your supplements are all good.
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Brand</th>
                  <th>Batch Number</th>
                  <th>Category</th>
                  <th>Quantity in Stock</th>
                  <th>Expiry Date</th>
                  <th>Remaining Days</th>
                  <th>Alarm Level</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const diff = getDaysDiff(p.expiry_date);
                  let statusText = '';
                  let statusStyle = {};
                  let badgeClass = '';

                  if (diff <= 0) {
                    statusText = 'EXPIRED';
                    statusStyle = { color: 'var(--danger)', fontWeight: 700 };
                    badgeClass = 'badge-low-stock';
                  } else if (diff <= 15) {
                    statusText = 'CRITICAL';
                    statusStyle = { color: 'var(--danger)', fontWeight: 700 };
                    badgeClass = 'badge-pending';
                  } else {
                    statusText = 'WARNING';
                    statusStyle = { color: 'var(--warning)', fontWeight: 600 };
                    badgeClass = 'badge-pending';
                  }

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'white' }}>{p.name}</td>
                      <td>{p.brand}</td>
                      <td><code>{p.batch_number}</code></td>
                      <td>{p.category}</td>
                      <td style={{ fontWeight: 700 }}>{p.quantity} units</td>
                      <td>
                        <span style={statusStyle}>{p.expiry_date}</span>
                      </td>
                      <td style={statusStyle}>
                        {diff <= 0 ? `Expired ${Math.abs(diff)} days ago` : `${diff} days left`}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem' }}>
                          {statusText}
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

    </div>
  );
}

export default Expiry;
