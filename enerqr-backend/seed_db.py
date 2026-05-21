from database import SessionLocal, engine, Base
import models
import datetime

# Pre-create tables
Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()
    
    if db.query(models.User).count() > 0:
        print("Database already contains users. Skipping seed.")
        db.close()
        return

    print("Seeding database with mock Users and Pumps...")
    
    # 1. Create a Technician Admin
    tech = models.User(
        id="tech-admin",
        username="admin",
        email="admin@enerqr.com",
        hashed_password="admin", # In real app, we'd hash this
        role="technicien",
        numero_serie="TECH-9999"
    )
    db.add(tech)

    # 2. Create Clients
    c1 = models.User(id="usr-8f7a", username="client1", email="c1@mail.com", hashed_password="pw", role="client", consentement_rgpd=True)
    c2 = models.User(id="usr-2c1b", username="client2", email="c2@mail.com", hashed_password="pw", role="client", consentement_rgpd=True)
    c3 = models.User(id="usr-9d4e", username="client3", email="c3@mail.com", hashed_password="pw", role="client", consentement_rgpd=False)
    c4 = models.User(id="usr-new1", username="client_new", email="cnew@mail.com", hashed_password="pw", role="client", consentement_rgpd=False)
    
    db.add_all([c1, c2, c3, c4])
    db.commit() # commit users to get IDs

    # 3. Create Pumps and assign to clients
    pumps = [
        models.Pump(
            id="pump-1", owner_id=c1.id,
            type_pac="Air-Eau", modele_pac="Daikin Altherma 3", zone_climatique="H1",
            conso_avant_kwh=12000.0, conso_estimee_apres_kwh=4500.0,
            date_activation=datetime.datetime.utcnow()
        ),
        models.Pump(
            id="pump-2", owner_id=c2.id,
            type_pac="Air-Air", modele_pac="Atlantic Alfea", zone_climatique="H2",
            conso_avant_kwh=10000.0, conso_estimee_apres_kwh=9000.0, # Ratio 0.9 = Guaranteed Anomaly
            date_activation=datetime.datetime.utcnow()
        ),
        models.Pump(
            id="pump-3", owner_id=c3.id,
            type_pac="Eau-Eau", modele_pac="Mitsubishi Zubadan", zone_climatique="H1",
            conso_avant_kwh=18000.0, conso_estimee_apres_kwh=6000.0
        ),
    ]

    db.add_all(pumps)
    db.commit()
    print("Seeding complete! Admin: admin/admin. Test Clients: client1/pw, client2/pw.")
    db.close()

if __name__ == "__main__":
    seed_database()
