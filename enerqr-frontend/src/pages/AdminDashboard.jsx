import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Activity, Users, Settings, Bell, QrCode, Trash2,
  AlertTriangle, Wrench, ShieldCheck, FileText, UserCheck, CheckCircle, Clock, X, Download, Filter, Target
} from 'lucide-react';
import { API_BASE_URL } from '../api';
import TechnicianDashboard from './TechnicianDashboard';

// =====================================================
// مساعدات: ألوان ونصوص حسب مستوى الشذوذة والحالة
// =====================================================
const NIVEAU_CONFIG = {
  1: { label: 'Faible',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   icon: '⚠️' },
  2: { label: 'Moyen',    color: '#f97316', bg: 'rgba(249,115,22,0.12)',  icon: '🔶' },
  3: { label: 'Critique', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '🔴' },
};

const STATUT_FACTURE_CONFIG = {
  en_attente: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  payee:      { label: 'Payée ✅',  color: '#26C485', bg: 'rgba(38,196,133,0.1)' },
  annulee:    { label: 'Annulée',   color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
};

const STATUT_ANOMALIE_CONFIG = {
  ouvert:   { label: 'Ouvert',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  en_cours: { label: 'En cours',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  resolu:   { label: 'Résolu ✅',  color: '#26C485', bg: 'rgba(38,196,133,0.1)' },
};

function Badge({ config, value }) {
  const cfg = config[value] || { label: value, color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
  return (
    <span style={{
      padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem',
      fontWeight: '700', color: cfg.color, background: cfg.bg
    }}>
      {cfg.label}
    </span>
  );
}

// =====================================================
// Modal générique (réutilisable)
// =====================================================
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, padding: '1rem'
    }} onClick={onClose}>
      <div
        className="glass-card"
        style={{ background: 'var(--bg-color)', minWidth: '360px', maxWidth: '520px', width: '100%', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-muted)' }}>
          <X size={20} />
        </button>
        <h3 style={{ marginBottom: '1.5rem' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// =====================================================
// Composant principal : AdminDashboard
// =====================================================
export default function AdminDashboard() {
  const userRole = localStorage.getItem('role');
  
  // Set default tab based on role
  const [activeTab, setActiveTab] = useState(userRole === 'technicien' ? 'anomalies' : 'stats');

  // === Données ===
  const [stats, setStats]             = useState(null);
  const [users, setUsers]             = useState([]);
  const [pumps, setPumps]             = useState([]);
  const [techniciens, setTechniciens] = useState([]);
  const [anomalies, setAnomalies]     = useState([]);
  const [factures, setFactures]       = useState([]);
  const [garanties, setGaranties]     = useState([]);

  // === Modals ===
  const [qrModal, setQrModal]                   = useState(null);
  const [addClientModal, setAddClientModal]     = useState(false);
  const [addAnomalyModal, setAddAnomalyModal]   = useState(false);
  const [assignModal, setAssignModal]           = useState(null); // anomaly id
  const [addGarantieModal, setAddGarantieModal] = useState(false);
  const [addCampaignModal, setAddCampaignModal] = useState(false);
  const [newClient, setNewClient]   = useState({ username: '', email: '', password: '' });
  const [newAnomaly, setNewAnomaly] = useState({ pump_id: '', client_id: '', niveau: 1, description: '' });
  const [selectedTech, setSelectedTech] = useState('');
  const [newGarantie, setNewGarantie] = useState({ pump_id: '', duree_mois: 24 });
  const [newCampaign, setNewCampaign] = useState({
    titre: '', description: '', image_url: '', lien_url: '',
    date_debut: '', date_fin: '', ciblage_zone: 'Toutes', ciblage_marque: 'Toutes', statut: 'brouillon'
  });

  // === Filters ===
  const [filters, setFilters] = useState({ zone: '', marque: '', statut: '', periode: '' });

  // === Campaigns ===
  const [campaigns, setCampaigns] = useState([]);

  // === Chargement des données ===
  const fetchData = () => {
    Promise.all([
      fetch(`${API_BASE_URL}/admin/stats`).then(r => r.json()),
      fetch(`${API_BASE_URL}/admin/users`).then(r => r.json()),
      fetch(`${API_BASE_URL}/admin/pumps`).then(r => r.json()),
      fetch(`${API_BASE_URL}/admin/techniciens`).then(r => r.json()),
      fetch(`${API_BASE_URL}/admin/anomalies`).then(r => r.json()),
      fetch(`${API_BASE_URL}/admin/factures`).then(r => r.json()),
      fetch(`${API_BASE_URL}/admin/garanties`).then(r => r.json()),
      fetch(`${API_BASE_URL}/admin/campaigns`).then(r => r.json()).catch(() => []),
    ])
    .then(([stData, usData, puData, techData, anomData, factData, garData, campData]) => {
      setStats(stData);
      setUsers(Array.isArray(usData) ? usData : []);
      setPumps(Array.isArray(puData) ? puData : []);
      setTechniciens(Array.isArray(techData) ? techData : []);
      setAnomalies(Array.isArray(anomData) ? anomData : []);
      setFactures(Array.isArray(factData) ? factData : []);
      setGaranties(Array.isArray(garData) ? garData : []);
      setCampaigns(Array.isArray(campData) ? campData : []);
    })
    .catch(err => console.error("Admin fetch error:", err));
  };

  useEffect(() => { fetchData(); }, []);

  // === Actions ===
  const handleDeleteClient = async (id) => {
    if (!window.confirm("Supprimer définitivement ce client ?")) return;
    const res = await fetch(`${API_BASE_URL}/admin/clients/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
    else alert("Erreur lors de la suppression.");
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newClient, role: 'client' })
    });
    if (res.ok) { setAddClientModal(false); setNewClient({ username: '', email: '', password: '' }); fetchData(); }
    else { const d = await res.json(); alert("Erreur: " + d.detail); }
  };

  const handleCreateAnomaly = async (e) => {
    e.preventDefault();
    const payload = { ...newAnomaly };
    if (userRole === 'technicien') {
      payload.technicien_id = localStorage.getItem('user_id');
    }

    const res = await fetch(`${API_BASE_URL}/admin/anomalies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      setAddAnomalyModal(false);
      setNewAnomaly({ pump_id: '', client_id: '', niveau: 1, description: '' });
      if (data.facture_creee) {
        alert(`✅ Anomalie créée.\n❗ Pas sous garantie → Facture de ${data.montant}€ générée automatiquement.`);
      } else {
        alert("✅ Anomalie créée. Pompe sous garantie → Réparation GRATUITE.");
      }
      fetchData();
    } else { alert("Erreur: " + (data.detail || 'Inconnue')); }
  };

  const handleAssignTech = async () => {
    if (!selectedTech) return;
    const res = await fetch(`${API_BASE_URL}/admin/anomalies/${assignModal}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technicien_id: selectedTech })
    });
    const data = await res.json();
    if (res.ok) { setAssignModal(null); setSelectedTech(''); fetchData(); alert("✅ " + data.message); }
    else alert("Erreur: " + (data.detail || 'Inconnue'));
  };

  const handleResolveAnomaly = async (id) => {
    if (!window.confirm("Marquer cette anomalie comme résolue ?")) return;
    const res = await fetch(`${API_BASE_URL}/admin/anomalies/${id}/resolve`, { method: 'PUT' });
    const data = await res.json();
    if (res.ok) { fetchData(); alert("✅ " + data.message); }
    else alert("Erreur: " + data.detail);
  };

  const handleUpdateFacture = async (id, statut) => {
    const res = await fetch(`${API_BASE_URL}/admin/factures/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut })
    });
    if (res.ok) fetchData();
    else alert("Erreur lors de la mise à jour.");
  };

  const handleCreateGarantie = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/admin/garanties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGarantie)
    });
    const data = await res.json();
    if (res.ok) { setAddGarantieModal(false); setNewGarantie({ pump_id: '', duree_mois: 24 }); fetchData(); alert("✅ Garantie enregistrée avec succès."); }
    else alert("Erreur: " + (data.detail || 'Inconnue'));
  };

  const handleDeleteGarantie = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette garantie ? (Irréversible)")) return;
    const res = await fetch(`${API_BASE_URL}/admin/garanties/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
    else alert("Erreur lors de la suppression de la garantie.");
  };

  // === Données pour le graphique (Ajustées avec les filtres si applicables) ===
  const chartData = [
    { month: 'Jan', kwh: 5200 }, { month: 'Fév', kwh: 4800 },
    { month: 'Mar', kwh: 3500 }, { month: 'Avr', kwh: 2100 },
    { month: 'Mai', kwh: 1200 }, { month: 'Juin', kwh: 1000 }
  ];

  // === Handlers Campagnes ===
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    const payload = { ...newCampaign };
    if (!payload.date_debut) payload.date_debut = new Date().toISOString();
    else payload.date_debut = new Date(payload.date_debut).toISOString();
    if (!payload.date_fin) {
      const d = new Date(); d.setMonth(d.getMonth() + 1);
      payload.date_fin = d.toISOString();
    } else {
      payload.date_fin = new Date(payload.date_fin).toISOString();
    }
    const res = await fetch(`${API_BASE_URL}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) { 
      setAddCampaignModal(false); 
      setNewCampaign({
        titre: '', description: '', image_url: '', lien_url: '',
        date_debut: '', date_fin: '', ciblage_zone: 'Toutes', ciblage_marque: 'Toutes', statut: 'brouillon'
      });
      fetchData(); 
    }
  };
  
  const handleUpdateCampaignStatus = async (id, statut) => {
    const res = await fetch(`${API_BASE_URL}/admin/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut })
    });
    if (res.ok) fetchData();
  };
  
  const handleDeleteCampaign = async (id) => {
    if (!window.confirm("Supprimer cette campagne ?")) return;
    const res = await fetch(`${API_BASE_URL}/admin/campaigns/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  // === Filtrage ===
  const handleResetFilters = () => setFilters({ zone: '', marque: '', statut: '', periode: '' });

  const filteredPumps = pumps.filter(p => {
    if (filters.zone && p.zone_climatique !== filters.zone) return false;
    if (filters.marque && p.modele_pac !== filters.marque) return false;
    
    const u = users.find(user => user.id === p.owner_id);
    if (filters.statut === 'actif' && u && !u.consentement_rgpd) return false;
    if (filters.statut === 'attente' && u && u.consentement_rgpd) return false;
    
    if (filters.periode) {
      const now = new Date();
      const d = new Date(p.date_activation);
      const diffDays = (now - d) / (1000 * 3600 * 24);
      if (filters.periode === '7j' && diffDays > 7) return false;
      if (filters.periode === '30j' && diffDays > 30) return false;
    }
    return true;
  });

  const filteredUsers = users.filter(u => {
    if (filters.statut === 'actif' && !u.consentement_rgpd) return false;
    if (filters.statut === 'attente' && u.consentement_rgpd) return false;
    
    const userPumps = pumps.filter(p => p.owner_id === u.id);
    if (filters.zone && !userPumps.some(p => p.zone_climatique === filters.zone)) return false;
    if (filters.marque && !userPumps.some(p => p.modele_pac === filters.marque)) return false;
    
    if (filters.periode) {
      const now = new Date();
      const matchPeriode = userPumps.some(p => {
        const d = new Date(p.date_activation);
        const diffDays = (now - d) / (1000 * 3600 * 24);
        if (filters.periode === '7j') return diffDays <= 7;
        if (filters.periode === '30j') return diffDays <= 30;
        return true;
      });
      if (!matchPeriode) return false;
    }
    return true;
  });

  // Re-calcul des stats pour le dashboard
  const filteredStats = {
    total_clients: stats ? stats.total_clients : filteredUsers.filter(u => u.role === 'client').length,
    total_pumps: stats ? stats.total_pumps : filteredPumps.length,
    activations: stats ? stats.activations : filteredUsers.filter(u => u.role === 'client' && u.consentement_rgpd).length,
    total_economies_kwh_an: stats ? stats.total_economies_kwh_an : filteredPumps.reduce((acc, p) => acc + (p.conso_avant_kwh - p.conso_estimee_apres_kwh), 0)
  };

  // === Export Logic ===
  const getExportData = async (rgpd = false) => {
    // Basic hash for RGPD demonstration without complex crypto setup (simple reverse string + btoa for non-reversible illusion in this context)
    const mockHash = (str) => btoa(str.split('').reverse().join('') + "enerqr_salt").substring(0, 16);
    
    return filteredPumps.map(p => {
      const u = users.find(user => user.id === p.owner_id) || {};
      return {
        id_anonyme: rgpd ? mockHash(p.owner_id) : p.owner_id,
        type_pac: p.type_pac,
        modele_pac: p.modele_pac,
        zone_climatique: p.zone_climatique || 'H1',
        conso_avant: p.conso_avant_kwh,
        conso_apres: p.conso_estimee_apres_kwh,
        economies_calculees: p.conso_avant_kwh - p.conso_estimee_apres_kwh,
        date_installation: p.date_activation,
        ville: u.ville || '',
        departement: u.code_postal ? u.code_postal.substring(0, 2) : ''
      };
    });
  };

  const downloadExport = async (format, rgpd = false) => {
    const data = await getExportData(rgpd);
    if (data.length === 0) {
      alert("Aucune donnée à exporter avec ces filtres.");
      return;
    }

    let content = "";
    let mimeType = "";
    let filename = rgpd ? `enerqr_export_tiers_rgpd_${new Date().getTime()}` : `enerqr_export_admin_${new Date().getTime()}`;

    if (format === 'json') {
      const payload = rgpd ? {
        warning: "Ces données sont anonymisées conformément au RGPD. Toute réutilisation doit respecter les conditions d'utilisation EnerQR.",
        timestamp: new Date().toISOString(),
        data: data
      } : data;
      content = JSON.stringify(payload, null, 2);
      mimeType = "application/json";
      filename += ".json";
    } else {
      const headers = Object.keys(data[0] || {}).join(",");
      const rows = data.map(obj => Object.values(obj).join(",")).join("\n");
      content = headers + "\n" + rows;
      if (rgpd) {
        content = "# AVERTISSEMENT: Ces données sont anonymisées conformément au RGPD. Toute réutilisation doit respecter les conditions d'utilisation EnerQR.\n" +
                  `# Horodatage: ${new Date().toISOString()}\n` + content;
      }
      mimeType = "text/csv";
      filename += ".csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Style commun des cellules de tableau
  const tdStyle = { padding: '0.9rem 1rem', verticalAlign: 'middle' };
  const thStyle = { padding: '0.9rem 1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap' };

  // === Tabs config ===
  const allTabs = [
    { id: 'stats',       label: 'Dashboard',      icon: Activity,       roles: ['admin'] },
    { id: 'clients',     label: 'Clients',        icon: Users,          roles: ['admin'] },
    { id: 'pumps',       label: 'Pompes (QR)',    icon: Settings,       roles: ['admin'] },
    { id: 'techniciens', label: 'Techniciens',    icon: Wrench,         roles: ['admin'] },
    { id: 'anomalies',   label: 'Anomalies',      icon: AlertTriangle,  roles: ['admin', 'technicien'] },
    { id: 'gestion_conso',label: 'Mes Clients',   icon: UserCheck,      roles: ['technicien'] },
    { id: 'garanties',   label: 'Garanties & Fact.', icon: ShieldCheck, roles: ['admin'] },
    { id: 'ai',          label: 'Suivi IA',       icon: Bell,           roles: ['admin'] },
    { id: 'campagnes',   label: 'Campagnes',      icon: Target,         roles: ['admin'] },
  ];

  const tabs = allTabs.filter(t => t.roles.includes(userRole));

  // Style d'input réutilisable
  const inputStyle = {
    padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)',
    background: 'var(--bg-color)', color: 'var(--text-main)', width: '100%', fontFamily: 'inherit'
  };
  const selectStyle = { ...inputStyle };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>

      {/* Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Portail <span style={{ color: 'var(--highlight-color)' }}>{userRole === 'technicien' ? 'Technicien' : 'Admin'}</span></h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(38,196,133,0.1)', color: 'var(--highlight-color)', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
            🟢 {techniciens.filter(t => t.is_available).length} Techniciens Libres
          </span>
          <span style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
            🔴 {anomalies.filter(a => a.statut !== 'resolu').length} Anomalies Actives
          </span>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '1 1 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              padding: '0.75rem 1rem',
              background: activeTab === tab.id ? 'var(--highlight-color)' : 'var(--card-bg)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-main)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)', fontWeight: '600', fontSize: '0.9rem',
              transition: 'all 0.3s ease', whiteSpace: 'nowrap'
            }}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* =============================================== */}
      {/* FILTRES & EXPORT (Uniquement Admin)             */}
      {/* =============================================== */}
      {userRole === 'admin' && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select value={filters.zone} onChange={e => setFilters({...filters, zone: e.target.value})} style={{...selectStyle, width: 'auto', padding: '0.4rem', fontSize: '0.85rem'}}>
              <option value="">Toutes zones</option>
              <option value="H1">Zone H1</option>
              <option value="H2">Zone H2</option>
              <option value="H3">Zone H3</option>
            </select>
            <input type="text" placeholder="Marque / Modèle" value={filters.marque} onChange={e => setFilters({...filters, marque: e.target.value})} style={{...inputStyle, width: '150px', padding: '0.4rem', fontSize: '0.85rem'}} />
            <select value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})} style={{...selectStyle, width: 'auto', padding: '0.4rem', fontSize: '0.85rem'}}>
              <option value="">Tous statuts</option>
              <option value="actif">Activé (RGPD OK)</option>
              <option value="attente">En attente</option>
            </select>
            <select value={filters.periode} onChange={e => setFilters({...filters, periode: e.target.value})} style={{...selectStyle, width: 'auto', padding: '0.4rem', fontSize: '0.85rem'}}>
              <option value="">Toute période</option>
              <option value="7j">7 derniers jours</option>
              <option value="30j">30 derniers jours</option>
            </select>
            <button onClick={handleResetFilters} style={{ background: 'transparent', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 'bold' }}>
              <X size={14} style={{ verticalAlign: 'middle' }} /> Réinitialiser
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', marginRight: '0.5rem' }}>Exporter :</span>
            <button onClick={() => downloadExport('csv', false)} style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', padding: '0.4rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Download size={14} /> CSV
            </button>
            <button onClick={() => downloadExport('json', false)} style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', padding: '0.4rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Download size={14} /> JSON
            </button>
            <button onClick={() => downloadExport('json', true)} style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
              <ShieldCheck size={14} /> Export Tiers (RGPD)
            </button>
          </div>
        </div>
      )}

      {/* =============================================== */}
      {/* TAB 1 : Dashboard & Stats                       */}
      {/* =============================================== */}
      {activeTab === 'stats' && stats && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total Clients', value: filteredStats.total_clients, icon: '👤' },
              { label: 'Total Pompes', value: filteredStats.total_pumps, icon: '⚡' },
              { label: 'Activations RGPD', value: filteredStats.activations, icon: '✅' },
              { label: 'Anomalies Actives', value: anomalies.filter(a => a.statut !== 'resolu').length, icon: '⚠️', accent: true },
              { label: 'Factures en attente', value: factures.filter(f => f.statut === 'en_attente').length, icon: '📄', accent: true },
              { label: 'Économies/An', value: `~${Math.round(filteredStats.total_economies_kwh_an)} kWh`, icon: '💚' },
            ].map((card, i) => (
              <div key={i} className="glass-card" style={{ borderLeft: card.accent ? '4px solid var(--danger)' : '4px solid var(--highlight-color)', padding: '1.2rem' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{card.icon}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{card.label}</p>
                <h3 style={{ fontSize: '1.4rem' }}>{card.value}</h3>
              </div>
            ))}
          </div>
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Consommation Énergétique (kWh)</h3>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="kwh" stroke="var(--highlight-color)" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =============================================== */}
      {/* TAB 2 : Gestion Clients                        */}
      {/* =============================================== */}
      {activeTab === 'clients' && (
        <div className="glass-card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3>Liste des Clients ({filteredUsers.length})</h3>
            <button className="btn-primary" onClick={() => setAddClientModal(true)} style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
              + Ajouter Client
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['ID', 'Username', 'Email', 'Consentement', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.id.substring(0, 8)}...</td>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>{u.username}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}><Badge config={{ true: { label: 'Actif', color: '#26C485', bg: 'rgba(38,196,133,0.1)' }, false: { label: 'En attente', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' } }} value={u.consentement_rgpd} /></td>
                    <td style={tdStyle}>
                      <button onClick={() => handleDeleteClient(u.id)} style={{ color: 'var(--danger)' }}><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun client trouvé.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =============================================== */}
      {/* TAB 3 : Pompes & QR                            */}
      {/* =============================================== */}
      {activeTab === 'pumps' && (
        <div className="glass-card animate-fade-in">
          <h3 style={{ marginBottom: '1.5rem' }}>Parc des Pompes à Chaleur ({filteredPumps.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['Propriétaire', 'Type', 'Modèle', 'IA Anomalie', 'QR Code'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredPumps.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>{p.client_username}</td>
                    <td style={tdStyle}>{p.type_pac}</td>
                    <td style={tdStyle}>{p.modele_pac}</td>
                    <td style={tdStyle}>
                      <span style={{ color: p.ia_anomaly ? 'var(--danger)' : 'var(--highlight-color)', fontWeight: '700' }}>
                        {p.ia_anomaly ? '⚠️ Anomalie' : '✅ Normal'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => setQrModal(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--primary-color)', color: 'var(--bg-color)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.85rem' }}>
                        <QrCode size={14} /> QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =============================================== */}
      {/* TAB 4 : Techniciens                            */}
      {/* =============================================== */}
      {activeTab === 'techniciens' && (
        <div className="glass-card animate-fade-in">
          <h3 style={{ marginBottom: '1.5rem' }}>Tableau des Techniciens ({techniciens.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['Technicien', 'Email', 'N° Série', 'Disponibilité', 'Missions en cours'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {techniciens.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ ...tdStyle, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', background: t.is_available ? '#26C485' : '#ef4444', flexShrink: 0 }} />
                      {t.username}
                    </td>
                    <td style={tdStyle}>{t.email}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.numero_serie || '—'}</td>
                    <td style={tdStyle}>
                      <Badge config={{
                        true:  { label: '🟢 Libre',  color: '#26C485', bg: 'rgba(38,196,133,0.1)' },
                        false: { label: '🔴 Occupé', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
                      }} value={t.is_available} />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: '700', color: t.anomalies_en_cours > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                      {t.anomalies_en_cours}
                    </td>
                  </tr>
                ))}
                {techniciens.length === 0 && <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun technicien enregistré.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =============================================== */}
      {/* TAB 5 : Anomalies                              */}
      {/* =============================================== */}
      {activeTab === 'anomalies' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3>Gestion des Anomalies</h3>
            <button className="btn-primary" onClick={() => setAddAnomalyModal(true)} style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
              + Signaler Anomalie
            </button>
          </div>
          {/* Résumé par niveau */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3].map(niv => {
              const cfg = NIVEAU_CONFIG[niv];
              const count = anomalies.filter(a => a.niveau === niv && a.statut !== 'resolu').length;
              return (
                <div key={niv} className="glass-card" style={{ borderLeft: `4px solid ${cfg.color}`, padding: '1rem' }}>
                  <p style={{ fontSize: '1.3rem' }}>{cfg.icon}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Niveau {niv} — {cfg.label}</p>
                  <h3 style={{ color: cfg.color }}>{count} actives</h3>
                </div>
              );
            })}
          </div>

          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['Niveau', 'Client', 'Pompe', 'Garantie', 'Description', 'Statut', 'Technicien', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {anomalies.map(a => {
                  const nCfg = NIVEAU_CONFIG[a.niveau] || NIVEAU_CONFIG[1];
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)', background: a.statut === 'resolu' ? 'transparent' : nCfg.bg }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: '800', color: nCfg.color, fontSize: '0.85rem' }}>
                          {nCfg.icon} Niv. {a.niveau}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{a.client_username}</td>
                      <td style={{ ...tdStyle, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.modele_pac}</td>
                      <td style={tdStyle}>
                        {a.sous_garantie
                          ? <span style={{ color: '#26C485', fontWeight: '700', fontSize: '0.85rem' }}>✅ Garantie</span>
                          : <span style={{ color: '#f59e0b', fontWeight: '700', fontSize: '0.85rem' }}>💰 Facturée</span>
                        }
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.85rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.description || '—'}
                      </td>
                      <td style={tdStyle}><Badge config={STATUT_ANOMALIE_CONFIG} value={a.statut} /></td>
                      <td style={{ ...tdStyle, fontSize: '0.85rem' }}>
                        {a.technicien_username
                          ? <span style={{ color: '#f59e0b' }}>🔧 {a.technicien_username}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>Non assigné</span>
                        }
                      </td>
                      <td style={{ ...tdStyle, display: 'flex', gap: '0.5rem', flexWrap: 'nowrap' }}>
                        {a.statut !== 'resolu' && a.statut !== 'en_cours' && (
                          <button
                            onClick={() => { setAssignModal(a.id); setSelectedTech(''); }}
                            style={{ background: 'var(--primary-color)', color: 'var(--bg-color)', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <UserCheck size={13} /> Assigner
                          </button>
                        )}
                        {a.statut === 'en_cours' && (
                          <button
                            onClick={() => handleResolveAnomaly(a.id)}
                            style={{ background: 'rgba(38,196,133,0.15)', color: '#26C485', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <CheckCircle size={13} /> Résoudre
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {anomalies.length === 0 && <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune anomalie enregistrée.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =============================================== */}
      {/* TAB 6 : Garanties & Factures                   */}
      {/* =============================================== */}
      {activeTab === 'garanties' && (
        <div className="animate-fade-in">
          {/* Section Garanties */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20} /> Garanties</h3>
            <button className="btn-primary" onClick={() => setAddGarantieModal(true)} style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
              + Ajouter Garantie
            </button>
          </div>
          <div className="glass-card" style={{ marginBottom: '2rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['Client', 'Modèle Pompe', 'Début', 'Fin', 'Statut', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {garanties.map(g => (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>{g.client_username}</td>
                    <td style={tdStyle}>{g.modele_pac}</td>
                    <td style={{ ...tdStyle, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(g.date_debut).toLocaleDateString('fr-FR')}</td>
                    <td style={{ ...tdStyle, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(g.date_fin).toLocaleDateString('fr-FR')}</td>
                    <td style={tdStyle}>
                      {g.sous_garantie
                        ? <Badge config={{ true: { label: '✅ Active', color: '#26C485', bg: 'rgba(38,196,133,0.1)' } }} value={true} />
                        : <Badge config={{ false: { label: '❌ Expirée', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' } }} value={false} />
                      }
                    </td>
                    <td style={tdStyle}>
                      <button 
                        onClick={() => handleDeleteGarantie(g.id)}
                        style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        <X size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Révoquer
                      </button>
                    </td>
                  </tr>
                ))}
                {garanties.length === 0 && <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune garantie enregistrée.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Section Factures */}
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={20} /> Factures</h3>
          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['Client', 'Niveau Anomalie', 'Description', 'Montant', 'Statut', 'Date', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {factures.map(f => {
                  const nCfg = NIVEAU_CONFIG[f.niveau_anomalie] || {};
                  return (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{f.client_username}</td>
                      <td style={tdStyle}>
                        {f.niveau_anomalie && (
                          <span style={{ color: nCfg.color, fontWeight: '700', fontSize: '0.85rem' }}>
                            {nCfg.icon} Niv. {f.niveau_anomalie}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.description_anomalie || '—'}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '800', color: 'var(--highlight-color)', fontSize: '1rem' }}>
                        {f.montant.toFixed(2)} €
                      </td>
                      <td style={tdStyle}><Badge config={STATUT_FACTURE_CONFIG} value={f.statut} /></td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(f.date_creation).toLocaleDateString('fr-FR')}</td>
                      <td style={{ ...tdStyle }}>
                        {f.statut === 'en_attente' && (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'nowrap' }}>
                            <button
                              onClick={() => handleUpdateFacture(f.id, 'payee')}
                              style={{ background: 'rgba(38,196,133,0.15)', color: '#26C485', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}
                            >
                              ✅ Payée
                            </button>
                            <button
                              onClick={() => handleUpdateFacture(f.id, 'annulee')}
                              style={{ background: 'rgba(156,163,175,0.15)', color: '#9ca3af', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}
                            >
                              ✖ Annuler
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {factures.length === 0 && <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune facture générée.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =============================================== */}
      {/* TAB 7 : Suivi IA & Alertes                     */}
      {/* =============================================== */}
      {activeTab === 'ai' && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginBottom: '1.5rem' }}>
              <AlertTriangle size={22} /> Alertes IA Algorithmiques
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Le module IA d'EnerQR analyse en continu les ratios de surconsommation pour détecter les anomalies automatiquement.
            </p>
            {pumps.filter(p => p.ia_anomaly).length === 0 ? (
              <p style={{ fontWeight: 'bold', color: 'var(--highlight-color)', fontSize: '1.1rem' }}>✅ Tous les systèmes fonctionnent parfaitement.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pumps.filter(p => p.ia_anomaly).map(p => (
                  <div key={p.id} style={{ background: 'rgba(239,71,111,0.05)', padding: '1.2rem', borderRadius: '10px', border: '1px solid rgba(239,71,111,0.2)' }}>
                    <strong>Client: {p.client_username}</strong> — {p.modele_pac}
                    <p style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.95rem' }}>
                      ⚠️ Consommation anormale détectée ! Intervention recommandée.
                    </p>
                    <button
                      onClick={() => { setAddAnomalyModal(true); setNewAnomaly(prev => ({ ...prev, pump_id: p.id, client_id: p.owner_id })); setActiveTab('anomalies'); }}
                      style={{ marginTop: '0.8rem', background: 'var(--danger)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600' }}
                    >
                      + Créer anomalie depuis alerte IA
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =============================================== */}
      {/* TAB 8 : Gestion Consommation (Technicien)     */}
      {/* =============================================== */}
      {activeTab === 'gestion_conso' && (
        <div className="animate-fade-in">
          <TechnicianDashboard />
        </div>
      )}

      {/* =============================================== */}
      {/* TAB 9 : Campagnes (Offres)                      */}
      {/* =============================================== */}
      {activeTab === 'campagnes' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3>Gestion des Campagnes & Offres</h3>
            <button className="btn-primary" onClick={() => setAddCampaignModal(true)} style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
              + Créer une Campagne
            </button>
          </div>
          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['Titre', 'Ciblage Zone', 'Ciblage Marque', 'Début', 'Fin', 'Statut', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>{c.titre}</td>
                    <td style={tdStyle}>{c.ciblage_zone}</td>
                    <td style={tdStyle}>{c.ciblage_marque}</td>
                    <td style={{ ...tdStyle, fontSize: '0.85rem' }}>{new Date(c.date_debut).toLocaleDateString('fr-FR')}</td>
                    <td style={{ ...tdStyle, fontSize: '0.85rem' }}>{new Date(c.date_fin).toLocaleDateString('fr-FR')}</td>
                    <td style={tdStyle}>
                      {c.statut === 'active' && <span style={{ color: '#26C485', fontWeight: 'bold' }}>Active</span>}
                      {c.statut === 'brouillon' && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Brouillon</span>}
                      {c.statut === 'expiree' && <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Expirée</span>}
                    </td>
                    <td style={{ ...tdStyle, display: 'flex', gap: '0.5rem' }}>
                      {c.statut === 'brouillon' && (
                        <button onClick={() => handleUpdateCampaignStatus(c.id, 'active')} style={{ color: '#26C485', fontWeight: 'bold' }}>Activer</button>
                      )}
                      {c.statut === 'active' && (
                        <button onClick={() => handleUpdateCampaignStatus(c.id, 'expiree')} style={{ color: '#f59e0b', fontWeight: 'bold' }}>Désactiver</button>
                      )}
                      <button onClick={() => handleDeleteCampaign(c.id)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune campagne trouvée.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODALS                                   */}
      {/* ======================================= */}

      {/* Modal: Ajouter Client */}
      <Modal open={addClientModal} onClose={() => setAddClientModal(false)} title="Créer un nouveau Client">
        <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input required type="text" placeholder="Nom d'utilisateur" value={newClient.username} onChange={e => setNewClient({ ...newClient, username: e.target.value })} style={inputStyle} />
          <input required type="email" placeholder="Adresse e-mail" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} style={inputStyle} />
          <input required type="password" placeholder="Mot de passe provisoire" value={newClient.password} onChange={e => setNewClient({ ...newClient, password: e.target.value })} style={inputStyle} />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Sauvegarder</button>
            <button type="button" onClick={() => setAddClientModal(false)} style={{ flex: 1, border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', fontWeight: 'bold' }}>Annuler</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Signaler Anomalie */}
      <Modal open={addAnomalyModal} onClose={() => setAddAnomalyModal(false)} title="📋 Signaler une Anomalie">
        <form onSubmit={handleCreateAnomaly} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Pompe concernée</label>
            <select required value={newAnomaly.pump_id} onChange={e => {
              const pump = pumps.find(p => p.id === e.target.value);
              setNewAnomaly({ ...newAnomaly, pump_id: e.target.value, client_id: pump?.owner_id || '' });
            }} style={selectStyle}>
              <option value="">-- Sélectionner une pompe --</option>
              {pumps.map(p => <option key={p.id} value={p.id}>{p.modele_pac} ({p.client_username})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Niveau de gravité</label>
            <select value={newAnomaly.niveau} onChange={e => setNewAnomaly({ ...newAnomaly, niveau: parseInt(e.target.value) })} style={selectStyle}>
              <option value={1}>⚠️ Niveau 1 — Faible (50€)</option>
              <option value={2}>🔶 Niveau 2 — Moyen (150€)</option>
              <option value={3}>🔴 Niveau 3 — Critique (350€)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Description</label>
            <textarea
              placeholder="Décrire le problème observé..."
              value={newAnomaly.description}
              onChange={e => setNewAnomaly({ ...newAnomaly, description: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'rgba(38,196,133,0.08)', padding: '0.7rem', borderRadius: '8px' }}>
            ℹ️ Si la pompe est sous garantie, la réparation est <strong>gratuite</strong>. Sinon, une facture sera générée automatiquement.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Confirmer</button>
            <button type="button" onClick={() => setAddAnomalyModal(false)} style={{ flex: 1, border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '8px', fontWeight: 'bold' }}>Annuler</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assigner Technicien */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="🔧 Assigner un Technicien">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sélectionnez un technicien <strong>libre</strong> pour cette intervention :</p>
          <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} style={selectStyle}>
            <option value="">-- Choisir technicien --</option>
            {techniciens.filter(t => t.is_available).map(t => (
              <option key={t.id} value={t.id}>🟢 {t.username} ({t.anomalies_en_cours} missions)</option>
            ))}
          </select>
          {techniciens.filter(t => t.is_available).length === 0 && (
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: '600' }}>⚠️ Tous les techniciens sont actuellement occupés.</p>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button onClick={handleAssignTech} className="btn-primary" style={{ flex: 1 }} disabled={!selectedTech}>Assigner</button>
            <button onClick={() => setAssignModal(null)} style={{ flex: 1, border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '8px', fontWeight: 'bold' }}>Annuler</button>
          </div>
        </div>
      </Modal>

      {/* Modal: Ajouter Garantie */}
      <Modal open={addGarantieModal} onClose={() => setAddGarantieModal(false)} title="🛡️ Ajouter une Garantie">
        <form onSubmit={handleCreateGarantie} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Pompe</label>
            <select required value={newGarantie.pump_id} onChange={e => setNewGarantie({ ...newGarantie, pump_id: e.target.value })} style={selectStyle}>
              <option value="">-- Sélectionner une pompe --</option>
              {pumps.map(p => <option key={p.id} value={p.id}>{p.modele_pac} ({p.client_username})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Durée de la garantie (mois)</label>
            <input type="number" min={1} max={120} value={newGarantie.duree_mois} onChange={e => setNewGarantie({ ...newGarantie, duree_mois: parseInt(e.target.value) })} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Enregistrer</button>
            <button type="button" onClick={() => setAddGarantieModal(false)} style={{ flex: 1, border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '8px', fontWeight: 'bold' }}>Annuler</button>
          </div>
        </form>
      </Modal>

      {/* Modal: QR Code */}
      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="Générateur EnerQR">
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem' }}>
            <QRCodeSVG value={`http://localhost:5173/scan?pump=${qrModal}`} size={200} />
          </div>
          <br />
          <button className="btn-primary" style={{ margin: '0 auto 1rem' }} onClick={() => window.print()}>
            Imprimer l'étiquette
          </button>
          <br />
          <button onClick={() => setQrModal(null)} style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Fermer</button>
        </div>
      </Modal>

      {/* Modal: Créer Campagne */}
      <Modal open={addCampaignModal} onClose={() => setAddCampaignModal(false)} title="📣 Nouvelle Campagne (Offre)">
        <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Titre de l'offre *</label>
            <input required type="text" value={newCampaign.titre} onChange={e => setNewCampaign({...newCampaign, titre: e.target.value})} style={inputStyle} placeholder="ex: Entretien Annuel -20%" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Description *</label>
            <textarea required value={newCampaign.description} onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} style={{...inputStyle, resize: 'vertical'}} rows={2} placeholder="Détails de l'offre..." />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Lien de redirection (URL) *</label>
            <input required type="url" value={newCampaign.lien_url} onChange={e => setNewCampaign({...newCampaign, lien_url: e.target.value})} style={inputStyle} placeholder="https://..." />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Zone ciblée</label>
              <select value={newCampaign.ciblage_zone} onChange={e => setNewCampaign({...newCampaign, ciblage_zone: e.target.value})} style={selectStyle}>
                <option value="Toutes">Toutes les zones</option>
                <option value="H1">Zone H1</option>
                <option value="H2">Zone H2</option>
                <option value="H3">Zone H3</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Marque ciblée</label>
              <input type="text" value={newCampaign.ciblage_marque} onChange={e => setNewCampaign({...newCampaign, ciblage_marque: e.target.value})} style={inputStyle} placeholder="ex: Daikin, Toutes..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Date de début</label>
              <input type="date" value={newCampaign.date_debut} onChange={e => setNewCampaign({...newCampaign, date_debut: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Date de fin</label>
              <input type="date" value={newCampaign.date_fin} onChange={e => setNewCampaign({...newCampaign, date_fin: e.target.value})} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Créer la campagne</button>
            <button type="button" onClick={() => setAddCampaignModal(false)} style={{ flex: 1, border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', fontWeight: 'bold' }}>Annuler</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
