import React, { useEffect, useState } from 'react';

const TrademarkList = () => {
  const [trademarks, setTrademarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrademarks();
  }, []);

  const fetchTrademarks = async () => {
    try {
      const token = localStorage.getItem('rtm_token');
      const response = await fetch('http://localhost:5000/api/trademarks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch trademarks');
      const data = await response.json();
      setTrademarks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, trademarkId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Max size is 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const token = localStorage.getItem('rtm_token');
      const response = await fetch(`http://localhost:5000/api/trademarks/${trademarkId}/upload-logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      // Refresh trademarks list
      fetchTrademarks();
    } catch (err) {
      alert('Error uploading logo: ' + err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Registered': return '#4caf50';
      case 'Pending': return '#ff9800';
      case 'Expired': return '#f44336';
      case 'Opposed': return '#e91e63';
      default: return '#8892b0';
    }
  };

  if (loading) return <div style={{ color: '#8892b0' }}>Loading trademarks...</div>;
  if (error) return <div style={{ color: '#ff4b4b' }}>{error}</div>;

  return (
    <div className="trademark-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#c5a059', margin: 0 }}>Active Trademarks</h2>
        <button style={{ padding: '10px 20px', background: '#c5a059', border: 'none', borderRadius: '8px', color: '#0a192f', fontWeight: '600', cursor: 'pointer' }}>
          + Add New
        </button>
      </div>

      <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6f1ff', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '16px' }}>Logo</th>
              <th style={{ padding: '16px' }}>Trademark Name</th>
              <th style={{ padding: '16px' }}>Client</th>
              <th style={{ padding: '16px' }}>App #</th>
              <th style={{ padding: '16px' }}>Class</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px' }}>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {trademarks.map((tm) => (
              <tr key={tm.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="table-row">
                <td style={{ padding: '16px' }}>
                  <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                    {tm.logo_url ? (
                      <div style={{ position: 'relative', group: 'true' }}>
                        <img 
                          src={`http://localhost:5000${tm.logo_url}`} 
                          alt="Logo" 
                          style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <label 
                          style={{ 
                            position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', 
                            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            borderRadius: '4px', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s' 
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                        >
                          <span style={{ fontSize: '10px', color: 'white' }}>Edit</span>
                          <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileUpload(e, tm.id)} />
                        </label>
                      </div>
                    ) : (
                      <label style={{ 
                        width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        border: '1px dashed #8892b0', borderRadius: '4px', cursor: 'pointer', color: '#8892b0', fontSize: '12px'
                      }}>
                        +
                        <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileUpload(e, tm.id)} />
                      </label>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px', fontWeight: '600' }}>{tm.trademark_name}</td>
                <td style={{ padding: '16px', color: '#8892b0' }}>{tm.client_name}</td>
                <td style={{ padding: '16px', fontFamily: 'monospace' }}>{tm.application_number}</td>
                <td style={{ padding: '16px' }}>{tm.class_number}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    background: `${getStatusColor(tm.status)}20`, 
                    color: getStatusColor(tm.status),
                    border: `1px solid ${getStatusColor(tm.status)}40`
                  }}>
                    {tm.status}
                  </span>
                </td>
                <td style={{ padding: '16px', color: '#8892b0' }}>{new Date(tm.expiry_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrademarkList;
