# Refonte de l'Interface Utilisateur Mobile (Flutter)

Ce plan détaille les modifications visuelles à apporter aux fichiers `login.dart` et `unified_dashboard.dart` pour respecter strictement les nouvelles maquettes, sans altérer la logique métier, les états de l'application ou les requêtes API natives de l'application Flutter.

## ⚠️ User Review Required

Veuillez confirmer que ces changements correspondent bien à la maquette. La structure de la logique restera intacte. Les polices Google Fonts (Outfit et Inter) seront utilisées de manière extensive. Si cela vous convient, donnez le feu vert.

## Proposed Changes

### [MODIFIÉ] `login.dart` (Écran 1 — Page de connexion)
*   **Fond** : Remplacement des conteneurs "blob" et des dégradés par un fond noir profond unifié (`#0F172A`).
*   **Logo** : Remplacement du design actuel par un conteneur circulaire de 72x72px, bordure verte semi-transparente, et icône QR 32px centrée.
*   **Textes (Titre & Sous-titre)** :
    *   Titre "EnerQR" avec coloration partielle avec `RichText` ("Ener" en blanc, "QR" en `#26C485`), GoogleFonts Outfit 24px.
    *   Sous-titre "Portail énergie intelligent".
*   **Champs de Saisie** : 
    *   Refactorisation de `_buildTextField` pour inclure un padding, des coins de 12px, et une petite bordure de 0.5px.
    *   Ajout d'une surcouche pour lier le "label" (10px) au-dessus du vrai champ de saisie (13px), tout en gardant l'icône à gauche de 18px.
*   **Sélecteur de Rôle** : Adaptation pour correspondre au nouveau style plus brut sans ombres excessives.
*   **Bouton Principal** : Suppression du dégradé et de l'ombre de grande taille. Utilisation d'un bouton plat vert (`#26C485`) avec `borderRadius` 12px.
*   **Lien "Déjà inscrit / Créer un compte"** : Refonte typographique en texte gris, le mot-clé cliquable en vert (`#26C485`).

### [MODIFIÉ] `unified_dashboard.dart` (Écrans 2 à 5 — Dashboards & Menus)

#### 1. Composants Communs
*   **AppBar** : 
    *   Suppression de l'élévation, ajout de la bordure inférieure grise 0.5px.
    *   Remplacement du titre actuel par un indicateur vertical vert à gauche de la marque (6px x 28px) suivi de "EnerQR" et du nom du portail.
    *   Remplacement des top badges par les deux "pills" colorées spécifiées (verte pour techniciens, rouge pour anomalies) avec padding radius 99px.
*   **Drawer (Menu Latéral)** :
    *   **En-tête** : Refonte totale avec un avatar 54x54px incluant un indicateur en ligne (point vert avec bordure) positionné en bas à droite, le nom, le rôle, et la version en dessous.
    *   **Éléments** : Modification de la surbrillance active : bordure gauche de 3px (`#26C485`) et fond légèrement vert au lieu du changement de couleur d'icône simple.
    *   **Bouton de déconnexion** : Stylisation spéciale en rouge avec bordure, en marges contenues.
*   **Headers de section** : Création d'une fonction `_buildSectionHeader` insérant la barre verticale verte de 3x16px avant le titre.

#### 2. Dashboard Client
*   **Hero Card** (Anciennement "Économies/an") : Création d'une carte massive (fond `#0F172A`) affichant l'économie totale cumulée, avec le badge, le texte et 3 sous-chips dynamiques remplaçant le visuel précédent simplifié.
*   **Cartes Statistiques (kWh & IA)** : Remplacement de l'organisation basique par des cartes blanches avec une icône dans un carré stylisé (32x32px) à gauche, et le "tag" tendanciel à droite.
*   **Carte Campagne (Offre)** : Formatage strict avec l'icône dans un bloc 44x44, titre et l'ajout du tag italique "Offre EnerQR" + bouton "Voir l'offre".
*   **Carte Technicien Responsable** : Adaptation du style de l'avatar et stylisation "badge" pour son statut.
*   **Carte Mes Factures** : Alignement de l'icône, du texte, de la date, et remplacement du conteneur de téléchargement par un carré plein de 32x32.
*   **Assistant IA** : Ajout du petit header de contact (Avatar + "● En ligne") avec séparateur, modification du style de bulle, et input text plus subtil avec l'icône d'envoi.

#### 3. Dashboard Technicien
*   **Onglets (Tab Bar)** : Changement du style "bouton switch" pour un style "onglet" classique : ligne sous le texte vert actif (`bottom 2.5px`).
*   **Cartes des Niveaux (Statistiques Faible/Moyen/Critique)** : Suppression des bordures gauches massives, ajout des ronds de 6px colorés avant le statut avec format de carte blanc basique.
*   **Liste Anomalies** : Refonte de la présentation en tableau, ajoutant les badges spécifiques demandés, la bordure grise, le statut de la pompe, et le bouton flèche rouge foncé/vert.

#### 4. Dashboard Admin
*   **Cartes KPI** : Format avec l'icône dans un carré de 34px coloré selon son bloc (Violet, Orange, Vert, Rouge) + positionnement d'une tag à droite.
*   **Graphique de Conso** : Amélioration du widget fictif avec une représentation via `Row` comprenant plusieurs conteneurs pour simuler des barres ("barres verticales hauteur 72px").

## Open Questions

Aucune question technique. Tout est axé sur la structuration UI côté Flutter, les widgets seront directement écrits dans les balises `Container` et `Row`/`Column`. Les données viendront habiller le nouveau template sans modifier les Map/List de récupération métier. La gestion des imports restera locale avec les paquets déjà définis (ex: `google_fonts`).

## Verification Plan

### Manual Verification
1.  **Exécution UI** : Rechargement (Hot Reload / Hot Restart) du module Flutter en mode émulateur/mobile.
2.  **Parcours visuel Role par Role** : Connection Admin, Client, puis Technicien, pour inspecter chaque dashboard.
3.  **Vérification Drawer / AppBar** : Constater la présence du liseré, de la bulle d'avatar et des nouveaux labels.
