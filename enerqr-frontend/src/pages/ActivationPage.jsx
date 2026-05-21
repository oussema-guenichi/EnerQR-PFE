import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function ActivationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [consents, setConsents] = useState({
    storage: false,
    estimation: false,
    offers: false
  });
  const [loading, setLoading] = useState(false);

  const allChecked = consents.storage && consents.estimation && consents.offers;

  const handleActivate = () => {
    if (!allChecked) return;
    setLoading(true);
    
    fetch(`${API_BASE_URL}/client/${id}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentement_rgpd: true })
    })
    .then(res => {
        if (!res.ok) throw new Error("Erreur API");
        return res.json();
    })
    .then(() => {
        navigate(`/dashboard/${id}`);
    })
    .catch(err => {
        console.error(err);
        alert("Erreur de connexion.");
        setLoading(false);
    });
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '4vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', background: 'var(--card-bg)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          boxShadow: '0 8px 32px rgba(38, 196, 133, 0.2)'
        }}>
          <ShieldCheck size={40} color="var(--highlight-color)" />
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Bienvenue sur <span style={{ color: 'var(--highlight-color)' }}>EnerQR</span></h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Pour activer votre tableau de bord personnel, nous avons besoin de votre consentement.
        </p>
      </div>

      <div className="glass-card delay-1">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} /> Protection de vos données (RGPD)
        </h3>
        
        <div className="checkbox-wrapper">
          <input 
            type="checkbox" 
            id="storage" 
            checked={consents.storage} 
            onChange={e => setConsents({...consents, storage: e.target.checked})} 
          />
          <label htmlFor="storage">
            <span>Stockage de vos données de consommation.</span> J'accepte que EnerQR stocke mes données d'installation de manière sécurisée et anonymisée dans ses serveurs européens.
          </label>
        </div>
        
        <div className="checkbox-wrapper">
          <input 
            type="checkbox" 
            id="estimation" 
            checked={consents.estimation} 
            onChange={e => setConsents({...consents, estimation: e.target.checked})} 
          />
          <label htmlFor="estimation">
            <span>Traitement et estimation.</span> J'accepte l'utilisation de mes données pour calculer les économies réalisées et m'offrir des prévisions de consommation basées sur la météo via IA.
          </label>
        </div>
        
        <div className="checkbox-wrapper">
          <input 
            type="checkbox" 
            id="offers" 
            checked={consents.offers} 
            onChange={e => setConsents({...consents, offers: e.target.checked})} 
          />
          <label htmlFor="offers">
            <span>Offres personnalisées.</span> J'accepte de recevoir des conseils d'entretien, de maintenance ou des offres partenaires pour optimiser ma pompe à chaleur.
          </label>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', fontStyle: 'italic' }}>
          * Mention légale : “Les données collectées via EnerQR sont la propriété exclusive de la société EnerQR.” Vous pouvez à tout moment demander la suppression de vos données en contactant notre support.
        </p>

        <button 
          className="btn-primary" 
          style={{ width: '100%', marginTop: '1.5rem', opacity: allChecked ? 1 : 0.5, cursor: allChecked ? 'pointer' : 'not-allowed' }}
          disabled={!allChecked || loading}
          onClick={handleActivate}
        >
          {loading ? 'Activation en cours...' : 'Activer mon Dashboard'}
          {!loading && <CheckCircle2 size={20} />}
        </button>
      </div>
    </div>
  );
}
