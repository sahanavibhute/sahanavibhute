import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';

function Products({ onRefreshNotif }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('5');
  
  const [formError, setFormError] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setIsEdit(false);
    setName('');
    setBrand('');
    setCategory('');
    setBatchNumber('');
    setPurchasePrice('');
    setSellingPrice('');
    setQuantity('');
    setExpiryDate('');
    setMinStockLevel('5');
    setFormError('');
    setIsOpen(true);
  };

  const openEditModal = (p) => {
    setIsEdit(true);
    setCurrentId(p.id);
    setName(p.name);
    setBrand(p.brand);
    setCategory(p.category);
    setBatchNumber(p.batch_number);
    setPurchasePrice(p.purchase_price);
    setSellingPrice(p.selling_price);
    setQuantity(p.quantity);
    setExpiryDate(p.expiry_date);
    setMinStockLevel(p.min_stock_level);
    setFormError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      name,
      brand,
      category,
      batch_number: batchNumber,
      purchase_price: parseFloat(purchasePrice),
      selling_price: parseFloat(sellingPrice),
      quantity: parseInt(quantity, 10),
      expiry_date: expiryDate,
      min_stock_level: parseInt(minStockLevel, 10)
    };

    try {
      const url = isEdit ? `/api/products/${currentId}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsOpen(false);
        fetchProducts();
        onRefreshNotif();
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to save product');
      }
    } catch (err) {
      setFormError('Failed to connect to offline database');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? All stock logs and purchases associated with it will be cleared.')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts();
        onRefreshNotif();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Filter lists
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.brand.toLowerCase().includes(search.toLowerCase()) ||
                          p.batch_number.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
    const matchesBrand = brandFilter ? p.brand === brandFilter : true;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  // Extract unique categories & brands for dropdown filters
  const categories = [...new Set(products.map(p => p.category))];
  const brands = [...new Set(products.map(p => p.brand))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
      
      {/* Top Filter Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', flex: 1 }}>
          
          {/* Search box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }}>
              <Search size={18} />
            </span>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Search by name, brand, batch..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          {/* Category Dropdown */}
          <select 
            className="glass-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="">All Categories</option>
            {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>

          {/* Brand Dropdown */}
          <select 
            className="glass-select"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="">All Brands</option>
            {brands.map((b, i) => <option key={i} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Add Product Button */}
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Main Catalog View */}
      <div className="glass-card" style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No products found matching filters.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Batch No</th>
                  <th>Purchase Cost</th>
                  <th>Selling Price</th>
                  <th>Stock Count</th>
                  <th>Expiry Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isLowStock = p.quantity <= p.min_stock_level;
                  const isExpired = new Date(p.expiry_date) < new Date();
                  return (
                    <tr key={p.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 700, color: 'white' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>{p.brand}</div>
                        </div>
                      </td>
                      <td><span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{p.category}</span></td>
                      <td><code style={{ fontSize: '0.85rem' }}>{p.batch_number}</code></td>
                      <td>${p.purchase_price.toFixed(2)}</td>
                      <td>${p.selling_price.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: isLowStock ? 'var(--danger)' : 'white' }}>
                            {p.quantity} units
                          </span>
                          {isLowStock && (
                            <span title="Low Stock Warning" style={{ color: 'var(--danger)' }}>
                              <AlertTriangle size={14} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: isExpired ? 'var(--danger)' : 'var(--text-main)' }}>
                          {p.expiry_date}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={() => openEditModal(p)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '0.5rem', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDelete(p.id)}>
                            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORM MODAL: Add / Edit Product */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>{isEdit ? 'Edit Product Details' : 'Add New Supplement'}</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Product Name</label>
                  <input type="text" className="glass-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. 100% Gold Standard Whey" />
                </div>

                <div className="form-group">
                  <label>Brand Name</label>
                  <input type="text" className="glass-input" value={brand} onChange={(e) => setBrand(e.target.value)} required placeholder="e.g. Optimum Nutrition" />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input type="text" className="glass-input" value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="e.g. Whey Protein, Creatine" />
                </div>

                <div className="form-group">
                  <label>Batch Number</label>
                  <input type="text" className="glass-input" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required placeholder="e.g. BATCH-ON-002" />
                </div>

                <div className="form-group">
                  <label>Expiry Date</label>
                  <input type="date" className="glass-input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Purchase Price ($)</label>
                  <input type="number" step="0.01" className="glass-input" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required placeholder="Cost to buy" />
                </div>

                <div className="form-group">
                  <label>Selling Price ($)</label>
                  <input type="number" step="0.01" className="glass-input" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required placeholder="Customer retail" />
                </div>

                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" className="glass-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} required placeholder="Initial stock count" disabled={isEdit} />
                  {isEdit && <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>Edit stock changes via 'Stock History' panel.</span>}
                </div>

                <div className="form-group">
                  <label>Minimum Stock Threshold</label>
                  <input type="number" className="glass-input" value={minStockLevel} onChange={(e) => setMinStockLevel(e.target.value)} required placeholder="Low stock alarm level" />
                </div>

                {formError && (
                  <div style={{ gridColumn: 'span 2', color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>
                    {formError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEdit ? 'Save Changes' : 'Add Supplement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
