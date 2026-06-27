import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Calendar, Trash2 } from 'lucide-react';

function Purchases({ onRefreshNotif }) {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Form states
  const [billNumber, setBillNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchData = async () => {
    try {
      const purRes = await fetch('/api/purchases');
      const prodRes = await fetch('/api/products');
      if (purRes.ok && prodRes.ok) {
        const purJson = await purRes.json();
        const prodJson = await prodRes.json();
        setPurchases(purJson);
        setProducts(prodJson);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load purchases:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedProductId) {
      setFormError('Please select a product');
      return;
    }

    const payload = {
      purchase_bill_number: billNumber,
      purchase_date: purchaseDate,
      supplier_name: supplierName,
      product_id: parseInt(selectedProductId, 10),
      quantity: parseInt(quantity, 10),
      purchase_cost: parseFloat(purchaseCost)
    };

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFormSuccess('Purchase invoice logged and stock updated!');
        setBillNumber('');
        setSupplierName('');
        setQuantity('');
        setPurchaseCost('');
        fetchData();
        onRefreshNotif();
        setTimeout(() => setFormSuccess(''), 2000);
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to record purchase');
      }
    } catch (err) {
      setFormError('Could not connect to offline database');
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
    if (!window.confirm('Are you sure you want to delete this purchase order record?')) return;
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPurchases(purchases.filter(p => p.id !== id));
        setSelectedIds(selectedIds.filter(item => item !== id));
      } else {
        alert('Failed to delete purchase record');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected purchase records?`)) return;
    try {
      const res = await fetch('/api/purchases/delete-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setPurchases(purchases.filter(p => !selectedIds.includes(p.id)));
        setSelectedIds([]);
      } else {
        alert('Failed to delete selected entries');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.purchase_bill_number.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid-split-layout">
      
      {/* Add New Purchase Form */}
      <div className="glass-card" style={{ alignSelf: 'flex-start' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={18} style={{ color: 'var(--primary)' }} /> Log Supplier Purchase
        </h3>

        <form onSubmit={handleAddPurchase}>
          <div className="form-group">
            <label>Bill/Invoice Number</label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="e.g. SUP-98172" 
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label>Purchase Date</label>
            <input 
              type="date" 
              className="glass-input" 
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label>Supplier Name</label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="e.g. Muscle-Tech Distributors" 
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label>Select Product Received</label>
            <select 
              className="glass-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
            >
              <option value="">-- Choose Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand}) [Batch: {p.batch_number}]
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantity Purchased</label>
            <input 
              type="number" 
              className="glass-input" 
              placeholder="e.g. 50" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required 
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Total Purchase Cost (₹)</label>
            <input 
              type="number" 
              step="0.01" 
              className="glass-input" 
              placeholder="e.g. 750.00" 
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
              required 
              min="0.01"
            />
          </div>

          {formError && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{formError}</p>
          )}
          {formSuccess && (
            <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{formSuccess}</p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Log Purchase & Update Stock
          </button>
        </form>
      </div>

      {/* Purchase History Ledger */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Purchase Orders Ledger</h3>
          
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
                placeholder="Search purchases..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.2rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading purchase history...</div>
        ) : filteredPurchases.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No purchase records found in database.
          </div>
        ) : (
          <div className="table-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '480px' }}>
            <table className="custom-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', paddingLeft: '0.75rem' }}>
                    <input 
                      type="checkbox"
                      checked={filteredPurchases.length > 0 && filteredPurchases.every(p => selectedIds.includes(p.id))}
                      onChange={() => handleSelectAll(filteredPurchases)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Bill Number</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Total Cost</th>
                  <th style={{ textAlign: 'right', paddingRight: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className={selectedIds.includes(p.id) ? 'row-selected' : ''}>
                    <td style={{ paddingLeft: '0.75rem' }}>
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => handleToggleSelect(p.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600, color: 'white' }}>{p.purchase_bill_number}</td>
                    <td>{p.purchase_date}</td>
                    <td>{p.supplier_name}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>Batch: {p.batch_number}</div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{p.quantity}</td>
                    <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                      ₹{p.purchase_cost.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '0.75rem' }}>
                      <button 
                        type="button"
                        onClick={() => handleDeleteSpecific(p.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', padding: '0.25rem', borderRadius: '4px' }}
                        title="Delete Purchase"
                        className="btn-action-delete"
                      >
                        <Trash2 size={14} />
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

export default Purchases;
