import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "enerqr_v3.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print(">> Demarrage de la migration...")

    columns_users = [row[1] for row in cursor.execute("PRAGMA table_info(users)")]
    
    if "is_available" not in columns_users:
        cursor.execute("ALTER TABLE users ADD COLUMN is_available INTEGER DEFAULT 1")
        print("[OK] Colonne 'is_available' ajoutee a 'users'")
    else:
        print("[--] 'is_available' deja presente")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS anomalies (
            id TEXT PRIMARY KEY,
            pump_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            technicien_id TEXT,
            niveau INTEGER DEFAULT 1,
            description TEXT,
            statut TEXT DEFAULT 'ouvert',
            date_detection DATETIME DEFAULT CURRENT_TIMESTAMP,
            date_resolution DATETIME,
            FOREIGN KEY (pump_id) REFERENCES pumps(id),
            FOREIGN KEY (client_id) REFERENCES users(id),
            FOREIGN KEY (technicien_id) REFERENCES users(id)
        )
    """)
    print("[OK] Table 'anomalies' verifiee/creee")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS garanties (
            id TEXT PRIMARY KEY,
            pump_id TEXT UNIQUE NOT NULL,
            date_debut DATETIME DEFAULT CURRENT_TIMESTAMP,
            date_fin DATETIME NOT NULL,
            FOREIGN KEY (pump_id) REFERENCES pumps(id)
        )
    """)
    print("[OK] Table 'garanties' verifiee/creee")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS factures (
            id TEXT PRIMARY KEY,
            anomaly_id TEXT UNIQUE NOT NULL,
            client_id TEXT NOT NULL,
            montant REAL DEFAULT 0.0,
            statut TEXT DEFAULT 'en_attente',
            date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (anomaly_id) REFERENCES anomalies(id),
            FOREIGN KEY (client_id) REFERENCES users(id)
        )
    """)
    print("[OK] Table 'factures' verifiee/creee")

    conn.commit()
    conn.close()
    print(">>> Migration terminee avec succes! Relancez le backend.")

if __name__ == "__main__":
    migrate()
