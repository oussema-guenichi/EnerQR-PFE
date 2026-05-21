# ============================================================
# FICHIER : main.py
# RÔLE : Fichier principal de l'API Backend (FastAPI)
# C'est ici que toutes les routes (endpoints) sont définies.
# Chaque route correspond à une URL que le frontend peut appeler.
# ============================================================

# --- Importation des librairies ---
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import FileResponse          # Pour envoyer des fichiers PDF en réponse
from fastapi.middleware.cors import CORSMiddleware   # Pour autoriser les requêtes du frontend
from fastapi.staticfiles import StaticFiles          # Pour servir les fichiers statiques (PDF)
from sqlalchemy.orm import Session                   # Pour interagir avec la base de données
from datetime import datetime, timedelta             # Pour manipuler les dates
from typing import List                              # Pour typer les listes
import os                                            # Pour gérer les chemins de fichiers
import uuid                                          # Pour générer des identifiants uniques
import smtplib                                       # Pour envoyer des emails (SMTP)
from email.mime.multipart import MIMEMultipart       # Pour construire un email avec pièce jointe
from email.mime.base import MIMEBase                 # Pour la pièce jointe PDF
from email.mime.text import MIMEText                 # Pour le corps de l'email
from email import encoders                           # Pour encoder la pièce jointe en base64

# --- Importation des fichiers internes du projet ---
import models    # Les modèles (tables de la base de données)
import schemas   # Les schémas de validation (Pydantic)
from database import SessionLocal, engine, get_db    # La connexion à la base de données

# --- Importation des modules d'Intelligence Artificielle ---
import enerqr_ai.prediction as prediction_service    # Module de prédiction de consommation
import enerqr_ai.anomaly as anomaly_service          # Module de détection d'anomalies
import enerqr_ai.chat as chat_service                # Module de chatbot intelligent


# ============================================================
# INITIALISATION DE L'APPLICATION
# ============================================================

# Créer toutes les tables dans la base de données
# Si une table existe déjà, elle n'est pas recréée
models.Base.metadata.create_all(bind=engine)

# Créer le dossier "invoices/" pour stocker les PDF générés
INVOICES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "invoices")
os.makedirs(INVOICES_DIR, exist_ok=True)

# Créer l'application FastAPI
app = FastAPI(title="EnerQR API Phase 3")

# Monter le dossier des factures PDF comme fichiers statiques
# Cela permet d'y accéder via l'URL /invoices_static/nom_du_fichier.pdf
app.mount("/invoices_static", StaticFiles(directory=INVOICES_DIR), name="invoices_static")

# --- Configuration CORS ---
# CORS (Cross-Origin Resource Sharing) autorise le frontend React
# (qui tourne sur un port différent) à communiquer avec cette API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # Accepter les requêtes de n'importe quelle origine
    allow_credentials=True,
    allow_methods=["*"],         # Autoriser toutes les méthodes HTTP (GET, POST, PUT, DELETE)
    allow_headers=["*"],         # Autoriser tous les en-têtes
)


# ============================================================
# CONFIGURATION EMAIL (SMTP)
# Pour envoyer automatiquement les factures PDF par email
# Si ces variables sont vides, l'envoi est simulé (affiché dans la console)
# ============================================================
SMTP_HOST = os.getenv("SMTP_HOST", "")           # Serveur SMTP (ex: smtp.gmail.com)
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))   # Port SMTP (587 = TLS standard)
SMTP_USER = os.getenv("SMTP_USER", "")           # Votre adresse email
SMTP_PASS = os.getenv("SMTP_PASS", "")           # Mot de passe d'application


# ============================================================
# FONCTION : Génération de facture PDF professionnelle
# Utilise la librairie ReportLab pour créer un PDF formaté
# avec en-tête EnerQR, tableau des montants, et pied de page
# ============================================================
def generate_invoice_pdf(invoice_id: str, numero_facture: str,
                         client_name: str, client_email: str,
                         service_label: str, montant_ht: float,
                         tva: float, montant_ttc: float,
                         date_emission: datetime) -> str:
    """ Génère un PDF de facture professionnel et retourne le chemin du fichier """

    # Importation des composants ReportLab nécessaires
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT

    # Nom et chemin du fichier PDF
    filename = f"facture_{numero_facture}.pdf"
    filepath = os.path.join(INVOICES_DIR, filename)

    # Créer le document PDF au format A4 avec des marges
    doc = SimpleDocTemplate(filepath, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    # --- Définition des styles personnalisés ---
    title_style = ParagraphStyle('InvoiceTitle', parent=styles['Title'],
                                  fontSize=24, textColor=colors.HexColor('#0F172A'),
                                  spaceAfter=6)
    subtitle_style = ParagraphStyle('InvoiceSubtitle', parent=styles['Normal'],
                                     fontSize=10, textColor=colors.HexColor('#64748B'),
                                     spaceAfter=20)
    heading_style = ParagraphStyle('InvoiceHeading', parent=styles['Heading2'],
                                    fontSize=13, textColor=colors.HexColor('#26C485'),
                                    spaceAfter=10, spaceBefore=20)
    normal_style = ParagraphStyle('InvoiceNormal', parent=styles['Normal'],
                                   fontSize=10, textColor=colors.HexColor('#334155'),
                                   spaceAfter=4)
    right_style = ParagraphStyle('InvoiceRight', parent=styles['Normal'],
                                  fontSize=10, textColor=colors.HexColor('#334155'),
                                  alignment=TA_RIGHT, spaceAfter=4)
    footer_style = ParagraphStyle('InvoiceFooter', parent=styles['Normal'],
                                   fontSize=8, textColor=colors.HexColor('#94A3B8'),
                                   alignment=TA_CENTER, spaceBefore=30)

    elements = []

    # --- En-tête : Logo textuel EnerQR ---
    elements.append(Paragraph("<font color='#26C485'><b>Ener</b></font><font color='#0F172A'><b>QR</b></font>", title_style))
    elements.append(Paragraph("Système Intelligent de Gestion des Pompes à Chaleur", subtitle_style))
    elements.append(Spacer(1, 10))

    # --- Ligne de séparation verte ---
    sep_data = [['']]
    sep_table = Table(sep_data, colWidths=[16*cm])
    sep_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 2, colors.HexColor('#26C485')),
    ]))
    elements.append(sep_table)
    elements.append(Spacer(1, 15))

    # --- Informations de la facture (numéro, date, client) ---
    elements.append(Paragraph("FACTURE", heading_style))
    date_str = date_emission.strftime("%d/%m/%Y")

    info_data = [
        [Paragraph(f"<b>N° Facture :</b> {numero_facture}", normal_style),
         Paragraph(f"<b>Date :</b> {date_str}", right_style)],
        [Paragraph(f"<b>Client :</b> {client_name}", normal_style),
         Paragraph(f"<b>Email :</b> {client_email}", right_style)],
    ]
    info_table = Table(info_data, colWidths=[8*cm, 8*cm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # --- Tableau des détails de la prestation ---
    elements.append(Paragraph("DÉTAILS DE LA PRESTATION", heading_style))

    detail_data = [
        ['Description', 'Montant HT', 'TVA (20%)', 'Montant TTC'],
        [service_label, f"{montant_ht:.2f} €", f"{tva:.2f} €", f"{montant_ttc:.2f} €"],
    ]
    detail_table = Table(detail_data, colWidths=[7*cm, 3*cm, 3*cm, 3*cm])
    detail_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),   # En-tête sombre
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),                   # Texte blanc
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),                          # Colonnes montants centrées
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F8FAFC')),   # Fond clair pour les données
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 10),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),   # Bordures légères
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(detail_table)
    elements.append(Spacer(1, 15))

    # --- Ligne du total TTC ---
    total_data = [
        ['', '', Paragraph("<b>TOTAL TTC</b>", right_style),
         Paragraph(f"<b><font color='#26C485'>{montant_ttc:.2f} €</font></b>", right_style)],
    ]
    total_table = Table(total_data, colWidths=[7*cm, 3*cm, 3*cm, 3*cm])
    total_table.setStyle(TableStyle([
        ('LINEABOVE', (2,0), (3,0), 1, colors.HexColor('#26C485')),
        ('TOPPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(total_table)
    elements.append(Spacer(1, 30))

    # --- Pied de page ---
    elements.append(Paragraph("Merci pour votre confiance.", normal_style))
    elements.append(Paragraph("Cette facture a été générée automatiquement par le système EnerQR.", footer_style))
    elements.append(Paragraph("EnerQR © 2024 — Tous droits réservés | contact@enerqr.fr", footer_style))

    # Construire et sauvegarder le PDF
    doc.build(elements)
    return filepath


# ============================================================
# FONCTION : Envoi de facture par email
# Envoie le PDF en pièce jointe au client
# Si SMTP n'est pas configuré, l'envoi est simplement simulé
# ============================================================
def send_invoice_email(client_email: str, client_name: str, pdf_path: str, numero_facture: str):
    """ Envoie le PDF de facture par email au client. Simule l'envoi si SMTP non configuré. """

    # Si le SMTP n'est pas configuré, on simule l'envoi (affichage console)
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL SIMULÉ] Facture {numero_facture} envoyée à {client_email} (SMTP non configuré)")
        return False

    try:
        # Construire l'email
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = client_email
        msg['Subject'] = f"EnerQR — Votre facture {numero_facture}"

        # Corps du message
        body = f"""Bonjour {client_name},\n\nVeuillez trouver ci-joint votre facture N° {numero_facture}.\n\nCordialement,\nL'équipe EnerQR"""
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        # Ajouter le PDF en pièce jointe
        with open(pdf_path, 'rb') as f:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename=facture_{numero_facture}.pdf')
            msg.attach(part)

        # Se connecter au serveur SMTP et envoyer
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()                        # Activer le chiffrement TLS
        server.login(SMTP_USER, SMTP_PASS)       # S'authentifier
        server.send_message(msg)                  # Envoyer l'email
        server.quit()                             # Fermer la connexion
        print(f"[EMAIL] Facture {numero_facture} envoyée avec succès à {client_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERREUR] Impossible d'envoyer à {client_email}: {e}")
        return False


# ============================================================
# FONCTIONS UTILITAIRES
# ============================================================

# --- Barème des tarifs selon le niveau de l'anomalie ---
# Niveau 1 (Faible) → 50€ | Niveau 2 (Moyen) → 150€ | Niveau 3 (Critique) → 350€
MONTANTS_PAR_NIVEAU = {1: 50.0, 2: 150.0, 3: 350.0}

def get_montant(niveau: int) -> float:
    """ Retourne le montant de la facture selon le niveau de gravité """
    return MONTANTS_PAR_NIVEAU.get(niveau, 50.0)

# --- Vérificateur de garantie ---
def check_garantie(pump_id: str, db: Session) -> bool:
    """ Vérifie si une pompe est encore sous garantie (True = sous garantie) """
    garantie = db.query(models.Garantie).filter(models.Garantie.pump_id == pump_id).first()
    if not garantie:
        return False
    return datetime.utcnow() <= garantie.date_fin


# ============================================================
# SECTION : AUTHENTIFICATION (Inscription + Connexion)
# Routes : POST /auth/register, POST /auth/login
# ============================================================

@app.post("/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """ Créer un nouveau compte utilisateur (client, technicien ou admin) """

    # Vérifier que le nom d'utilisateur n'est pas déjà pris
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris.")

    # Vérifier que l'email n'est pas déjà utilisé
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà enregistré.")

    # --- Vérification spéciale pour les techniciens ---
    # Un technicien doit fournir un numéro de série unique
    if user.role == "technicien":
        if not user.numero_serie:
            raise HTTPException(status_code=400, detail="Numéro de série obligatoire pour technicien.")
        if db.query(models.User).filter(models.User.numero_serie == user.numero_serie).first():
            raise HTTPException(status_code=400, detail="Numéro de série déjà utilisé.")

    # --- Vérification spéciale pour les admins ---
    # Un admin doit fournir le code secret : "ENERQR-ADMIN-2024"
    if user.role == "admin":
        CODE_ADMIN_SECRET = "ENERQR-ADMIN-2024"
        if not user.numero_serie or user.numero_serie != CODE_ADMIN_SECRET:
            raise HTTPException(status_code=403, detail="Code Admin incorrect. Acces refuse.")
        user.numero_serie = None  # On ne stocke pas le code secret en base

    # --- Assignation automatique d'un technicien au client (Load Balancing) ---
    # Le système choisit le technicien qui a le moins de clients
    assigned_tech_id = None
    if user.role == "client":
        all_techs = db.query(models.User).filter(models.User.role == "technicien").all()
        if all_techs:
            # On sélectionne le technicien avec le moins de clients assignés
            tech_with_min_clients = min(
                all_techs,
                key=lambda t: db.query(models.User).filter(
                    models.User.technicien_id == t.id,
                    models.User.role == "client"
                ).count()
            )
            assigned_tech_id = tech_with_min_clients.id

    # Créer l'utilisateur dans la base de données
    db_user = models.User(
        username=user.username, email=user.email,
        hashed_password=user.password, role=user.role,
        numero_serie=user.numero_serie,
        code_postal=user.code_postal, ville=user.ville,
        is_available=True,
        technicien_id=assigned_tech_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # --- Création automatique d'une pompe par défaut pour chaque nouveau client ---
    if db_user.role == "client":
        default_pump = models.Pump(
            owner_id=db_user.id,
            type_pac="Air/Eau (Défaut)",
            modele_pac="Standard EnerQR",
            zone_climatique="H1",
            conso_avant_kwh=15000.0,
            conso_estimee_apres_kwh=4500.0
        )
        db.add(default_pump)
        db.flush()

        # Ajouter une garantie de 6 mois automatiquement (180 jours)
        garantie = models.Garantie(
            pump_id=default_pump.id,
            date_debut=datetime.utcnow(),
            date_fin=datetime.utcnow() + timedelta(days=180)
        )
        db.add(garantie)
        db.commit()

    return db_user

@app.post("/auth/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    """ Connecter un utilisateur existant avec son nom, mot de passe, rôle et code secret (si applicable) """
    db_user = db.query(models.User).filter(
        models.User.username == user.username,
        models.User.hashed_password == user.password
    ).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Identifiants incorrects")
    
    if db_user.role != user.role:
        raise HTTPException(status_code=400, detail=f"Rôle incorrect. Cet utilisateur est un {db_user.role}.")
        
    if user.role == "technicien":
        if not user.numero_serie or db_user.numero_serie != user.numero_serie:
            raise HTTPException(status_code=403, detail="Numéro de série incorrect pour ce technicien.")
            
    if user.role == "admin":
        CODE_ADMIN_SECRET = "ENERQR-ADMIN-2024"
        if not user.numero_serie or user.numero_serie != CODE_ADMIN_SECRET:
            raise HTTPException(status_code=403, detail="Code Admin incorrect. Accès refusé.")

    return {"message": "Success", "user_id": db_user.id, "role": db_user.role, "consentement_rgpd": db_user.consentement_rgpd}


# ============================================================
# SECTION : ESPACE CLIENT
# Routes accessibles par les clients connectés
# ============================================================

@app.get("/client/{user_id}", response_model=schemas.UserResponse)
def get_client(user_id: str, db: Session = Depends(get_db)):
    """ Récupérer les informations complètes d'un client (y compris son technicien) """
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "client").first()
    if not user:
        raise HTTPException(status_code=404, detail="Client introuvable")
    
    # Enrichir la réponse avec les infos du technicien responsable
    if user.technicien_id:
        tech = db.query(models.User).filter(models.User.id == user.technicien_id).first()
        if tech:
            user.technicien_username = tech.username
            user.technicien_email = tech.email

    return user

@app.post("/client/{user_id}/activate")
def activate_client(user_id: str, payload: schemas.ClientActivate, request: Request, db: Session = Depends(get_db)):
    """ Activer le compte du client (acceptation du consentement RGPD) """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Client introuvable")

    # Enregistrer le consentement RGPD
    user.consentement_rgpd = payload.consentement_rgpd
    user.date_consentement = datetime.utcnow()

    # Mettre à jour la date d'activation de toutes ses pompes
    for pump in user.pumps:
        pump.date_activation = datetime.utcnow()

    # Enregistrer le scan dans le journal (avec l'adresse IP)
    log = models.ScanLog(user_id=user_id, type_action="activation", adresse_ip=request.client.host)
    db.add(log)
    db.commit()
    return {"status": "success"}

@app.get("/client/{user_id}/stats", response_model=schemas.StatsResponse)
def get_client_stats(user_id: str, request: Request, db: Session = Depends(get_db)):
    """ Calculer et retourner les statistiques d'économies d'énergie du client """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Client introuvable")

    # Enregistrer cette consultation dans le journal
    ip_address = request.client.host if request.client else "127.0.0.1"
    log = models.ScanLog(user_id=user_id, type_action="consultation", adresse_ip=ip_address)
    db.add(log)
    db.commit()

    # --- Calcul des économies ---
    total_economies_an = 0    # Économies annuelles en kWh
    total_economies_eur = 0   # Économies annuelles en euros
    total_conso = 0           # Consommation cumulée
    total_cumulee_eur = 0     # Économies cumulées en euros

    for p in user.pumps:
        # Économie = consommation avant - consommation après
        econ = p.conso_avant_kwh - p.conso_estimee_apres_kwh
        total_economies_an += econ
        total_economies_eur += econ * p.prix_kwh

        # Calculer le nombre de mois écoulés depuis l'installation
        delta = datetime.utcnow() - p.date_activation
        mois = delta.days / 30.0 if delta.days > 0 else 0

        # Économies cumulées = (économie mensuelle) × nombre de mois
        total_cumulee_eur += ((econ * p.prix_kwh) / 12) * mois
        total_conso += (p.conso_estimee_apres_kwh / 12) * mois

    return schemas.StatsResponse(
        economies_kwh_an=total_economies_an,
        economies_eur_an=total_economies_eur,
        mois_ecoules=4.0,
        economies_cumulees_eur=round(total_cumulee_eur, 2),
        conso_cumulee_kwh=round(total_conso, 2)
    )


# ============================================================
# SECTION : INTELLIGENCE ARTIFICIELLE
# Chatbot intelligent + Prédiction de consommation
# ============================================================

@app.post("/client/{user_id}/chat")
def chat_with_ai(user_id: str, message: str, db: Session = Depends(get_db)):
    """ Envoyer un message au chatbot IA et recevoir une réponse personnalisée """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    pump = user.pumps[0] if user.pumps else None
    # Le chatbot utilise les données de la pompe pour personnaliser ses réponses
    response = chat_service.get_chat_response(message, pump)
    return {"reply": response}

@app.get("/client/{user_id}/predict")
def predict_consumption(user_id: str, db: Session = Depends(get_db)):
    """ Prédire la consommation de la semaine prochaine grâce à l'IA """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.pumps:
        return {"prediction_kwh": 0}
    # Le modèle IA analyse les données de la pompe pour prédire la consommation future
    prediction = prediction_service.predict_weekly_consumption(user.pumps[0])
    return {"prediction_kwh": prediction}


# ============================================================
# SECTION : ADMINISTRATION
# Routes réservées aux administrateurs pour gérer le système
# ============================================================

@app.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    """ Retourner les statistiques globales du système (nombre de clients, pompes, économies) """
    users = db.query(models.User).filter(models.User.role == "client").all()
    pumps = db.query(models.Pump).all()
    activations = sum(1 for u in users if u.consentement_rgpd)  # Nombre de clients ayant activé le RGPD
    total_economies = sum((p.conso_avant_kwh - p.conso_estimee_apres_kwh) for p in pumps)
    return {
        "total_clients": len(users),
        "total_pumps": len(pumps),
        "activations": activations,
        "total_economies_kwh_an": total_economies
    }

@app.get("/admin/users")
def get_admin_users(db: Session = Depends(get_db)):
    """ Lister tous les clients inscrits """
    users = db.query(models.User).filter(models.User.role == "client").all()
    return [{"id": u.id, "username": u.username, "email": u.email, "consentement_rgpd": u.consentement_rgpd} for u in users]

@app.get("/admin/pumps")
def get_admin_pumps(db: Session = Depends(get_db)):
    """ Lister toutes les pompes avec détection d'anomalie IA en temps réel """
    pumps = db.query(models.Pump).all()
    results = []
    for p in pumps:
        u = p.owner
        # L'IA analyse chaque pompe pour détecter d'éventuelles anomalies
        is_anomaly, _ = anomaly_service.detect_anomaly(p)
        results.append({
            "id": p.id,
            "owner_id": p.owner_id,
            "client_username": u.username if u else "Inconnu",
            "type_pac": p.type_pac,
            "modele_pac": p.modele_pac,
            "zone_climatique": p.zone_climatique,
            "conso_avant_kwh": p.conso_avant_kwh,
            "conso_estimee_apres_kwh": p.conso_estimee_apres_kwh,
            "ia_anomaly": is_anomaly   # True = l'IA a détecté un comportement anormal
        })
    return results

@app.delete("/admin/clients/{user_id}")
def delete_client(user_id: str, db: Session = Depends(get_db)):
    """ Supprimer un client et toutes ses données """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    db.delete(user)
    db.commit()
    return {"status": "success"}

@app.get("/pump/{pump_id}")
def get_pump_info(pump_id: str, db: Session = Depends(get_db)):
    """ Récupérer le propriétaire d'une pompe (utilisé lors du scan QR) """
    pump = db.query(models.Pump).filter(models.Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404)
    return {"owner_id": pump.owner_id}

@app.post("/admin/pumps", response_model=schemas.PumpResponse)
def create_pump(pump: schemas.PumpCreate, db: Session = Depends(get_db)):
    """ Créer une nouvelle pompe à chaleur et l'associer à un client """
    db_pump = models.Pump(**pump.model_dump())
    db.add(db_pump)
    db.commit()
    db.refresh(db_pump)
    return db_pump


# ============================================================
# SECTION : GESTION DES TECHNICIENS
# ============================================================

@app.get("/admin/techniciens")
def get_techniciens(db: Session = Depends(get_db)):
    """ Lister tous les techniciens avec leur nombre d'interventions en cours """
    techniciens = db.query(models.User).filter(models.User.role == "technicien").all()
    results = []
    for t in techniciens:
        # Compter combien d'anomalies sont actuellement en cours pour ce technicien
        en_cours = db.query(models.Anomaly).filter(
            models.Anomaly.technicien_id == t.id,
            models.Anomaly.statut == "en_cours"
        ).count()
        results.append({
            "id": t.id,
            "username": t.username,
            "email": t.email,
            "numero_serie": t.numero_serie,
            "is_available": t.is_available,    # True = disponible, False = occupé
            "anomalies_en_cours": en_cours
        })
    return results


# ============================================================
# SECTION : GESTION DES ANOMALIES (Pannes)
# Création, assignation de technicien, et résolution
# ============================================================

@app.get("/admin/anomalies")
def get_anomalies(db: Session = Depends(get_db)):
    """ Lister toutes les anomalies, triées par gravité (les plus critiques en premier) """
    anomalies = db.query(models.Anomaly).order_by(models.Anomaly.niveau.desc(), models.Anomaly.date_detection.desc()).all()
    results = []
    for a in anomalies:
        sous_gar = check_garantie(a.pump_id, db)  # Vérifier si sous garantie
        results.append({
            "id": a.id,
            "pump_id": a.pump_id,
            "client_id": a.client_id,
            "technicien_id": a.technicien_id,
            "niveau": a.niveau,
            "description": a.description,
            "statut": a.statut,
            "date_detection": a.date_detection,
            "date_resolution": a.date_resolution,
            "client_username": a.client.username if a.client else "Inconnu",
            "technicien_username": a.technicien.username if a.technicien else None,
            "modele_pac": a.pump.modele_pac if a.pump else "Inconnu",
            "sous_garantie": sous_gar
        })
    return results

@app.post("/admin/anomalies")
def create_anomaly(anomaly: schemas.AnomalyCreate, db: Session = Depends(get_db)):
    """ Signaler une nouvelle anomalie. Si la pompe n'est PAS sous garantie, une facture est créée automatiquement """
    pump = db.query(models.Pump).filter(models.Pump.id == anomaly.pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="Pompe introuvable")

    # Créer l'anomalie dans la base
    db_anomaly = models.Anomaly(
        pump_id=anomaly.pump_id,
        client_id=anomaly.client_id,
        niveau=anomaly.niveau,
        description=anomaly.description,
        statut="en_cours" if anomaly.technicien_id else "ouvert",  # Si un technicien est déjà assigné → en cours
        technicien_id=anomaly.technicien_id
    )
    db.add(db_anomaly)
    db.flush()  # Obtenir l'ID avant le commit

    # Vérifier si la pompe est sous garantie
    sous_garantie = check_garantie(anomaly.pump_id, db)

    # Si HORS garantie → créer automatiquement une facture de réparation
    if not sous_garantie:
        montant = get_montant(anomaly.niveau)
        facture = models.Facture(
            anomaly_id=db_anomaly.id,
            client_id=anomaly.client_id,
            montant=montant,
            statut="en_attente"
        )
        db.add(facture)
    
    db.commit()
    db.refresh(db_anomaly)
    return {
        "id": db_anomaly.id,
        "statut": db_anomaly.statut,
        "sous_garantie": sous_garantie,
        "facture_creee": not sous_garantie,        # True si une facture a été créée
        "montant": get_montant(anomaly.niveau) if not sous_garantie else 0
    }

@app.put("/admin/anomalies/{anomaly_id}/assign")
def assign_technicien(anomaly_id: str, payload: schemas.AnomalyAssign, db: Session = Depends(get_db)):
    """ Assigner un technicien à une anomalie. Le technicien passe en statut "occupé" """
    anomaly = db.query(models.Anomaly).filter(models.Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomalie introuvable")

    technicien = db.query(models.User).filter(
        models.User.id == payload.technicien_id,
        models.User.role == "technicien"
    ).first()
    if not technicien:
        raise HTTPException(status_code=404, detail="Technicien introuvable")
    if not technicien.is_available:
        raise HTTPException(status_code=400, detail="Ce technicien est déjà occupé.")

    # Assigner le technicien et changer les statuts
    anomaly.technicien_id = payload.technicien_id
    anomaly.statut = "en_cours"
    technicien.is_available = False  # Le technicien est maintenant occupé

    db.commit()
    return {"status": "success", "message": f"Technicien {technicien.username} assigné à l'anomalie."}

@app.put("/admin/anomalies/{anomaly_id}/resolve")
def resolve_anomaly(anomaly_id: str, db: Session = Depends(get_db)):
    """ Marquer une anomalie comme résolue et libérer le technicien """
    anomaly = db.query(models.Anomaly).filter(models.Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomalie introuvable")

    anomaly.statut = "resolu"
    anomaly.date_resolution = datetime.utcnow()

    # Libérer le technicien (il redevient disponible pour d'autres interventions)
    if anomaly.technicien_id:
        technicien = db.query(models.User).filter(models.User.id == anomaly.technicien_id).first()
        if technicien:
            technicien.is_available = True

    db.commit()
    return {"status": "success", "message": "Anomalie résolue. Technicien libéré."}


# ============================================================
# SECTION : GESTION DES GARANTIES
# Vérification, création et suppression de garanties
# ============================================================

@app.get("/admin/garanties")
def get_garanties(db: Session = Depends(get_db)):
    """ Lister toutes les garanties avec leur statut actuel (active ou expirée) """
    garanties = db.query(models.Garantie).all()
    results = []
    for g in garanties:
        sous_gar = datetime.utcnow() <= g.date_fin  # True = encore valide
        pump = g.pump
        results.append({
            "id": g.id,
            "pump_id": g.pump_id,
            "modele_pac": pump.modele_pac if pump else "Inconnu",
            "client_username": pump.owner.username if pump and pump.owner else "Inconnu",
            "date_debut": g.date_debut,
            "date_fin": g.date_fin,
            "sous_garantie": sous_gar
        })
    return results

@app.post("/admin/garanties")
def create_garantie(payload: schemas.GarantieCreate, db: Session = Depends(get_db)):
    """ Créer une nouvelle garantie pour une pompe (durée par défaut : 24 mois) """
    pump = db.query(models.Pump).filter(models.Pump.id == payload.pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="Pompe introuvable")
    
    # Vérifier qu'il n'y a pas déjà une garantie pour cette pompe
    existing = db.query(models.Garantie).filter(models.Garantie.pump_id == payload.pump_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cette pompe a déjà une garantie enregistrée.")

    date_debut = datetime.utcnow()
    date_fin = date_debut + timedelta(days=payload.duree_mois * 30)  # Conversion mois → jours
    
    garantie = models.Garantie(pump_id=payload.pump_id, date_debut=date_debut, date_fin=date_fin)
    db.add(garantie)
    db.commit()
    db.refresh(garantie)
    return {
        "id": garantie.id, "pump_id": garantie.pump_id,
        "date_debut": garantie.date_debut, "date_fin": garantie.date_fin,
        "sous_garantie": True
    }

@app.delete("/admin/garanties/{garantie_id}")
def delete_garantie(garantie_id: str, db: Session = Depends(get_db)):
    """ Supprimer / révoquer une garantie """
    garantie = db.query(models.Garantie).filter(models.Garantie.id == garantie_id).first()
    if not garantie:
        raise HTTPException(status_code=404, detail="Garantie introuvable")
    db.delete(garantie)
    db.commit()
    return {"status": "success", "message": "Garantie supprimée."}

@app.get("/admin/garanties/{pump_id}/check")
def check_garantie_pump(pump_id: str, db: Session = Depends(get_db)):
    """ Vérifier rapidement si une pompe est sous garantie """
    sous_gar = check_garantie(pump_id, db)
    garantie = db.query(models.Garantie).filter(models.Garantie.pump_id == pump_id).first()
    return {
        "pump_id": pump_id,
        "sous_garantie": sous_gar,
        "date_fin": garantie.date_fin if garantie else None
    }


# ============================================================
# SECTION : GESTION DES FACTURES DE RÉPARATION
# Lister les factures + confirmer/annuler un paiement
# Quand un paiement est confirmé → génération automatique du PDF
# ============================================================

@app.get("/admin/factures")
def get_factures(db: Session = Depends(get_db)):
    """ Lister toutes les factures triées par date (les plus récentes en premier) """
    factures = db.query(models.Facture).order_by(models.Facture.date_creation.desc()).all()
    results = []
    for f in factures:
        results.append({
            "id": f.id,
            "anomaly_id": f.anomaly_id,
            "client_id": f.client_id,
            "montant": f.montant,
            "statut": f.statut,
            "date_creation": f.date_creation,
            "client_username": f.client.username if f.client else "Inconnu",
            "niveau_anomalie": f.anomaly.niveau if f.anomaly else None,
            "description_anomalie": f.anomaly.description if f.anomaly else None
        })
    return results

@app.put("/admin/factures/{facture_id}")
def update_facture(facture_id: str, payload: schemas.FactureUpdate, db: Session = Depends(get_db)):
    """
    Mettre à jour le statut d'une facture : "payee", "annulee" ou "en_attente".
    ⭐ HOOK AUTOMATIQUE : Si le statut passe à "payee", le système :
       1. Génère un PDF de facture professionnel
       2. Tente de l'envoyer par email au client
       3. Enregistre la facture PDF dans la base de données
    """
    facture = db.query(models.Facture).filter(models.Facture.id == facture_id).first()
    if not facture:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    if payload.statut not in ["payee", "annulee", "en_attente"]:
        raise HTTPException(status_code=400, detail="Statut invalide.")
    
    old_statut = facture.statut              # Sauvegarder l'ancien statut pour comparer
    facture.statut = payload.statut
    db.commit()

    invoice_generated = False
    invoice_numero = None

    # === HOOK : Quand le paiement est confirmé → Générer la facture PDF ===
    if payload.statut == "payee" and old_statut != "payee":
        client = db.query(models.User).filter(models.User.id == facture.client_id).first()
        anomaly = db.query(models.Anomaly).filter(models.Anomaly.id == facture.anomaly_id).first()
        
        if client:
            # Calculer les montants HT, TVA et TTC
            montant_ht = round(facture.montant / 1.20, 2)   # HT = TTC ÷ 1.20
            tva = round(facture.montant - montant_ht, 2)     # TVA = TTC - HT
            montant_ttc = facture.montant
            
            # Générer un numéro de facture unique (ex: "EQR-20260514-A1B2C3")
            numero = f"EQR-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
            
            # Construire la description du service
            service_desc = f"Intervention maintenance PAC — Niveau {anomaly.niveau if anomaly else '?'}"
            if anomaly and anomaly.description:
                service_desc += f" ({anomaly.description[:60]})"
            
            # Générer le PDF
            try:
                pdf_path = generate_invoice_pdf(
                    invoice_id=str(uuid.uuid4()),
                    numero_facture=numero,
                    client_name=client.username,
                    client_email=client.email,
                    service_label=service_desc,
                    montant_ht=montant_ht,
                    tva=tva,
                    montant_ttc=montant_ttc,
                    date_emission=datetime.utcnow()
                )
                
                # Envoyer le PDF par email (ou simuler si SMTP pas configuré)
                email_sent = send_invoice_email(client.email, client.username, pdf_path, numero)
                
                # Sauvegarder la facture PDF dans la base de données
                invoice = models.Invoice(
                    user_id=client.id,
                    facture_id=facture.id,
                    service_label=service_desc,
                    montant_ht=montant_ht,
                    tva=tva,
                    montant_ttc=montant_ttc,
                    pdf_path=pdf_path,
                    sent_by_email=email_sent,
                    numero_facture=numero
                )
                db.add(invoice)
                db.commit()
                invoice_generated = True
                invoice_numero = numero
                print(f"[INVOICE] Facture PDF {numero} générée pour {client.username}")
            except Exception as e:
                print(f"[INVOICE ERREUR] Erreur génération PDF: {e}")

    return {
        "status": "success",
        "facture_id": facture_id,
        "nouveau_statut": payload.statut,
        "invoice_generated": invoice_generated,
        "invoice_numero": invoice_numero
    }


# ============================================================
# SECTION : ESPACE TECHNICIEN
# Routes permettant au technicien de voir ses clients
# et de mettre à jour leurs données de consommation
# ============================================================

@app.get("/technicien/{tech_id}/clients")
def get_technicien_clients(tech_id: str, db: Session = Depends(get_db)):
    """ Récupérer la liste des clients assignés à un technicien """
    clients = db.query(models.User).filter(
        models.User.technicien_id == tech_id,
        models.User.role == "client"
    ).all()
    
    results = []
    for c in clients:
        pump = c.pumps[0] if c.pumps else None  # Récupérer la pompe associée
        results.append({
            "id": c.id,
            "username": c.username,
            "email": c.email,
            "ville": c.ville,
            "pump_model": pump.modele_pac if pump else "Non définie",
            "conso_avant": pump.conso_avant_kwh if pump else 0,
            "conso_apres": pump.conso_estimee_apres_kwh if pump else 0,
            "pump_id": pump.id if pump else None
        })
    return results

@app.put("/technicien/client/{client_id}/consumption")
def update_client_consumption(client_id: str, payload: schemas.ConsumptionUpdate, db: Session = Depends(get_db)):
    """
    Permettre au technicien de mettre à jour les données de consommation d'un client.
    Après la mise à jour, l'IA vérifie automatiquement s'il y a une anomalie.
    Si une anomalie est détectée, elle est créée automatiquement dans le système.
    """
    user = db.query(models.User).filter(models.User.id == client_id, models.User.role == "client").first()
    if not user:
        raise HTTPException(status_code=404, detail="Client introuvable")
    
    if not user.pumps:
         raise HTTPException(status_code=404, detail="Aucune pompe associée à ce client")
    
    # Mettre à jour les données de consommation
    pump = user.pumps[0]
    pump.conso_avant_kwh = payload.conso_avant_kwh
    pump.conso_estimee_apres_kwh = payload.conso_estimee_apres_kwh
    
    # Vérifier automatiquement s'il y a une anomalie (grâce à l'IA)
    import enerqr_ai.anomaly as anomaly_service
    is_anomaly, score = anomaly_service.detect_anomaly(pump)
    
    message = "Consommation mise à jour par le technicien."
    
    # Si l'IA détecte une anomalie → la créer automatiquement
    if is_anomaly:
        # Vérifier qu'il n'y a pas déjà une anomalie ouverte pour cette pompe
        existing_anomaly = db.query(models.Anomaly).filter(
            models.Anomaly.pump_id == pump.id,
            models.Anomaly.statut.in_(["ouvert", "en_cours"])
        ).first()
        
        if not existing_anomaly:
            # Créer l'anomalie automatiquement
            new_anomaly = models.Anomaly(
                pump_id=pump.id,
                client_id=user.id,
                niveau=3 if score > 0.9 else 2,  # Score élevé → niveau critique
                description=f"Anomalie détectée par IA après mise à jour (Conso: {pump.conso_estimee_apres_kwh} kWh)",
                statut="ouvert"
            )
            db.add(new_anomaly)
            message += " ⚠️ ALERTE IA: Une anomalie a été générée automatiquement !"
            
    db.commit()
    return {"status": "success", "message": message, "ia_anomaly_detected": is_anomaly}


# ============================================================
# SECTION : CAMPAGNES MARKETING (Offres promotionnelles)
# L'admin peut créer des offres ciblées par zone/marque
# Les clients ne voient que les offres qui les concernent
# ============================================================

@app.get("/admin/campaigns")
def get_campaigns(db: Session = Depends(get_db)):
    """ Lister toutes les campagnes. Les campagnes expirées sont mises à jour automatiquement. """
    campaigns = db.query(models.Campaign).all()
    now = datetime.utcnow()
    for c in campaigns:
        # Si la campagne est active mais la date de fin est passée → expirée
        if c.statut == "active" and c.date_fin < now:
            c.statut = "expiree"
    db.commit()
    return campaigns

@app.post("/admin/campaigns", response_model=schemas.CampaignResponse)
def create_campaign(campaign: schemas.CampaignCreate, db: Session = Depends(get_db)):
    """ Créer une nouvelle campagne marketing """
    db_campaign = models.Campaign(**campaign.model_dump())
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@app.put("/admin/campaigns/{campaign_id}", response_model=schemas.CampaignResponse)
def update_campaign(campaign_id: str, campaign: schemas.CampaignUpdate, db: Session = Depends(get_db)):
    """ Mettre à jour le statut d'une campagne (activer, désactiver) """
    db_campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Campagne introuvable")
    
    if campaign.statut:
        db_campaign.statut = campaign.statut
    
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@app.delete("/admin/campaigns/{campaign_id}")
def delete_campaign(campaign_id: str, db: Session = Depends(get_db)):
    """ Supprimer une campagne """
    db_campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Campagne introuvable")
    db.delete(db_campaign)
    db.commit()
    return {"status": "success"}

@app.get("/client/{user_id}/campaigns")
def get_client_campaigns(user_id: str, db: Session = Depends(get_db)):
    """
    Récupérer les campagnes ciblées pour un client spécifique.
    Le ciblage se fait par zone climatique et/ou marque de pompe.
    Seules les campagnes actives et dans la bonne période sont retournées.
    """
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "client").first()
    if not user:
        raise HTTPException(status_code=404, detail="Client introuvable")
    
    # Récupérer les critères de ciblage du client
    pump = user.pumps[0] if user.pumps else None
    zone = pump.zone_climatique if pump else None
    marque = pump.modele_pac if pump else None
    
    now = datetime.utcnow()

    # Récupérer toutes les campagnes actives en cours
    active_campaigns = db.query(models.Campaign).filter(
        models.Campaign.statut == "active",
        models.Campaign.date_debut <= now,
        models.Campaign.date_fin >= now
    ).all()
    
    # Filtrer les campagnes qui correspondent au profil du client
    targeted_campaigns = []
    for c in active_campaigns:
        match_zone = (c.ciblage_zone == "Toutes" or c.ciblage_zone == zone)
        match_marque = (c.ciblage_marque == "Toutes" or c.ciblage_marque == marque)
        if match_zone and match_marque:
            targeted_campaigns.append(c)
            
    return targeted_campaigns


# ============================================================
# SECTION : FACTURES PDF DU CLIENT (Invoices)
# Le client peut consulter et télécharger ses factures PDF
# ============================================================

@app.get("/client/{user_id}/invoices")
def get_client_invoices(user_id: str, db: Session = Depends(get_db)):
    """ Lister toutes les factures PDF générées pour un client """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Client introuvable")
    
    # Récupérer les factures triées par date (les plus récentes en premier)
    invoices = db.query(models.Invoice).filter(
        models.Invoice.user_id == user_id
    ).order_by(models.Invoice.date_emission.desc()).all()
    
    results = []
    for inv in invoices:
        results.append({
            "id": inv.id,
            "user_id": inv.user_id,
            "facture_id": inv.facture_id,
            "service_label": inv.service_label,
            "montant_ht": inv.montant_ht,
            "tva": inv.tva,
            "montant_ttc": inv.montant_ttc,
            "date_emission": inv.date_emission,
            "sent_by_email": inv.sent_by_email,
            "numero_facture": inv.numero_facture,
            "client_username": user.username,
            "download_url": f"/invoices/{inv.id}/download"  # Lien de téléchargement
        })
    return results

@app.get("/invoices/{invoice_id}/download")
def download_invoice(invoice_id: str, db: Session = Depends(get_db)):
    """ Télécharger le fichier PDF d'une facture """
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    
    # Vérifier que le fichier PDF existe bien sur le serveur
    if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
        raise HTTPException(status_code=404, detail="Fichier PDF introuvable")
    
    # Retourner le fichier PDF au client pour téléchargement
    return FileResponse(
        path=invoice.pdf_path,
        filename=f"facture_{invoice.numero_facture}.pdf",
        media_type="application/pdf"
    )
