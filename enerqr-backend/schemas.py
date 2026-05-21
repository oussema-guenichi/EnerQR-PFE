# ============================================================
# FICHIER : schemas.py
# RÔLE : Validation des données entrantes et sortantes de l'API
# Pydantic vérifie automatiquement que les données envoyées
# par le frontend sont correctes (bon type, champs obligatoires...)
# Chaque schéma = un "formulaire" que les données doivent respecter
# ============================================================

from pydantic import BaseModel
from typing import Optional, List
import datetime


# ==========================================
# SCHÉMAS UTILISATEUR
# ==========================================

# --- Base commune pour tous les utilisateurs ---
class UserBase(BaseModel):
    username: str                              # Nom d'utilisateur (obligatoire)
    email: str                                 # Email (obligatoire)
    role: Optional[str] = "client"             # Rôle : "client", "technicien" ou "admin"
    numero_serie: Optional[str] = None         # Numéro de série (techniciens uniquement)
    code_postal: Optional[str] = None          # Code postal (optionnel)
    ville: Optional[str] = None                # Ville (optionnel)

# --- Schéma pour créer un nouveau compte ---
# Hérite de UserBase et ajoute le mot de passe
class UserCreate(UserBase):
    password: str                              # Mot de passe (obligatoire à l'inscription)

# --- Schéma pour se connecter ---
# Seulement le nom d'utilisateur et le mot de passe
class UserLogin(BaseModel):
    username: str
    password: str
    role: str
    numero_serie: Optional[str] = None

# --- Schéma de réponse (ce qu'on renvoie au frontend) ---
# Ne contient JAMAIS le mot de passe pour des raisons de sécurité
class UserResponse(UserBase):
    id: str                                            # Identifiant unique
    consentement_rgpd: bool                            # A-t-il accepté le RGPD ?
    is_available: Optional[bool] = True                # Est-il disponible ? (techniciens)
    technicien_id: Optional[str] = None                # ID du technicien assigné (clients)
    technicien_username: Optional[str] = None          # Nom du technicien (pour affichage)
    technicien_email: Optional[str] = None             # Email du technicien (pour contact)
    class Config:
        from_attributes = True  # Permet de convertir directement un objet SQLAlchemy → Pydantic

# --- Schéma d'activation du compte (consentement RGPD) ---
class ClientActivate(BaseModel):
    consentement_rgpd: bool  # True = le client accepte le stockage de ses données


# ==========================================
# SCHÉMAS POMPE À CHALEUR
# ==========================================

# --- Informations de base d'une pompe ---
class PumpBase(BaseModel):
    type_pac: str                    # Type de pompe (Air/Eau, Air/Air...)
    modele_pac: str                  # Modèle et marque
    zone_climatique: str             # Zone météo (H1, H2, H3)
    conso_avant_kwh: float           # Consommation avant installation
    conso_estimee_apres_kwh: float   # Consommation estimée après

# --- Pour créer une nouvelle pompe (associée à un client) ---
class PumpCreate(PumpBase):
    owner_id: str                    # ID du propriétaire

# --- Réponse renvoyée par l'API pour une pompe ---
class PumpResponse(PumpBase):
    id: str
    owner_id: str
    date_activation: datetime.datetime
    class Config:
        from_attributes = True

# --- Pour mettre à jour la consommation (utilisé par les techniciens) ---
class ConsumptionUpdate(BaseModel):
    conso_avant_kwh: float
    conso_estimee_apres_kwh: float

# --- Statistiques renvoyées au client (économies, consommation) ---
class StatsResponse(BaseModel):
    economies_kwh_an: float          # Économies en kWh par an
    economies_eur_an: float          # Économies en euros par an
    mois_ecoules: float              # Nombre de mois depuis l'installation
    economies_cumulees_eur: float    # Total des économies cumulées en euros
    conso_cumulee_kwh: float         # Consommation totale depuis l'installation


# ==========================================
# SCHÉMAS ANOMALIES (Pannes)
# ==========================================

# --- Pour signaler une nouvelle anomalie ---
class AnomalyCreate(BaseModel):
    pump_id: str                              # Sur quelle pompe ?
    client_id: str                            # Quel client ?
    niveau: int = 1                           # Gravité : 1=Faible, 2=Moyen, 3=Critique
    description: Optional[str] = None         # Description du problème
    technicien_id: Optional[str] = None       # Technicien assigné (optionnel)

# --- Réponse détaillée d'une anomalie ---
class AnomalyResponse(BaseModel):
    id: str
    pump_id: str
    client_id: str
    technicien_id: Optional[str] = None
    niveau: int
    description: Optional[str]
    statut: str                               # "ouvert", "en_cours", "resolu"
    date_detection: datetime.datetime
    date_resolution: Optional[datetime.datetime] = None
    # Champs enrichis (informations jointes depuis d'autres tables)
    client_username: Optional[str] = None     # Nom du client (pour affichage)
    technicien_username: Optional[str] = None # Nom du technicien (pour affichage)
    modele_pac: Optional[str] = None          # Modèle de la pompe concernée
    sous_garantie: Optional[bool] = None      # La pompe est-elle sous garantie ?
    class Config:
        from_attributes = True

# --- Pour assigner un technicien à une anomalie ---
class AnomalyAssign(BaseModel):
    technicien_id: str  # ID du technicien à assigner


# ==========================================
# SCHÉMAS GARANTIES
# ==========================================

# --- Pour créer une nouvelle garantie ---
class GarantieCreate(BaseModel):
    pump_id: str                          # Pour quelle pompe ?
    duree_mois: Optional[int] = 24        # Durée en mois (24 mois par défaut = 2 ans)

# --- Réponse de l'API pour une garantie ---
class GarantieResponse(BaseModel):
    id: str
    pump_id: str
    date_debut: datetime.datetime
    date_fin: datetime.datetime
    sous_garantie: bool                   # True = la garantie est encore valide
    class Config:
        from_attributes = True


# ==========================================
# SCHÉMAS FACTURES DE RÉPARATION
# ==========================================

# --- Pour mettre à jour le statut d'une facture ---
class FactureUpdate(BaseModel):
    statut: str  # "payee" (payée), "annulee" (annulée), ou "en_attente"

# --- Réponse détaillée d'une facture ---
class FactureResponse(BaseModel):
    id: str
    anomaly_id: str
    client_id: str
    montant: float
    statut: str
    date_creation: datetime.datetime
    # Champs enrichis
    client_username: Optional[str] = None        # Nom du client
    niveau_anomalie: Optional[int] = None        # Gravité de l'anomalie liée
    description_anomalie: Optional[str] = None   # Description de l'anomalie liée
    class Config:
        from_attributes = True


# ==========================================
# SCHÉMA TECHNICIEN (réponse enrichie)
# ==========================================
class TechnicienResponse(BaseModel):
    id: str
    username: str
    email: str
    numero_serie: Optional[str] = None
    is_available: bool                           # Disponible ou occupé ?
    anomalies_en_cours: Optional[int] = 0        # Nombre d'anomalies en cours de traitement
    class Config:
        from_attributes = True


# ==========================================
# SCHÉMAS CAMPAGNES MARKETING (Offres)
# ==========================================

# --- Informations de base d'une campagne ---
class CampaignBase(BaseModel):
    titre: str                                   # Titre de l'offre
    description: str                             # Description détaillée
    image_url: Optional[str] = None              # Image promotionnelle (optionnel)
    lien_url: str                                # URL de redirection
    date_debut: datetime.datetime                # Date de début
    date_fin: datetime.datetime                  # Date de fin
    ciblage_zone: Optional[str] = "Toutes"       # Zone ciblée (H1, H2, H3 ou Toutes)
    ciblage_marque: Optional[str] = "Toutes"     # Marque ciblée (ou Toutes)
    statut: Optional[str] = "brouillon"          # brouillon / active / expiree

# --- Pour créer une nouvelle campagne (identique à la base) ---
class CampaignCreate(CampaignBase):
    pass

# --- Pour mettre à jour le statut d'une campagne ---
class CampaignUpdate(BaseModel):
    statut: Optional[str] = None

# --- Réponse de l'API pour une campagne ---
class CampaignResponse(CampaignBase):
    id: str
    date_creation: datetime.datetime
    class Config:
        from_attributes = True


# ==========================================
# SCHÉMAS FACTURES PDF (Invoices)
# ==========================================

# --- Réponse de l'API pour une facture PDF générée ---
class InvoiceResponse(BaseModel):
    id: str
    user_id: str
    facture_id: Optional[str] = None
    service_label: str                           # Description du service facturé
    montant_ht: float                            # Montant Hors Taxes
    tva: float                                   # Montant de la TVA (20%)
    montant_ttc: float                           # Montant Toutes Taxes Comprises
    date_emission: datetime.datetime             # Date de création du PDF
    pdf_path: Optional[str] = None               # Chemin du fichier PDF
    sent_by_email: bool                          # Email envoyé ? (True/False)
    numero_facture: str                          # Numéro unique de facture
    client_username: Optional[str] = None        # Nom du client (pour affichage)
    class Config:
        from_attributes = True
