import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Trash2, Plus, Minus, Printer, CheckCircle, X } from 'lucide-react';
import confetti from 'canvas-confetti';

function Billing({ onRefreshNotif }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Cart & Customer states
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('Paid');

  // Completed Invoice (Print Modal state)
  const [invoice, setInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [billingError, setBillingError] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading products for billing:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddToCart = (product) => {
    if (product.quantity <= 0) {
      alert('Product is out of stock!');
      return;
    }

    const existingIndex = cart.findIndex(item => item.product_id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.quantity) {
        alert(`Cannot add more. Only ${product.quantity} units are available in stock.`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        brand: product.brand,
        batch_number: product.batch_number,
        selling_price: product.selling_price,
        purchase_price: product.purchase_price,
        available_qty: product.quantity,
        quantity: 1
      }]);
    }
  };

  const handleUpdateQty = (index, delta) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      updatedCart.splice(index, 1);
    } else if (newQty > item.available_qty) {
      alert(`Only ${item.available_qty} units available in stock.`);
      return;
    } else {
      item.quantity = newQty;
    }
    setCart(updatedCart);
  };

  const handleRemoveFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  const discountVal = parseFloat(discount) || 0;
  const totalAmount = Math.max(0, subtotal - discountVal);

  // Submit sale
  const handleGenerateBill = async (e) => {
    e.preventDefault();
    setBillingError('');

    if (cart.length === 0) {
      setBillingError('Cart is empty. Select products first.');
      return;
    }

    const payload = {
      customer_name: customerName || 'Walk-in Customer',
      customer_mobile: customerMobile || '0000000000',
      discount: discountVal,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        selling_price: item.selling_price,
        purchase_price: item.purchase_price
      }))
    };

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        // Load details for printable preview
        const detailRes = await fetch(`/api/sales/${result.sale_id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setInvoice(detailData);
          setIsPrintModalOpen(true);
          
          // Celebrate!
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
        
        // Reset POS fields
        setCart([]);
        setCustomerName('');
        setCustomerMobile('');
        setDiscount('0');
        setPaymentMethod('Cash');
        setPaymentStatus('Paid');
        fetchProducts(); // Refresh stocks
        onRefreshNotif();
      } else {
        const errData = await res.json();
        setBillingError(errData.error || 'Checkout process failed.');
      }
    } catch (err) {
      setBillingError('Connection error to database server.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Search filtered supplement stock
  const searchedProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="billing-grid">
      
      {/* Left side: Product Search Catalog */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '550px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Choose Supplements</h3>
          
          {/* Search bar */}
          <div style={{ position: 'relative', width: '220px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }}>
              <Search size={16} />
            </span>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Search catalog..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.2rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem', width: '100%' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading products...</div>
        ) : searchedProducts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No products in stock.</div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', paddingRight: '0.25rem' }}>
            {searchedProducts.map(p => {
              const isOutOfStock = p.quantity <= 0;
              const isLowStock = p.quantity <= p.min_stock_level;
              return (
                <div 
                  key={p.id}
                  onClick={() => !isOutOfStock && handleAddToCart(p)}
                  style={{ 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '12px', 
                    padding: '1rem', 
                    background: isOutOfStock ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.01)',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isOutOfStock ? 0.5 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  className="catalog-item-hover"
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {p.brand}
                    </span>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0.15rem 0 0.5rem 0', color: 'white' }}>{p.name}</h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Batch: <code style={{ color: 'var(--accent)' }}>{p.batch_number}</code>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                        ₹{p.selling_price.toFixed(2)}
                      </span>
                    </div>
                    <span 
                      style={{ fontSize: '0.7rem', fontWeight: 700, color: isOutOfStock ? 'var(--danger)' : isLowStock ? 'var(--warning)' : 'var(--text-muted)' }}
                    >
                      {isOutOfStock ? 'Out of Stock' : `${p.quantity} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right side: Shopping Cart & Billing Form */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingCart size={18} style={{ color: 'var(--primary)' }} /> Customer Cart
        </h3>

        {/* Customer fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Customer Name</label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="e.g. John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Mobile Number</label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="e.g. 9876543210"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)} 
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div style={{ flex: 1, borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)', padding: '1rem 0', margin: '0 0 1.25rem 0' }}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '0.9rem' }}>
              Add supplements from the left panel.
            </div>
          ) : (
            <div className="cart-items-container">
              {cart.map((item, idx) => (
                <div key={idx} className="cart-item">
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{item.name}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>Batch: {item.batch_number}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 1rem' }}>
                    <button 
                      type="button" 
                      onClick={() => handleUpdateQty(idx, -1)}
                      style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '4px', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, width: '20px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => handleUpdateQty(idx, 1)}
                      style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '4px', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '60px', display: 'inline-block' }}>
                      ₹{(item.selling_price * item.quantity).toFixed(2)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveFromCart(idx)}
                      style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <span>Discount Amount (₹)</span>
            <input 
              type="number" 
              className="glass-input" 
              style={{ width: '80px', textAlign: 'right', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} 
              value={discount} 
              onChange={(e) => setDiscount(e.target.value)}
              min="0"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'white', borderTop: '1px dashed var(--border-glass)', paddingTop: '0.75rem' }}>
            <span>Grand Total</span>
            <span style={{ color: 'var(--secondary)' }}>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Configuration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Payment Method</label>
            <select 
              className="glass-select" 
              value={paymentMethod} 
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Payment Status</label>
            <select 
              className="glass-select" 
              value={paymentStatus} 
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="Paid">Paid (Full)</option>
              <option value="Pending">Pending (Credit Sale)</option>
            </select>
          </div>
        </div>

        {billingError && (
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
            {billingError}
          </p>
        )}

        <button 
          onClick={handleGenerateBill} 
          className="btn btn-secondary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
          disabled={cart.length === 0}
        >
          Checkout & Print Receipt
        </button>
      </div>

      {/* PRINT MODAL: HTML Receipt Printer */}
      {isPrintModalOpen && invoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', backgroundColor: 'white', color: 'black' }}>
            
            {/* Modal actions, hidden during native printing */}
            <div className="modal-header no-print" style={{ borderBottom: '1px solid #ddd', padding: '1rem' }}>
              <h3 style={{ color: 'black' }}>Invoice Preview</h3>
              <button 
                onClick={() => setIsPrintModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 0 }}>
              {/* Receipt Area */}
              <div id="print-area" className="receipt-container">
                <div className="receipt-header">
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>GYM SUPPLEMENT STORE</h2>
                  <p style={{ fontSize: '0.75rem', margin: '4px 0 0 0', color: '#555' }}>SINGLE OWNER LOCAL SYSTEM</p>
                  <p style={{ fontSize: '0.7rem', color: '#555' }}>Mob: {invoice.sale.customer_mobile}</p>
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-row">
                  <span>Bill No:</span>
                  <span style={{ fontWeight: 'bold' }}>{invoice.sale.bill_number}</span>
                </div>
                <div className="receipt-row">
                  <span>Date:</span>
                  <span>{invoice.sale.sale_date}</span>
                </div>
                <div className="receipt-row">
                  <span>Customer:</span>
                  <span>{invoice.sale.customer_name}</span>
                </div>

                <div className="receipt-divider"></div>

                {/* Items headers */}
                <div className="receipt-row" style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                  <span style={{ flex: 2 }}>Item</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>Price</span>
                </div>

                {invoice.items.map((item, index) => (
                  <div key={index} style={{ margin: '4px 0' }}>
                    <div className="receipt-row" style={{ fontSize: '0.8rem' }}>
                      <span style={{ flex: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.product_name}
                      </span>
                      <span style={{ flex: 1, textAlign: 'center' }}>{item.quantity}</span>
                      <span style={{ flex: 1, textAlign: 'right' }}>₹{(item.selling_price * item.quantity).toFixed(2)}</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#666', display: 'block' }}>
                      Batch: {item.batch_number}
                    </span>
                  </div>
                ))}

                <div className="receipt-divider"></div>

                <div className="receipt-row">
                  <span>Subtotal:</span>
                  <span>₹{(invoice.sale.total_amount + invoice.sale.discount).toFixed(2)}</span>
                </div>
                <div className="receipt-row">
                  <span>Discount:</span>
                  <span>-₹{invoice.sale.discount.toFixed(2)}</span>
                </div>
                <div className="receipt-row" style={{ fontWeight: 'bold', fontSize: '0.95rem', marginTop: '4px' }}>
                  <span>Grand Total:</span>
                  <span>₹{invoice.sale.total_amount.toFixed(2)}</span>
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-row">
                  <span>Payment Type:</span>
                  <span>{invoice.sale.payment_method}</span>
                </div>
                <div className="receipt-row">
                  <span>Status:</span>
                  <span style={{ fontWeight: 'bold' }}>{invoice.sale.payment_status}</span>
                </div>

                <div className="receipt-divider" style={{ marginTop: '15px' }}></div>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', margin: '8px 0 0 0', fontWeight: 'bold' }}>
                  THANK YOU FOR YOUR PATRONAGE!
                </p>
              </div>
            </div>

            {/* Modal print buttons, hidden during printing */}
            <div className="modal-footer no-print" style={{ borderTop: '1px solid #ddd', padding: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setIsPrintModalOpen(false)}
                style={{ color: '#333', borderColor: '#ccc' }}
              >
                Close
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handlePrint}
                style={{ backgroundColor: 'black', color: 'white' }}
              >
                <Printer size={16} /> Print Receipt
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Billing;
