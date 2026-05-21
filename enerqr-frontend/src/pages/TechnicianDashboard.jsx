import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import { Users, Droplets, TrendingUp, Save, CheckCircle, QrCode, X, User } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function TechnicianDashboard() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const techId = localStorage.getItem('user_id');

  useEffect(() => {
    if (!techId) {
      setError("ID Technicien introuvable. Veuillez vous reconnecter.");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/technicien/${techId}/clients`)
      .then(res => {
        if (!res.ok) throw new Error("Erreur lors de la récupération des clients");
        return res.json();
      })
      .then(data => {
        setClients(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [techId]);

  const handleUpdateConsumption = async (clientId, consoAvant, consoApres) => {
    try {
      const res = await fetch(`${API_BASE_URL}/technicien/client/${clientId}/consumption`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conso_avant_kwh: parseFloat(consoAvant),
          conso_estimee_apres_kwh: parseFloat(consoApres)
        })
      });
      
      if (!res.ok) throw new Error("Erreur de mise à jour");
      const data = await res.json();
      if (data.ia_anomaly_detected) {
        alert(data.message);
      }
      return true; // Success
    } catch (err) {
      alert(err.message);
      return false;
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement de vos clients...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Mes Clients Assignés ({clients.length})</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Mettez à jour les index de consommation énergétique.</p>
      </div>

      {clients.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Users size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h4 style={{ color: 'var(--text-muted)' }}>Aucun client ne vous est assigné pour le moment.</h4>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {clients.map(client => (
            <ClientCard key={client.id} client={client} onUpdate={handleUpdateConsumption} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client, onUpdate }) {
  const [status, setStatus] = useState('idle'); // idle, loading, success
  const [consoAvant, setConsoAvant] = useState(client.conso_avant || 0);
  const [consoApres, setConsoApres] = useState(client.conso_apres || 0);
  const [showQR, setShowQR] = useState(false);

  const qrUrl = `${window.location.origin}/scan?id=${client.id}`;

  const handleSave = async () => {
    setStatus('loading');
    const success = await onUpdate(client.id, consoAvant, consoApres);
    if (success) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('idle');
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-color)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <User size={24} color="var(--primary-color)" />
          </div>
          <div>
            <h4 style={{ margin: 0 }}>{client.username}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{client.email}</p>
            <span style={{ fontSize: '0.75rem', background: 'rgba(141,169,196,0.1)', padding: '2px 8px', borderRadius: '10px', marginTop: '4px', display: 'inline-block' }}>
              {client.pump_model}
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => setShowQR(true)}
            style={{ marginLeft: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}
          >
            <QrCode size={18} /> Afficher QR
          </button>
        </div>
        
        <div style={{ flex: 1, minWidth: '250px', display: 'flex', gap: '1rem', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Conso Avant (kWh)</label>
            <div style={{ position: 'relative' }}>
              <TrendingUp size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="number" 
                value={consoAvant}
                onChange={(e) => setConsoAvant(e.target.value)}
                style={{ width: '100%', padding: '6px 6px 6px 30px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Conso Après (kWh)</label>
            <div style={{ position: 'relative' }}>
              <Droplets size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--highlight-color)' }} />
              <input 
                type="number" 
                value={consoApres}
                onChange={(e) => setConsoApres(e.target.value)}
                style={{ width: '100%', padding: '6px 6px 6px 30px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
              />
            </div>
          </div>
          <button 
            className="btn-primary" 
            style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', minWidth: '120px' }}
            onClick={handleSave}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '...' : status === 'success' ? <CheckCircle size={18} /> : <><Save size={18} /> Enregistrer</>}
          </button>
        </div>
      </div>
      
      {status === 'success' && (
        <p style={{ margin: 0, color: 'var(--highlight-color)', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }}>
          Données mises à jour avec succès !
        </p>
      )}

      {showQR && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', borderRadius: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(4px)' }}>
          <button 
            onClick={() => setShowQR(false)}
            style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
            <QRCodeCanvas value={qrUrl} size={150} level={"H"} />
          </div>
          <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>Scan pour ouvrir la page du client</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0.5rem 0 0 0', fontSize: '0.7rem' }}>{client.id}</p>
        </div>
      )}
    </div>
  );
}
