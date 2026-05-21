# ============================================================
# FICHIER : models.py
# RÔLE : Définition de toutes les tables de la base de données
# Chaque classe = une table. Chaque attribut = une colonne.
# C'est ici qu'on définit la STRUCTURE des données du projet.
# ============================================================

import uuid
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, Integer, Text
from sqlalchemy.orm import relationship
import datetime

# Importation de la classe de base depuis database.py
from database import Base


# ==========================================
# TABLE : UTILISATEURS (users)
# Stocke tous les comptes : clients, techniciens et admins
# Chaque utilisateur a un rôle qui détermine ses droits
# ==========================================
class User(Base):
    __tablename__ = "users"  # Nom réel de la table dans la base de données

    # --- Identifiant unique ---
    # Généré automatiquement avec UUID (ex: "a1b2c3d4-...")
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)

    # --- Informations de connexion ---
    username = Column(String, unique=True, index=True)   # Nom d'utilisateur (unique)
    email = Column(String, unique=True, index=True)      # Adresse email (unique)
    hashed_password = Column(String)                      # Mot de passe (stocké tel quel ici, idéalement hashé)

    # --- Rôle de l'utilisateur ---
    # "client" = utilisateur final, "technicien" = réparateur, "admin" = administrateur
    role = Column(String, default="client")

    # --- Numéro de série (techniciens uniquement) ---
    # Identifie le technicien dans le système professionnel
    numero_serie = Column(String, unique=True, nullable=True)

    # --- Informations géographiques ---
    code_postal = Column(String, nullable=True)
    ville = Column(String, nullable=True)

    # --- Consentement RGPD ---
    # True = le client a accepté le stockage de ses données personnelles
    consentement_rgpd = Column(Boolean, default=False)

    # --- Disponibilité du technicien ---
    # True = le technicien est libre pour prendre une intervention
    # False = il est déjà occupé sur une anomalie
    is_available = Column(Boolean, default=True)

    # --- Technicien responsable (pour les clients) ---
    # Chaque client est automatiquement assigné à un technicien lors de l'inscription
    technicien_id = Column(String, ForeignKey("users.id"), nullable=True)

    # --- Relations avec les autres tables ---
    # Un utilisateur peut posséder plusieurs pompes à chaleur
    pumps = relationship("Pump", back_populates="owner")

    # Liste des anomalies assignées à ce technicien
    anomalies_assigned = relationship("Anomaly", back_populates="technicien", foreign_keys="Anomaly.technicien_id")

    # Liste des clients assignés à ce technicien
    clients_assigned = relationship("User", backref="assigned_technicien", remote_side=[id], foreign_keys=[technicien_id])


# ==========================================
# TABLE : POMPES À CHALEUR (pumps)
# Représente les machines physiques installées chez les clients
# Contient les données énergétiques utilisées par l'IA
# ==========================================
class Pump(Base):
    __tablename__ = "pumps"

    # --- Identifiant unique (utilisé aussi pour générer le QR Code) ---
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)

    # --- Propriétaire de la pompe (lien vers la table users) ---
    owner_id = Column(String, ForeignKey("users.id"))

    # --- Caractéristiques techniques de la pompe ---
    type_pac = Column(String)           # Type : Air/Eau, Air/Air, Géothermique...
    modele_pac = Column(String)         # Marque et modèle : ex "Daikin Altherma"
    zone_climatique = Column(String)    # Zone météo en France : H1, H2 ou H3

    # --- Données de consommation énergétique ---
    # Ces valeurs sont essentielles pour les calculs d'économies et l'IA
    conso_avant_kwh = Column(Float)              # Consommation AVANT installation (kWh/an)
    conso_estimee_apres_kwh = Column(Float)      # Consommation APRÈS installation (kWh/an)
    prix_kwh = Column(Float, default=0.25)       # Prix du kWh en euros (pour calculer les économies en €)
    date_activation = Column(DateTime, default=datetime.datetime.utcnow)  # Date de mise en service

    # --- Relations ---
    owner = relationship("User", back_populates="pumps")          # Lien vers le propriétaire
    anomalies = relationship("Anomaly", back_populates="pump")    # Anomalies détectées sur cette pompe
    garantie = relationship("Garantie", back_populates="pump", uselist=False)  # Garantie (une seule par pompe)


# ==========================================
# TABLE : JOURNAL DES SCANS QR (scan_logs)
# Enregistre chaque fois qu'un QR code est scanné
# Utile pour le suivi et les statistiques d'utilisation
# ==========================================
class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))      # Qui a scanné ?
    type_action = Column(String)                           # "activation" ou "consultation"
    adresse_ip = Column(String, nullable=True)             # Adresse IP du client (pour le RGPD)
    date_scan = Column(DateTime, default=datetime.datetime.utcnow)  # Quand ?


# ==========================================
# TABLE : ANOMALIES / PANNES (anomalies)
# Représente chaque problème détecté sur une pompe
# Peut être créée manuellement par l'admin ou automatiquement par l'IA
# ==========================================
class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    pump_id = Column(String, ForeignKey("pumps.id"), nullable=False)       # Quelle pompe est concernée ?
    client_id = Column(String, ForeignKey("users.id"), nullable=False)     # Quel client ?
    technicien_id = Column(String, ForeignKey("users.id"), nullable=True)  # Technicien assigné (peut être vide)

    # --- Niveau de gravité ---
    # 1 = Faible (surveillance), 2 = Moyen (intervention prévue), 3 = Critique (urgent)
    niveau = Column(Integer, default=1)

    # --- Description du problème ---
    description = Column(Text, nullable=True)

    # --- Statut de traitement ---
    # "ouvert" = signalé, "en_cours" = technicien assigné, "resolu" = réparé
    statut = Column(String, default="ouvert")

    date_detection = Column(DateTime, default=datetime.datetime.utcnow)  # Date de détection
    date_resolution = Column(DateTime, nullable=True)                      # Date de résolution (si résolu)

    # --- Relations ---
    pump = relationship("Pump", back_populates="anomalies")                                    # Pompe concernée
    client = relationship("User", foreign_keys=[client_id])                                     # Client propriétaire
    technicien = relationship("User", back_populates="anomalies_assigned", foreign_keys=[technicien_id])  # Technicien assigné
    facture = relationship("Facture", back_populates="anomaly", uselist=False)                  # Facture générée (si hors garantie)


# ==========================================
# TABLE : GARANTIES (garanties)
# Vérifie si une pompe est encore sous garantie
# Si oui → l'intervention est gratuite
# Si non → une facture est automatiquement créée
# ==========================================
class Garantie(Base):
    __tablename__ = "garanties"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    pump_id = Column(String, ForeignKey("pumps.id"), unique=True, nullable=False)  # Une seule garantie par pompe
    date_debut = Column(DateTime, default=datetime.datetime.utcnow)   # Début de la garantie
    date_fin = Column(DateTime, nullable=False)                        # Fin de la garantie

    # --- Relation ---
    pump = relationship("Pump", back_populates="garantie")


# ==========================================
# TABLE : FACTURES DE RÉPARATION (factures)
# Créée automatiquement quand une anomalie est détectée SUR une pompe HORS garantie
# Le montant dépend du niveau de gravité :
#   Niveau 1 → 50€ | Niveau 2 → 150€ | Niveau 3 → 350€
# Statuts possibles : "en_attente" / "payee" / "annulee"
# ==========================================
class Facture(Base):
    __tablename__ = "factures"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    anomaly_id = Column(String, ForeignKey("anomalies.id"), unique=True, nullable=False)  # Liée à quelle anomalie ?
    client_id = Column(String, ForeignKey("users.id"), nullable=False)                     # Quel client doit payer ?

    montant = Column(Float, default=0.0)              # Montant en euros
    statut = Column(String, default="en_attente")     # en_attente / payee / annulee
    date_creation = Column(DateTime, default=datetime.datetime.utcnow)

    # --- Relations ---
    anomaly = relationship("Anomaly", back_populates="facture")
    client = relationship("User", foreign_keys=[client_id])


# ==========================================
# TABLE : CAMPAGNES MARKETING (campaigns)
# Permet à l'admin de créer des offres promotionnelles
# ciblées par zone climatique et/ou marque de pompe
# Les clients voient uniquement les offres qui correspondent à leur profil
# ==========================================
class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    titre = Column(String, nullable=False)           # Titre de l'offre (ex: "Entretien -20%")
    description = Column(Text, nullable=False)       # Description détaillée
    image_url = Column(String, nullable=True)        # URL d'une image (optionnel)
    lien_url = Column(String, nullable=False)        # Lien de redirection quand le client clique
    date_debut = Column(DateTime, default=datetime.datetime.utcnow)  # Début de la campagne
    date_fin = Column(DateTime, nullable=False)                       # Fin de la campagne

    # --- Ciblage ---
    ciblage_zone = Column(String, nullable=True)     # "Toutes", "H1", "H2" ou "H3"
    ciblage_marque = Column(String, nullable=True)   # "Toutes" ou nom spécifique (ex: "Daikin")

    # --- Statut ---
    # "brouillon" = pas encore publiée, "active" = visible par les clients, "expiree" = terminée
    statut = Column(String, default="brouillon")
    date_creation = Column(DateTime, default=datetime.datetime.utcnow)


# ==========================================
# TABLE : FACTURES PDF GÉNÉRÉES (invoices)
# Créée automatiquement quand un paiement est confirmé (Facture → "payée")
# Contient le détail du montant (HT + TVA + TTC)
# et le chemin vers le fichier PDF téléchargeable
# ==========================================
class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)         # Quel client ?
    facture_id = Column(String, ForeignKey("factures.id"), nullable=True)    # Liée à quelle facture de réparation ?

    service_label = Column(String, nullable=False)          # Description du service (ex: "Intervention PAC Niveau 2")
    montant_ht = Column(Float, default=0.0)                 # Montant Hors Taxes
    tva = Column(Float, default=0.0)                        # Montant de la TVA (20%)
    montant_ttc = Column(Float, default=0.0)                # Montant Toutes Taxes Comprises
    date_emission = Column(DateTime, default=datetime.datetime.utcnow)  # Date de création du PDF
    pdf_path = Column(String, nullable=True)                # Chemin du fichier PDF sur le serveur
    sent_by_email = Column(Boolean, default=False)          # Est-ce que le PDF a été envoyé par email ?
    numero_facture = Column(String, nullable=False, unique=True)  # Numéro unique (ex: "EQR-20260514-A1B2C3")

    # --- Relation ---
    client = relationship("User", foreign_keys=[user_id])
