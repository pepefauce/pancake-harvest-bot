import React, { useState, useEffect } from 'react';

interface PositionCard {
  id: string;
  loadingRange: boolean;
  loadingHarvest: boolean;
  loadingRebalance: boolean;
  isInRange: boolean;
  feesUSD: string;
  tokensOwed0: string;
  tokensOwed1: string;
  percentage: string;
  msg: string | null;
}

export const PancakeDashboard: React.FC = () => {
  // Lista de IDs guardados (por defecto arranca con el tuyo actual o los que guardes)
  const [positionIds, setPositionIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('pancakePositionIds');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    const legacy = localStorage.getItem('activePositionId');
    return legacy && legacy !== 'Detectando...' ? [legacy] : ['7604930'];
  });

  const [positionsData, setPositionsData] = useState<Record<string, PositionCard>>({});
  const [newIdInput, setNewIdInput] = useState('');

  const harvestUrl = import.meta.env.VITE_HARVEST_API_URL || 'https://ceirhkdpuzobndgmyrmc.supabase.co/functions/v1/harvest-pancake';
  const rangeUrl = 'https://ceirhkdpuzobndgmyrmc.supabase.co/functions/v1/positionrange';
  const rebalanceUrl = 'https://ceirhkdpuzobndgmyrmc.supabase.co/functions/v1/rebalance-position';
  const appSecret = import.meta.env.VITE_APP_SECRET || '';

  useEffect(() => {
    // Inicializar datos para cada ID
    const initialData: Record<string, PositionCard> = {};
    positionIds.forEach(id => {
      initialData[id] = {
        id,
        loadingRange: true,
        loadingHarvest: false,
        loadingRebalance: false,
        isInRange: true,
        feesUSD: '0.00',
        tokensOwed0: '0',
        tokensOwed1: '0',
        percentage: '15',
        msg: null,
      };
    });
    setPositionsData(initialData);
    
    // Cargar datos de todas las posiciones
    positionIds.forEach(id => fetchPositionData(id));
  }, [positionIds]);

  const saveAndSyncIds = (newIds: string[]) => {
    setPositionIds(newIds);
    localStorage.setItem('pancakePositionIds', JSON.stringify(newIds));
  };

  const handleAddPosition = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newIdInput.trim();
    if (!cleanId || positionIds.includes(cleanId)) return;
    if (positionIds.length >= 3) {
      alert('Máximo 3 posiciones recomendadas para esta vista.');
      return;
    }
    const updated = [...positionIds, cleanId];
    saveAndSyncIds(updated);
    setNewIdInput('');
  };

  const handleRemovePosition = (idToRemove: string) => {
    const updated = positionIds.filter(id => id !== idToRemove);
    saveAndSyncIds(updated);
  };

  const fetchPositionData = async (id: string) => {
    setPositionsData(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { id, percentage: '15' }), loadingRange: true }
    }));

    try {
      const res = await fetch(`${rangeUrl}?positionId=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appSecret}`
        }
      });
      const data = await res.json();
      
      setPositionsData(prev => ({
        ...prev,
        [id]: {
          ...(prev[id] || { percentage: '15' }),
          id,
          loadingRange: false,
          isInRange: data.success ? data.isInRange : true,
          feesUSD: data.success ? (data.feesUSD || '0.00') : '0.00',
          tokensOwed0: data.success ? (data.tokensOwed0 || '0') : '0',
          tokensOwed1: data.success ? (data.tokensOwed1 || '0') : '0',
        }
      }));
    } catch (e) {
      console.error(`Error al verificar posición ${id}:`, e);
      setPositionsData(prev => ({
        ...prev,
        [id]: { ...(prev[id] || { percentage: '15' }), loadingRange: false }
      }));
    }
  };

  const handleHarvest = async (id: string) => {
    setPositionsData(prev => ({
      ...prev,
      [id]: { ...prev[id], loadingHarvest: true, msg: null }
    }));

    try {
      const res = await fetch(harvestUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appSecret}` 
        },
        body: JSON.stringify({ positionId: Number(id) })
      });
      const data = await res.json();
      
      setPositionsData(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          loadingHarvest: false,
          msg: data.success 
            ? (data.txHash ? '¡Reclamo exitoso! Tx: ' + data.txHash : 'Proceso completado sin tx pendientes.')
            : 'Error: ' + data.error
        }
      }));
      if (data.success) fetchPositionData(id);
    } catch (e: any) {
      setPositionsData(prev => ({
        ...prev,
        [id]: { ...prev[id], loadingHarvest: false, msg: 'Error de red: ' + e.message }
      }));
    }
  };

  const handleRebalance = async (id: string) => {
    const pos = positionsData[id];
    if (!pos || !pos.percentage || Number(pos.percentage) <= 0) {
      alert('Ingresa un porcentaje válido.');
      return;
    }

    setPositionsData(prev => ({
      ...prev,
      [id]: { ...prev[id], loadingRebalance: true, msg: null }
    }));

    try {
      const res = await fetch(rebalanceUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appSecret}` 
        },
        body: JSON.stringify({ positionId: Number(id), percentage: Number(pos.percentage) })
      });
      const data = await res.json();
      
      setPositionsData(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          loadingRebalance: false,
          msg: data.success ? '¡Rebalanceo exitoso!' : 'Error al rebalancear: ' + data.error
        }
      }));
      if (data.success) fetchPositionData(id);
    } catch (e: any) {
      setPositionsData(prev => ({
        ...prev,
        [id]: { ...prev[id], loadingRebalance: false, msg: 'Error de red: ' + e.message }
      }));
    }
  };

  const updatePercentage = (id: string, val: string) => {
    setPositionsData(prev => ({
      ...prev,
      [id]: { ...prev[id], percentage: val }
    }));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '440px', margin: 'auto', background: '#0f172a', color: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      <h2>PancakeSwap Multi-Harvester</h2>
      <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '15px' }}>Gestionando hasta 3 posiciones V3 simultáneamente.</p>

      {/* Formulario para agregar nuevo ID */}
      {positionIds.length < 3 && (
        <form onSubmit={handleAddPosition} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Añadir nuevo Position ID..." 
            value={newIdInput}
            onChange={(e) => setNewIdInput(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
          />
          <button type="submit" style={{ padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
            + Añadir
          </button>
        </form>
      )}

      {/* Iterar sobre cada posición */}
      {positionIds.map((id) => {
        const pos = positionsData[id] || {
          id, loadingRange: true, loadingHarvest: false, loadingRebalance: false,
          isInRange: true, feesUSD: '0.00', tokensOwed0: '0', tokensOwed1: '0', percentage: '15', msg: null
        };

        return (
          <div key={id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '15px', marginBottom: '20px' }}>
            
            {/* Cabecera de la tarjeta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#38bdf8', fontSize: '15px' }}>ID: #{id}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {pos.loadingRange ? (
                  <span style={{ fontSize: '12px', color: '#f97316' }}>Cargando...</span>
                ) : pos.isInRange ? (
                  <span style={{ background: '#065f46', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>🟢 En Rango</span>
                ) : (
                  <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>🔴 Fuera</span>
                )}
                <button 
                  onClick={() => handleRemovePosition(id)} 
                  title="Eliminar posición"
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Ganancias */}
            <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Ganancias Acumuladas:</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#34d399' }}>${pos.feesUSD} USD</span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>
                PEPE: {pos.tokensOwed0} | WBNB: {pos.tokensOwed1}
              </div>
            </div>

            {/* Botón Reclamar */}
            <button 
              onClick={() => handleHarvest(id)} 
              disabled={pos.loadingHarvest}
              style={{ width: '100%', padding: '10px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginBottom: '12px', cursor: 'pointer', opacity: pos.loadingHarvest ? 0.7 : 1, fontSize: '13px' }}
            >
              {pos.loadingHarvest ? 'Reclamando...' : 'Reclamar Ganancias'}
            </button>

            {/* Ajuste de Rango */}
            <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1' }}>Rebalancear Automático</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number" 
                  value={pos.percentage} 
                  onChange={(e) => updatePercentage(id, e.target.value)}
                  style={{ width: '70px', padding: '6px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', fontSize: '12px', textAlign: 'center' }}
                />
                <button 
                  onClick={() => handleRebalance(id)} 
                  disabled={pos.loadingRebalance}
                  style={{ flex: 1, padding: '6px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: pos.loadingRebalance ? 0.7 : 1, fontSize: '12px' }}
                >
                  {pos.loadingRebalance ? 'Rebalanceando...' : 'Aplicar Rango'}
                </button>
              </div>
            </div>

            {pos.msg && <p style={{ marginTop: '10px', fontSize: '12px', wordBreak: 'break-all', background: '#0f172a', padding: '8px', borderRadius: '6px', color: '#cbd5e1' }}>{pos.msg}</p>}

          </div>
        );
      })}
    </div>
  );
};
