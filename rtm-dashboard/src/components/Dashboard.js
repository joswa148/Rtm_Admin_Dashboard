import React, { useState } from 'react';
import TrademarkList from './TrademarkList';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('trademarks');

  const handleLogout = () => {
    localStorage.removeItem('rtm_token');
    localStorage.removeItem('rtm_user');
    if (onLogout) onLogout();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a192f', color: '#e6f1ff', fontFamily: 'Outfit, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '260px', 
        background: 'rgba(255,255,255,0.02)', 
        borderRight: '1px solid rgba(255,255,255,0.05)',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '50px' }}>
          <h2 style={{ color: '#c5a059', margin: 0, fontSize: '1.5rem' }}>RTM Admin</h2>
          <p style={{ color: '#8892b0', fontSize: '0.8rem', letterSpacing: '1px' }}>MANAGEMENT PORTAL</p>
        </div>

        <nav style={{ flex: 1 }}>
          <SidebarItem 
            label="Dashboard" 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')} 
          />
          <SidebarItem 
            label="Trademarks" 
            active={activeTab === 'trademarks'} 
            onClick={() => setActiveTab('trademarks')} 
          />
          <SidebarItem 
            label="Clients" 
            active={activeTab === 'clients'} 
            onClick={() => setActiveTab('clients')} 
          />
          <SidebarItem 
            label="Services" 
            active={activeTab === 'services'} 
            onClick={() => setActiveTab('services')} 
          />
        </nav>

        <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600' }}>{user?.full_name}</p>
          <p style={{ margin: '4px 0 12px 0', fontSize: '0.75rem', color: '#8892b0' }}>{user?.role}</p>
          <button 
            onClick={handleLogout}
            style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #ff4b4b', color: '#ff4b4b', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>
            {activeTab.charAt(0) ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1) : 'Overview'}
          </h1>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.9rem' }}>
              Server: <span style={{ color: '#4caf50' }}>Online</span>
            </div>
          </div>
        </header>

        {activeTab === 'overview' && <OverviewView />}
        {activeTab === 'trademarks' && <TrademarkList />}
        {activeTab === 'clients' && <div style={{ color: '#8892b0' }}>Client management coming soon...</div>}
        {activeTab === 'services' && <div style={{ color: '#8892b0' }}>Services management coming soon...</div>}
      </main>
    </div>
  );
};

const SidebarItem = ({ label, active, onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      padding: '12px 16px', 
      borderRadius: '12px', 
      marginBottom: '8px', 
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: active ? 'rgba(197, 160, 89, 0.1)' : 'transparent',
      color: active ? '#c5a059' : '#8892b0',
      fontWeight: active ? '600' : '400'
    }}
  >
    {label}
  </div>
);

const OverviewView = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
    <StatCard title="Active Trademarks" value="342" trend="+12%" />
    <StatCard title="Pending Applications" value="85" trend="+5%" />
    <StatCard title="Renewals Due" value="18" trend="-2%" />
    <StatCard title="Total Revenue" value="$42,500" trend="+8%" />
  </div>
);

const StatCard = ({ title, value, trend }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
    <h3 style={{ margin: '0 0 15px 0', color: '#8892b0', fontSize: '0.9rem', fontWeight: '400' }}>{title}</h3>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
      <span style={{ fontSize: '2rem', fontWeight: '700' }}>{value}</span>
      <span style={{ color: trend.startsWith('+') ? '#4caf50' : '#f44336', fontSize: '0.85rem', marginBottom: '5px' }}>{trend}</span>
    </div>
  </div>
);

export default Dashboard;
