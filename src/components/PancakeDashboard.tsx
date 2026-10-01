import React, { useState } from 'react';

export const PancakeDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleHarvest = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://TU_PROYECTO.supabase.co/functions/v1/harvest-pancake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setMsg('¡Reclamo exitoso! Tx: ' + data.txHash);
      } else {
        setMsg('Error: ' + data.error);
      }
    } catch (e: any) {
      setMsg('Error de red: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: 'auto', background: '#0f172a', color: '#fff', borderRadius: '12px' }}>
      <h2>PancakeSwap V3 Harvester</h2>
      <p style={{ color: '#94a3b8' }}>Posición ID: #7594104 (PEPE/BNB)</p>
      <button 
        onClick={handleHarvest} 
        disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' }}
      >
        {loading ? 'Reclamando...' : 'Reclamar Ganancias Ahora'}
      </button>
      {msg && <p style={{ marginTop: '15px', fontSize: '13px', wordBreak: 'break-all', background: '#1e293b', padding: '10px', borderRadius: '6px' }}>{msg}</p>}
    </div>
  );
};
