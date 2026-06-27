import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  ShoppingBag, 
  Receipt, 
  CreditCard, 
  AlertTriangle, 
  BarChart3, 
  Lock, 
  LogOut, 
  Bell, 
  X,
  Settings,
  Menu
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Stock from './components/Stock';
import Purchases from './components/Purchases';
import Billing from './components/Billing';
import Payments from './components/Payments';
import Expiry from './components/Expiry';
import Reports from './components/Reports';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Auth Form states
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  // Change Password state
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [changeNewPass, setChangeNewPass] = useState('');
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');

  // Security configuration Modal state
  const [isSecurityConfigOpen, setIsSecurityConfigOpen] = useState(false);
  const [configPass, setConfigPass] = useState('');
  const [configQuestion, setConfigQuestion] = useState('What is your favorite sport?');
  const [configAnswer, setConfigAnswer] = useState('');
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Poll notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Could not connect to offline server');
    }
  };

  // Fetch Security Question for Recovery
  const handleStartRecovery = async () => {
    setIsRecovering(true);
    setRecoveryError('');
    setRecoverySuccess('');
    try {
      const res = await fetch('/api/auth/security-question');
      if (res.ok) {
        const data = await res.json();
        setSecurityQuestion(data.security_question);
      } else {
        setRecoveryError('Failed to fetch recovery question');
      }
    } catch (err) {
      setRecoveryError('Could not connect to server');
    }
  };

  // Submit Password Recovery
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');
    try {
      const res = await fetch('/api/auth/verify-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: recoveryAnswer, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoverySuccess('Password reset successfully. You can now login.');
        setTimeout(() => {
          setIsRecovering(false);
          setRecoveryAnswer('');
          setNewPassword('');
          setRecoverySuccess('');
        }, 2000);
      } else {
        setRecoveryError(data.error || 'Failed to verify answer');
      }
    } catch (err) {
      setRecoveryError('Could not connect to server');
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: changeNewPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChangePassSuccess('Password changed successfully!');
        setOldPass('');
        setChangeNewPass('');
        setTimeout(() => {
          setIsChangePassOpen(false);
          setChangePassSuccess('');
        }, 1500);
      } else {
        setChangePassError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setChangePassError('Could not connect to server');
    }
  };

  // Handle Security Config update
  const handleUpdateSecurityConfig = async (e) => {
    e.preventDefault();
    setConfigError('');
    setConfigSuccess('');
    try {
      const res = await fetch('/api/auth/update-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: configPass,
          securityQuestion: configQuestion,
          securityAnswer: configAnswer
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigSuccess('Security question and answer updated!');
        setConfigPass('');
        setConfigAnswer('');
        setTimeout(() => {
          setIsSecurityConfigOpen(false);
          setConfigSuccess('');
        }, 1500);
      } else {
        setConfigError(data.error || 'Failed to update configuration');
      }
    } catch (err) {
      setConfigError('Could not connect to server');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentTab('dashboard');
  };

  // Nav menu items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'stock', label: 'Stock History', icon: Layers },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'billing', label: 'Billing POS', icon: Receipt },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'expiry', label: 'Expiry Tracker', icon: AlertTriangle },
    { id: 'reports', label: 'Reports & Backups', icon: BarChart3 }
  ];

  // Render correct component based on active tab
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard setCurrentTab={setCurrentTab} onRefreshNotif={fetchNotifications} />;
      case 'products':
        return <Products onRefreshNotif={fetchNotifications} />;
      case 'stock':
        return <Stock />;
      case 'purchases':
        return <Purchases onRefreshNotif={fetchNotifications} />;
      case 'billing':
        return <Billing onRefreshNotif={fetchNotifications} />;
      case 'payments':
        return <Payments onRefreshNotif={fetchNotifications} />;
      case 'expiry':
        return <Expiry />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard setCurrentTab={setCurrentTab} onRefreshNotif={fetchNotifications} />;
    }
  };

  // Formatted alert list counts
  const unreadCount = notifications.length;

  if (!isAuthenticated) {
    return (
      <div className="modal-overlay" style={{ background: '#09090b', height: '100vh', width: '100vw' }}>
        <div className="glow-bg"></div>
        <div className="glow-bg-2"></div>
        
        {!isRecovering ? (
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                SUPPLEMENT POS
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Offline Inventory & Billing System</p>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Admin Password</label>
                <input 
                  type="password" 
                  className="glass-input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>

              {loginError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                  {loginError}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                <Lock size={16} /> Login
              </button>

              <div style={{ textAlign: 'center' }}>
                <button 
                  type="button" 
                  onClick={handleStartRecovery}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Password Recovery</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Answer security question to reset</p>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label style={{ textTransform: 'none', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {securityQuestion || 'Loading security question...'}
                </label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Your answer" 
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  className="glass-input" 
                  placeholder="Min 6 characters" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                />
              </div>

              {recoveryError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {recoveryError}
                </div>
              )}

              {recoverySuccess && (
                <div style={{ color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {recoverySuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  style={{ flex: 1 }}
                  onClick={() => setIsRecovering(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="glow-bg"></div>
      <div className="glow-bg-2"></div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ position: 'relative' }}>
          <div className="sidebar-logo">
            <Package size={22} style={{ color: 'var(--primary)' }} />
            <span>Supplement OS</span>
          </div>
          <button 
            className="sidebar-close-btn"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
 
        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`sidebar-item ${currentTab === item.id ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
 
        <div className="sidebar-footer">
          <button 
            onClick={() => {
              setIsSecurityConfigOpen(true);
              setIsSidebarOpen(false);
            }}
            className="sidebar-item" 
            style={{ width: '100%', border: 'none', background: 'none' }}
          >
            <Settings size={18} />
            <span>Recovery Setup</span>
          </button>
          
          <button 
            onClick={() => {
              setIsChangePassOpen(true);
              setIsSidebarOpen(false);
            }}
            className="sidebar-item" 
            style={{ width: '100%', border: 'none', background: 'none' }}
          >
            <Lock size={18} />
            <span>Change Password</span>
          </button>
          
          <button 
            onClick={() => {
              handleLogout();
              setIsSidebarOpen(false);
            }}
            className="sidebar-item" 
            style={{ width: '100%', border: 'none', background: 'none', color: 'var(--danger)' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
 
      {/* Main Panel */}
      <main className="main-content">
        {/* Top Header */}
        <header className="main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, textTransform: 'capitalize' }}>
                {currentTab.replace('-', ' ')}
              </h1>
              <p className="header-subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gym Supplement Inventory & Billing Manager</p>
            </div>
          </div>
 
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Alerts Bell Button */}
            <button 
              onClick={() => setIsNotifOpen(true)} 
              style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: 'all 0.2s' }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--danger)', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '50%', minWidth: '18px', height: '18px', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Inner Component */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderContent()}
        </div>
      </main>

      {/* Notifications Drawer */}
      <div className={`notifications-panel ${isNotifOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} style={{ color: 'var(--primary)' }} /> Store Alerts
          </h3>
          <button 
            onClick={() => setIsNotifOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="notification-list">
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dark)', padding: '2rem 0', fontSize: '0.9rem' }}>
              No critical alerts. Everything is running smoothly!
            </div>
          ) : (
            notifications.map((notif, idx) => (
              <div 
                key={idx} 
                className={`notification-item ${notif.type}`}
                onClick={() => {
                  setIsNotifOpen(false);
                  if (notif.type === 'low_stock') setCurrentTab('products');
                  if (notif.type === 'expiry') setCurrentTab('expiry');
                  if (notif.type === 'pending_payment') setCurrentTab('payments');
                }}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: notif.type === 'low_stock' ? 'var(--danger)' : notif.type === 'expiry' ? 'var(--warning)' : 'var(--accent)' }}>
                    {notif.type.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{notif.message}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: Change Password */}
      {isChangePassOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button onClick={() => setIsChangePassOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Current Password</label>
                  <input 
                    type="password" 
                    className="glass-input" 
                    value={oldPass} 
                    onChange={(e) => setOldPass(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input 
                    type="password" 
                    className="glass-input" 
                    placeholder="Min 6 characters" 
                    value={changeNewPass} 
                    onChange={(e) => setChangeNewPass(e.target.value)} 
                    required 
                  />
                </div>
                {changePassError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{changePassError}</p>}
                {changePassSuccess && <p style={{ color: 'var(--secondary)', fontSize: '0.85rem' }}>{changePassSuccess}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsChangePassOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Security Config Recovery Setup */}
      {isSecurityConfigOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Recovery Configuration</h3>
              <button onClick={() => setIsSecurityConfigOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateSecurityConfig}>
              <div className="modal-body">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Configure your password recovery question and answer. In case you lose your password, answering this question will allow you to reset it.
                </p>
                <div className="form-group">
                  <label>Choose Recovery Question</label>
                  <select 
                    className="glass-select" 
                    value={configQuestion} 
                    onChange={(e) => setConfigQuestion(e.target.value)}
                    required
                  >
                    <option value="What is your favorite sport?">What is your favorite sport?</option>
                    <option value="What was the name of your first gym?">What was the name of your first gym?</option>
                    <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                    <option value="What was the brand of your first protein shake?">What was the brand of your first protein shake?</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Recovery Answer</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Case-insensitive answer" 
                    value={configAnswer} 
                    onChange={(e) => setConfigAnswer(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <label>Confirm Current Password</label>
                  <input 
                    type="password" 
                    className="glass-input" 
                    placeholder="Enter admin password to save" 
                    value={configPass} 
                    onChange={(e) => setConfigPass(e.target.value)} 
                    required 
                  />
                </div>
                {configError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{configError}</p>}
                {configSuccess && <p style={{ color: 'var(--secondary)', fontSize: '0.85rem' }}>{configSuccess}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsSecurityConfigOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Recovery Setup</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
