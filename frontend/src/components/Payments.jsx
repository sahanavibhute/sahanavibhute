import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Search, Plus, CheckCircle, Clock } from 'lucide-react';

function Payments({ onRefreshNotif }) {
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewTab, setViewTab] = useState('pending'); // 'pending' or 'paid' or 'history'

  // Payment record modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [modalError, setModalError] = useState('');

  const fetchPaymentData = async () => {
    try {
      const salesRes = await fetch('/api/sales');
      const payRes = await fetch('/api/payments');

      if (salesRes.ok && payRes.ok) {
        const salesData = await salesRes.json();
        const paymentsData = await payRes.json();

        // Calculate balances dynamically per sale
        const salesWithBalances = await Promise.all(salesData.map(async (sale) => {
          const detailRes = await fetch(`/api/sales/${sale.id}`);
          if (detailRes.ok) {
            const details = await detailRes.json();
            const totalPaid = details.payments.reduce((sum, p) => sum + p.amount_paid, 0);
            return {
              ...sale,
              paid_amount: totalPaid,
              balance_amount: Math.max(0, sale.total_amount - totalPaid)
            };
          }
          return { ...sale, paid_amount: 0, balance_amount: sale.total_amount };
        }));

        setSales(salesWithBalances);
        setPayments(paymentsData);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch payments tracker data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const openPaymentModal = (sale) => {
    setSelectedSale(sale);
    setAmountPaid(sale.balance_amount.toFixed(2));
    setPayMethod('Cash');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setModalError('');

    const paidVal = parseFloat(amountPaid);
    if (isNaN(paidVal) || paidVal <= 0) {
      setModalError('Please enter a valid payment amount');
      return;
    }

    if (paidVal > selectedSale.balance_amount + 0.01) {
      setModalError(`Amount exceeds the pending balance of ₹${selectedSale.balance_amount.toFixed(2)}`);
      return;
    }

    const payload = {
      sale_id: selectedSale.id,
      amount_paid: paidVal,
      payment_method: payMethod
    };

    try {
      const res = await fetch('/api/payments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchPaymentData();
        onRefreshNotif();
      } else {
        const errJson = await res.json();
        setModalError(errJson.error || 'Failed to record payment');
      }
    } catch (err) {
      setModalError('Could not connect to offline server');
    }
  };

  // Filters
  const filteredSales = sales.filter(s => {
    const matchesSearch = s.bill_number.toLowerCase().includes(search.toLowerCase()) ||
                          s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
                          s.customer_mobile.toLowerCase().includes(search.toLowerCase());
    
    if (viewTab === 'pending') {
      return matchesSearch && s.payment_status === 'Pending';
    } else if (viewTab === 'paid') {
      return matchesSearch && s.payment_status === 'Paid';
    }
    return false;
  });

  const filteredHistory = payments.filter(p =>
    p.bill_number.toLowerCase().includes(search.toLowerCase()) ||
    p.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
      
      {/* Top Filter and Tab Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
          <button 
            className={`btn ${viewTab === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewTab('pending')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Clock size={14} /> Pending Credit Bills
          </button>
          <button 
            className={`btn ${viewTab === 'paid' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewTab('paid')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <CheckCircle size={14} /> Paid Invoices
          </button>
          <button 
            className={`btn ${viewTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewTab('history')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <CreditCard size={14} /> Payment Receipts Log
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '240px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }}>
            <Search size={16} />
          </span>
          <input 
            type="text" 
            className="glass-input" 
            placeholder="Search bills, customer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.85rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Main content tables */}
      <div className="glass-card" style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading payments directory...</div>
        ) : viewTab !== 'history' ? (
          filteredSales.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No bills found in this section.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Bill Number</th>
                    <th>Date</th>
                    <th>Customer details</th>
                    <th>Total Invoice</th>
                    <th>Total Paid</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                    {viewTab === 'pending' && <th style={{ textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td style={{ fontWeight: 600, color: 'white' }}>{sale.bill_number}</td>
                      <td>{sale.sale_date}</td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{sale.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mob: {sale.customer_mobile}</div>
                        </div>
                      </td>
                      <td>₹{sale.total_amount.toFixed(2)}</td>
                      <td>₹{sale.paid_amount.toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: sale.balance_amount > 0 ? 'var(--warning)' : 'var(--secondary)' }}>
                        ₹{sale.balance_amount.toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${sale.payment_status === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                          {sale.payment_status}
                        </span>
                      </td>
                      {viewTab === 'pending' && (
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => openPaymentModal(sale)}
                          >
                            Collect Cash
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Payment Receipts History Table */
          filteredHistory.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No payments collected yet.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Bill Number</th>
                    <th>Payment Date</th>
                    <th>Customer</th>
                    <th>Payment Type</th>
                    <th>Amount Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((pay) => (
                    <tr key={pay.id}>
                      <td><code>TRX-{String(pay.id).padStart(5, '0')}</code></td>
                      <td style={{ fontWeight: 600, color: 'white' }}>{pay.bill_number}</td>
                      <td>{pay.payment_date}</td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{pay.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mob: {pay.customer_mobile}</div>
                        </div>
                      </td>
                      <td>{pay.payment_method}</td>
                      <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                        +₹{pay.amount_paid.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* FORM MODAL: Record Pending Payment */}
      {isModalOpen && selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Collect Pending Payment</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div className="cart-fields-grid" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>BILL NUMBER</span>
                    <h4 style={{ color: 'white' }}>{selectedSale.bill_number}</h4>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>CUSTOMER NAME</span>
                    <h4 style={{ color: 'white' }}>{selectedSale.customer_name}</h4>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>INVOICE TOTAL</span>
                    <h4 style={{ color: 'white' }}>₹{selectedSale.total_amount.toFixed(2)}</h4>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>PENDING BALANCE</span>
                    <h4 style={{ color: 'var(--warning)' }}>₹{selectedSale.balance_amount.toFixed(2)}</h4>
                  </div>
                </div>

                <div className="form-group">
                  <label>Amount Collected (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="glass-input" 
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    required 
                    max={selectedSale.balance_amount}
                  />
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <select 
                    className="glass-select" 
                    value={payMethod} 
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                {modalError && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '1rem' }}>{modalError}</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Payments;
