import React, { useState, useEffect } from 'react';
import { Layers, Plus, Minus, Search, Trash2 } from 'lucide-react';

function Stock() {
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [changeType, setChangeType] = useState('add'); // 'add' or 'remove_damaged'
  const [qtyChange, setQtyChange] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchStockData = async () => {
    try {
      const historyRes = await fetch('/api/stock/history');
      const productsRes = await fetch('/api/products');

      if (historyRes.ok && productsRes.ok) {
        const historyJson = await historyRes.json();
        const productsJson = await productsRes.json();

        setHistory(historyJson);
        setProducts(productsJson);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load stock data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedProductId) {
      setFormError('Please select a product');
      return;
    }

    const payload = {
      product_id: parseInt(selectedProductId, 10),
      change_type: changeType,
      quantity_change: parseInt(qtyChange, 10),
      notes
    };

    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFormSuccess('Stock adjusted successfully!');
        setQtyChange('');
        setNotes('');
        fetchStockData();
        setTimeout(() => setFormSuccess(''), 2000);
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to adjust stock');
      }
    } catch (err) {
      setFormError('Connection error to offline database');
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = (filteredItems) => {
    const filteredIds = filteredItems.map(item => item.id);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !filteredIds.includes(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedIds, ...filteredIds]));
      setSelectedIds(newSelected);
    }
  };

  const handleDeleteSpecific = async (id) => {
    if (!window.confirm('Are you sure you want to delete this stock history log?')) return;
    try {
      const res = await fetch(`/api/stock/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(history.filter(h => h.id !== id));
        setSelectedIds(selectedIds.filter(item => item !== id));
      } else {
        alert('Failed to delete stock history entry');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected stock history logs?`)) return;
    try {
      const res = await fetch('/api/stock/history/delete-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setHistory(history.filter(h => !selectedIds.includes(h.id)));
        setSelectedIds([]);
      } else {
        alert('Failed to delete selected entries');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredHistory = history.filter(h => 
    h.product_name.toLowerCase().includes(search.toLowerCase()) ||
    h.product_brand.toLowerCase().includes(search.toLowerCase()) ||
    (h.notes && h.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="grid-split-layout">
      
      {/* Manual Stock Adjustments Card */}
      <div className="glass-card" style={{ alignSelf: 'flex-start' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} style={{ color: 'var(--primary)' }} /> Log Stock Adjustment
        </h3>

        <form onSubmit={handleAdjustStock}>
          
          <div className="form-group">
            <label>Select Product</label>
            <select 
              className="glass-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
            >
              <option value="">-- Choose Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand}) [Batch: {p.batch_number}] (Avail: {p.quantity})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Adjustment Type</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none', color: 'white' }}>
                <input 
                  type="radio" 
                  name="adjust_type" 
                  value="add" 
                  checked={changeType === 'add'} 
                  onChange={() => setChangeType('add')} 
                />
                <Plus size={14} style={{ color: 'var(--secondary)' }} /> Add Stock
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none', color: 'white' }}>
                <input 
                  type="radio" 
                  name="adjust_type" 
                  value="remove_damaged" 
                  checked={changeType === 'remove_damaged'} 
                  onChange={() => setChangeType('remove_damaged')} 
                />
                <Minus size={14} style={{ color: 'var(--danger)' }} /> Remove Damaged
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Quantity Change</label>
            <input 
              type="number" 
              className="glass-input" 
              placeholder="e.g. 5" 
              value={qtyChange}
              onChange={(e) => setQtyChange(e.target.value)}
              required 
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Notes / Reason</label>
            <textarea 
              className="glass-input" 
              placeholder="e.g. Damaged during shipment, promotional stock write-in" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          {formError && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{formError}</p>
          )}
          {formSuccess && (
            <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{formSuccess}</p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Log Adjustment
          </button>
        </form>
      </div>

      {/* Stock Ledger History Card */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Stock History Ledger</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {selectedIds.length > 0 && (
              <button 
                className="btn btn-danger"
                onClick={handleDeleteMultiple}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Trash2 size={14} /> Delete Selected ({selectedIds.length})
              </button>
            )}
            
            <div style={{ position: 'relative', width: '200px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }}>
                <Search size={16} />
              </span>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Search ledger..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.2rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading history ledger...</div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No stock adjustments recorded in database.
          </div>
        ) : (
          <div className="table-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '480px' }}>
            <table className="custom-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', paddingLeft: '0.75rem' }}>
                    <input 
                      type="checkbox"
                      checked={filteredHistory.length > 0 && filteredHistory.every(h => selectedIds.includes(h.id))}
                      onChange={() => handleSelectAll(filteredHistory)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>New Quantity</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right', paddingRight: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h) => {
                  let badgeClass = '';
                  let prefix = '';
                  if (h.change_type === 'add' || h.change_type === 'purchase') {
                    badgeClass = 'badge-paid'; // Greenish
                    prefix = '+';
                  } else {
                    badgeClass = 'badge-pending'; // Orangish/Reddish
                    prefix = '';
                  }

                  return (
                    <tr key={h.id} className={selectedIds.includes(h.id) ? 'row-selected' : ''}>
                      <td style={{ paddingLeft: '0.75rem' }}>
                        <input 
                          type="checkbox"
                          checked={selectedIds.includes(h.id)}
                          onChange={() => handleToggleSelect(h.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td>{h.date}</td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: 'white' }}>{h.product_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>Batch: {h.batch_number}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                          {h.change_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: prefix === '+' ? '#34d399' : '#f87171' }}>
                        {prefix}{h.quantity_change}
                      </td>
                      <td style={{ fontWeight: 600 }}>{h.new_quantity}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.notes}>
                        {h.notes}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '0.75rem' }}>
                        <button 
                          onClick={() => handleDeleteSpecific(h.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', padding: '0.25rem', borderRadius: '4px' }}
                          title="Delete Log"
                          className="btn-action-delete"
                        >
                          <Trash2 size={14} />
                        </button>
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

export default Stock;
