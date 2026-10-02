import React, { useState, useEffect } from 'react';

export const PancakeDashboard: React.FC = () => {
  const [loadingHarvest, setLoadingHarvest] = useState(false);
  const [loadingRange, setLoadingRange] = useState(true);
  const [loadingRebalance, setLoadingRebalance] = useState(false);
  
  const [rangeData, setRangeData] = useState<{
    isInRange: boolean;
    currentTick: string;
    tickLower: string;
    tickUpper: string;
  } | null>(null);

  // Estado para el margen porcentual (por defecto 15%)
  const [percentage, setPercentage] = useState('15');
  const [msg, setMsg] = useState<string | null>(null);

  const harvestUrl = import.meta.env.VITE_HARVEST_API_URL || 'https://ceirhkdpuzobndgmyrmc.supabase.co/functions/v1/harvest-pancake';
  const rangeUrl = 'https://ceirhkdpuzobndgmyrmc.supabase.co/functions/v1/positionrange';
  const rebalanceUrl = 'https://ceirhkdpuzobndgmyrmc.supabase.co/functions/v1/rebalance-position';

  useEffect(() => {
    checkPositionRange();
  }, []);

  const checkPositionRange = async () => {
    setLoadingRange(true);
    try {
      const res = await fetch(rangeUrl);
      const data = await res.json();
      if (data.success) {
        setRangeData({
          isInRange: data.isInRange,
          currentTick: data.currentTick,
          tickLower: data.tickLower,
          tickUpper: data.tickUpper,
        });
      }
    } catch (e) {
      console.error('Error al verificar rango:', e);
    } finally {
      setLoadingRange(false);
    }
  };

  const handleHarvest = async () => {
    setLoadingHarvest(true);
    setMsg(null);
    try {
      const res = await fetch(harvestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.txHash ? '¡Reclamo exitoso! Tx: ' + data.txHash : 'Proceso completado sin transacciones pendientes.');
      } else {
        setMsg('Error: ' + data.error);
      }
    } catch (e: any) {
      setMsg('Error de red: ' + e.message);
    } finally {
      setLoadingHarvest(false);
    }
  };

  const handleRebalance = async () => {
    if (!percentage || Number(percentage) <= 0) {
      setMsg('Por favor ingresa un porcentaje válido (ej. 15).');
      return;
    }

    setLoadingRebalance(true);
    setMsg(null);
    try {
      const res = await fetch(rebalanceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: Number(percentage) })
      });
      const data = await res.json();
      if (data.success) {
        setMsg('¡Rebalanceo exitoso! ' + data.message);
        checkPositionRange(); // Actualizar el estado visual del rango
      } else {
        setMsg('Error al rebalancear: ' + data.error);
      }
    } catch (e: any) {
      setMsg('Error de red: ' + e.message);
    } finally {
      setLoadingRebalance(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: 'auto', background: '#0f172a', color: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      <h2>PancakeSwap V3 Harvester</h2>
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>Posición ID: #7594104 (PEPE/BNB)</p>

      {/* Indicador de Estado En Rango / Fuera de Rango */}
      <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', margin: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Estado de la Posición:</span>
        {loadingRange ? (
          <span style={{ fontSize: '13px', color: '#f97316' }}>Verificando...</span>
        ) : rangeData?.isInRange ? (
          <span style={{ background: '#065f46', color: '#34d399', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>🟢 En Rango</span>
        ) : (
          <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>🔴 Fuera de Rango</span>
        )}
      </div>

      {/* Botón de Harvest */}
      <button 
        onClick={handleHarvest} 
        disabled={loadingHarvest}
        style={{ width: '100%', padding: '12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginBottom: '15px', cursor: 'pointer', opacity: loadingHarvest ? 0.7 : 1 }}
      >
        {loadingHarvest ? 'Reclamando...' : 'Reclamar Ganancias Ahora'}
      </button>

      {/* Sección para Rebalancear por Porcentaje */}
      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', marginTop: '15px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1' }}>Ajustar Rango Automático</p>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Margen de Rango (± %):</label>
          <input 
            type="number" 
            placeholder="Ej. 15" 
            value={percentage} 
            onChange={(e) => setPercentage(e.target.value)}
            style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', boxSizing: 'border-box' }}
          />
        </div>

        <button 
            onClick={handleRebalance} 
            disabled={loadingRebalance}
            style={{ width: '100%', padding: '10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: loadingRebalance ? 0.7 : 1 }}
          >
            {loadingRebalance ? 'Rebalanceando...' : 'Rebalancear Posición'}
          </button>
      </div>

      {msg && <p style={{ marginTop: '15px', fontSize: '13px', wordBreak: 'break-all', background: '#1e293b', padding: '10px', borderRadius: '6px' }}>{msg}</p>}
    </div>
  );
};
