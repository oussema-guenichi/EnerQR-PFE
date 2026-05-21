# ============================================================
# FICHIER : database.py
# RÔLE : Configuration de la connexion à la base de données
# Ce fichier crée le "moteur" qui permet à l'application
# de lire et écrire dans la base de données SQLite.
# ============================================================

# Importation des outils SQLAlchemy pour gérer la base de données
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# --- Chemin de la base de données ---
# On utilise SQLite (base de données stockée dans un simple fichier)
# Le fichier "enerqr_v5.db" sera créé automatiquement dans le dossier backend
SQLALCHEMY_DATABASE_URL = "sqlite:///./enerqr_v5.db"

# --- Création du moteur de connexion ---
# Le moteur (engine) est le pont entre Python et la base de données
# "check_same_thread=False" est obligatoire pour que SQLite fonctionne
# avec FastAPI (qui gère plusieurs requêtes en même temps)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# --- Fabrique de sessions ---
# Une "session" est une connexion temporaire à la base de données
# À chaque requête HTTP, on ouvre une session, on l'utilise, puis on la ferme
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Classe de base pour les modèles ---
# Tous les modèles (tables) du fichier models.py héritent de cette classe
# C'est grâce à elle que SQLAlchemy sait comment créer les tables
class Base(DeclarativeBase):
    pass

# --- Fonction pour obtenir une session de base de données ---
# Cette fonction est appelée automatiquement par FastAPI à chaque requête
# Elle ouvre une connexion, la donne à la route, puis la ferme proprement
# Le mot-clé "yield" permet de s'assurer que la connexion est toujours fermée
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
